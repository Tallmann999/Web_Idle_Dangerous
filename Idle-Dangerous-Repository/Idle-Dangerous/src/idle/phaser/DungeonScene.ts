import Phaser from 'phaser';
import * as E from '../engine';
import { assetUrl, backgroundKey, enemyKey, regionArt } from '../art';

export interface DungeonBridge {
  state(): E.State;
  blocked(): boolean;
  changed(): void;
  outcome(out: E.Outcome): void;
  attacked(): void;
  loading(progress: number, error?: string): void;
}

/** Phaser owns the combat clock, hits, audio, textures and all arena rendering.
 * The HTML HUD sends commands and observes the existing serializable game state.
 */
export class DungeonScene extends Phaser.Scene {
  private background!: Phaser.GameObjects.Image;
  private monster!: Phaser.GameObjects.Sprite;
  private shadow!: Phaser.GameObjects.Ellipse;
  private shade!: Phaser.GameObjects.Rectangle;
  private impactLight!: Phaser.GameObjects.Image;
  private target!: Phaser.GameObjects.Zone;
  private effects: Phaser.GameObjects.Container[] = [];
  private region = 0;
  private texture = '';
  private loadingRegion = false;
  private loadFailed = false;
  private elapsed = 0;
  private lastKill = -Infinity;
  private wasPaused = false;
  private reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  private impactSound?: Phaser.Sound.BaseSound;
  private loadedRegions: number[] = [];
  private swing = 0;

  constructor(private bridge: DungeonBridge) { super('Dungeon'); }

  preload() {
    this.bridge.loading(0);
    this.load.on('progress', (progress: number) => this.bridge.loading(Math.min(progress, .99)));
    this.load.on('loaderror', (file: Phaser.Loader.File) => {
      // Audio is optional; missing visual content must visibly stop the fight.
      if (file.key === 'impact-sound') return;
      this.loadFailed = true;
      this.bridge.loading(0, `Не удалось загрузить ${file.key}. Проверьте соединение и повторите.`);
    });
    this.load.atlas('items', assetUrl('art/items/items.webp'), assetUrl('art/items/items.json'));
    this.load.image('coin', assetUrl('art/effects/coin.webp'));
    this.load.audio('impact-sound', assetUrl('audio/gray-impact-1.mp3'));
    this.region = E.layer(this.bridge.state().room).region;
    this.queueRegion(this.region);
  }

  private queueRegion(region: number) {
    for (const path of regionArt(region)) {
      if (!this.textures.exists(path)) this.load.image(path, assetUrl(path));
    }
  }

  create() {
    this.game.canvas.dataset.engine = `Phaser ${Phaser.VERSION}`;
    this.game.canvas.dataset.renderer = this.game.renderer.type === Phaser.CANVAS ? 'Canvas' : 'WebGL';
    this.game.canvas.setAttribute('aria-label', 'Боевая сцена Idle Dangerous');
    this.background = this.add.image(0, 0, '__WHITE').setOrigin(.5);
    this.shade = this.add.rectangle(0, 0, 1, 1, 0x071414, .32).setOrigin(0);
    this.createHitTextures();
    this.impactLight = this.add.image(0, 0, 'blade-glow').setAlpha(0).setBlendMode(Phaser.BlendModes.ADD);
    this.shadow = this.add.ellipse(0, 0, 100, 25, 0x010606, .55);
    this.monster = this.add.sprite(0, 0, '__WHITE').setOrigin(.5, 1).setVisible(false);
    this.target = this.add.zone(0, 0, 1, 1).setOrigin(0).setInteractive({ useHandCursor: true });
    this.target.on('pointerdown', (pointer: Phaser.Input.Pointer) => {
      // HTML menus overlap the scene. Never treat their events as canvas hits.
      if (pointer.event.target === this.game.canvas) this.attack(pointer.x, pointer.y);
    });
    if (this.cache.audio.exists('impact-sound')) this.impactSound = this.sound.add('impact-sound', { volume: .22 });
    this.scale.on('resize', this.layout, this);
    this.events.once('shutdown', () => {
      this.scale.off('resize', this.layout, this);
      this.impactSound?.destroy();
      this.effects = [];
    });
    this.loadedRegions.push(this.region);
    if (!this.loadFailed) {
      this.syncArt();
      this.bridge.loading(1);
    }
    this.layout();
  }

  private switchRegion(region: number) {
    this.loadingRegion = true;
    this.elapsed = 0;
    this.monster.setVisible(false);
    this.bridge.loading(0);
    this.queueRegion(region);
    this.load.once('complete', () => {
      this.loadingRegion = false;
      if (this.loadFailed) return;
      this.region = region;
      this.texture = '';
      this.syncArt();
      this.loadedRegions = this.loadedRegions.filter(r => r !== region);
      this.loadedRegions.push(region);
      // Keep at most two regions in GPU memory, including all their enemy variants.
      while (this.loadedRegions.length > 2) {
        const old = this.loadedRegions.shift()!;
        const keep = new Set(this.loadedRegions.flatMap(regionArt));
        for (const key of regionArt(old)) if (!keep.has(key)) this.textures.remove(key);
      }
      this.bridge.loading(1);
    });
    this.load.start();
  }

  private syncArt() {
    const s = this.bridge.state();
    const key = enemyKey(s);
    if (!this.textures.exists(key)) return;
    this.background.setTexture(backgroundKey(E.layer(s.room).region));
    if (key !== this.texture) {
      this.texture = key;
      this.tweens.killTweensOf(this.monster);
      this.monster.setTexture(key).setVisible(true).setAlpha(1).clearTint();
      this.game.canvas.dataset.enemy = key;
      this.game.canvas.dataset.region = String(this.region);
      this.layout();
      if (!this.reducedMotion) {
        this.tweens.add({ targets: this.monster, alpha: { from: .25, to: 1 }, duration: 160 });
      }
    }
  }

  private layout() {
    if (!this.monster) return;
    const { width, height } = this.scale;
    this.background.setPosition(width / 2, height / 2);
    this.background.setScale(Math.max(width / this.background.width, height / this.background.height));
    this.shade.setSize(width, height);
    const bottom = height - Math.max(40, height * .1);
    const size = Math.min((width - (width < 370 ? 132 : 152)) / this.monster.width,
      (bottom - 96) / this.monster.height);
    this.monster.setPosition(width / 2, bottom).setScale(Math.max(.1, size));
    this.shadow.setPosition(width / 2, bottom - 6).setSize(this.monster.displayWidth * .8, Math.max(14, height * .045));
    const side = width < 370 ? 64 : 74;
    this.target.setPosition(side, 90).setSize(width - side * 2, Math.max(40, height - 120));
    const hitArea = this.target.input?.hitArea as Phaser.Geom.Rectangle | undefined;
    hitArea?.setTo(0, 0, this.target.width, this.target.height);
  }

  update(_time: number, delta: number) {
    if (!this.monster || this.loadFailed || this.loadingRegion) return;
    const nextRegion = E.layer(this.bridge.state().room).region;
    if (nextRegion !== this.region) { this.switchRegion(nextRegion); return; }
    const paused = this.bridge.blocked() || document.hidden;
    if (!this.bridge.state().sound) this.impactSound?.stop();
    if (paused !== this.wasPaused) {
      this.wasPaused = paused;
      if (paused) { this.tweens.pauseAll(); this.impactSound?.stop(); }
      else this.tweens.resumeAll();
    }
    if (performance.now() - this.lastKill >= 450) this.syncArt();
    if (paused || performance.now() - this.lastKill < 450) { this.elapsed = 0; return; }
    this.elapsed += Math.min(delta, 250);
    if (this.elapsed >= 200) {
      // Preserve the original 5 Hz simulation; never simulate time spent away.
      this.elapsed %= 200;
      this.resolve(E.tick(this.bridge.state(), .2));
      this.bridge.changed();
    }
  }

  attack(x?: number, y?: number) {
    const s = this.bridge.state();
    if (!this.monster || this.bridge.blocked() || document.hidden || this.loadingRegion || this.loadFailed ||
        s.offerRoom !== null || performance.now() - this.lastKill < 450) return;
    this.bridge.attacked();
    const amount = E.clickDamage(s);
    this.hitEffect(x ?? this.scale.width / 2, y ?? this.scale.height * .55, amount);
    if (s.sound && this.impactSound) {
      this.impactSound.stop();
      this.impactSound.play();
    }
    if (!this.reducedMotion) {
      this.monster.setTint(0xffdba6);
      this.time.delayedCall(85, () => this.monster.clearTint());
    }
    this.resolve(E.damage(s, amount));
    this.bridge.changed();
  }

  private resolve(out: E.Outcome) {
    if (out.killed) {
      this.lastKill = performance.now();
      this.lootEffect(out);
      if (!this.reducedMotion) this.tweens.add({ targets: this.monster, alpha: .15, duration: 280 });
    }
    this.bridge.outcome(out);
  }

  private effect(x: number, y: number) {
    if (this.effects.length >= 6) this.removeEffect(this.effects[0]);
    const effect = this.add.container(x, y).setDepth(10);
    this.effects.push(effect);
    return effect;
  }

  private removeEffect(effect: Phaser.GameObjects.Container) {
    this.tweens.killTweensOf(effect);
    this.tweens.killTweensOf(effect.getAll());
    effect.destroy();
    this.effects = this.effects.filter(e => e !== effect);
  }

  private hitEffect(x: number, y: number, amount: number) {
    const effect = this.effect(x, y);
    if (!this.reducedMotion) {
      // Alternate two diagonal cuts. The trail is light, never a wound or blood.
      const angle = (++this.swing % 2 ? -18 : 96) + Phaser.Math.Between(-9, 9);
      const width = Math.min(210, this.scale.width * .51);
      const slash = this.add.image(0, 0, 'blade-slash').setAngle(angle).setDisplaySize(width, width / 2);
      const startScale = slash.scaleX;
      effect.add(slash);
      this.tweens.add({ targets: slash, scaleX: startScale * 1.16, scaleY: startScale * 1.16,
        alpha: 0, angle: angle + 12, duration: 290, ease: 'Cubic.Out' });
      const flare = this.add.image(0, 0, 'blade-glow').setDisplaySize(80, 80).setAlpha(.7).setBlendMode(Phaser.BlendModes.ADD);
      effect.add(flare);
      this.tweens.add({ targets: flare, alpha: 0, duration: 190 });
      for (let i = 0; i < 7; i++) {
        const direction = Math.PI * 2 * i / 7 + Phaser.Math.FloatBetween(-.2, .2);
        const distance = Phaser.Math.Between(28, 66);
        const spark = this.add.rectangle(Math.cos(direction) * 7, Math.sin(direction) * 7,
          Phaser.Math.Between(5, 10), 2, i % 2 ? 0xffd57d : 0xe8f7ff).setRotation(direction);
        effect.add(spark);
        this.tweens.add({ targets: spark, x: Math.cos(direction) * distance,
          y: Math.sin(direction) * distance + 9, alpha: 0, scaleX: .2, duration: 240 + i * 15, ease: 'Cubic.Out' });
      }
      // A soft local flash sits BEHIND the enemy, lighting the scenery only.
      // Reuse one light so rapid tapping cannot stack full-screen flashes.
      this.tweens.killTweensOf(this.impactLight);
      this.impactLight.setPosition(x, y).setDisplaySize(this.scale.width * 1.65, this.scale.height * 1.2).setAlpha(.24);
      this.tweens.add({ targets: this.impactLight, alpha: 0, duration: 280, ease: 'Cubic.Out' });
      this.tweens.killTweensOf(this.shade);
      this.shade.setAlpha(.55);
      this.tweens.add({ targets: this.shade, alpha: 1, duration: 220, ease: 'Sine.Out' });
    }
    const number = new Intl.NumberFormat('ru', { notation: amount >= 10000 ? 'compact' : 'standard', maximumFractionDigits: 1 }).format(amount);
    const label = this.add.text(0, -24, `−${number}`, { fontFamily: 'Roboto, Arial', fontSize: '24px',
      fontStyle: 'bold', color: '#ffe5aa', stroke: '#15201c', strokeThickness: 4 }).setOrigin(.5);
    effect.add(label);
    this.tweens.add({ targets: label, y: this.reducedMotion ? -24 : -65, duration: 550, ease: 'Cubic.Out' });
    this.tweens.add({ targets: effect, alpha: 0, duration: 550,
      onComplete: () => this.removeEffect(effect) });
  }

  /** Two small reusable procedural textures, compatible with WebGL and Canvas. */
  private createHitTextures() {
    if (!this.textures.exists('blade-glow')) {
      const texture = this.textures.createCanvas('blade-glow', 128, 128)!;
      const ctx = texture.getContext();
      const light = ctx.createRadialGradient(64, 64, 0, 64, 64, 64);
      light.addColorStop(0, 'rgba(255,240,200,1)');
      light.addColorStop(.28, 'rgba(255,212,135,.55)');
      light.addColorStop(1, 'rgba(255,194,105,0)');
      ctx.fillStyle = light;
      ctx.fillRect(0, 0, 128, 128);
      texture.refresh();
    }
    if (!this.textures.exists('blade-slash')) {
      const texture = this.textures.createCanvas('blade-slash', 256, 128)!;
      const ctx = texture.getContext();
      for (const [width, color] of [[18, 'rgba(143,214,255,.08)'], [10, 'rgba(162,226,255,.22)'], [4, 'rgba(230,248,255,.85)']] as const) {
        ctx.beginPath();
        ctx.moveTo(16, 108);
        ctx.quadraticCurveTo(111, 6, 242, 20);
        ctx.lineWidth = width;
        ctx.strokeStyle = color;
        ctx.stroke();
      }
      ctx.beginPath();
      ctx.moveTo(16, 108);
      ctx.quadraticCurveTo(108, -1, 242, 20);
      ctx.quadraticCurveTo(129, 24, 16, 108);
      const blade = ctx.createLinearGradient(16, 108, 242, 20);
      blade.addColorStop(0, 'rgba(179,223,255,0)');
      blade.addColorStop(.35, 'rgba(226,245,255,.85)');
      blade.addColorStop(.7, '#ffffff');
      blade.addColorStop(1, 'rgba(255,236,183,0)');
      ctx.fillStyle = blade;
      ctx.fill();
      texture.refresh();
    }
  }

  private lootEffect(out: E.Outcome) {
    const effect = this.effect(this.scale.width / 2, this.scale.height * .58);
    effect.add(this.add.image(out.drop ? -27 : 0, 0, 'coin').setDisplaySize(26, 26));
    if (out.drop) effect.add(this.add.image(20, 0, 'items', out.drop).setDisplaySize(44, 44));
    this.tweens.add({ targets: effect, y: effect.y - (this.reducedMotion ? 0 : 55), alpha: 0, duration: 850,
      onComplete: () => this.removeEffect(effect) });
  }
}
