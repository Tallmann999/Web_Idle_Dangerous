// Fresh visual references + exact procedural texture export for an explicit handoff.
const fs=require('node:fs'),path=require('node:path'),http=require('node:http'),assert=require('node:assert/strict');
const {chromium}=require(process.env.PLAYWRIGHT_MODULE||'playwright');
const ts=require('typescript');
const out=path.resolve(process.argv[2]),pictures=path.join(out,'04_REFERENCES/current'),generated=path.join(out,'03_ASSETS/Generated');
fs.mkdirSync(pictures,{recursive:true});fs.mkdirSync(generated,{recursive:true});
const json=(file,value)=>fs.writeFileSync(path.join(out,file),JSON.stringify(value,null,2)+'\n');
(async()=>{
 const E=await import('../src/idle/engine.ts');
 const root=path.resolve('dist'),errors=[],captures=[],layouts=[];
 const server=http.createServer((req,res)=>{const url=new URL(req.url,'http://localhost');const file=path.resolve(root,'.'+decodeURIComponent(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(root+path.sep)){res.writeHead(403);res.end();return;}try{const types={'.html':'text/html','.js':'text/javascript','.css':'text/css','.json':'application/json','.svg':'image/svg+xml','.webp':'image/webp','.woff2':'font/woff2','.mp3':'audio/mpeg'};res.setHeader('Content-Type',types[path.extname(file)]||'application/octet-stream');res.end(fs.readFileSync(file));}catch{res.writeHead(404);res.end();}});
 await new Promise(r=>server.listen(0,'127.0.0.1',r));
 const browser=await chromium.launch({headless:true,...(process.env.PLAYWRIGHT_BROWSER?{executablePath:process.env.PLAYWRIGHT_BROWSER}:{}),args:['--use-gl=angle','--use-angle=swiftshader']});
 const url=`http://127.0.0.1:${server.address().port}`;
 try{
  async function scenario(state,viewport={width:390,height:844},start=true){
   const context=await browser.newContext({viewport});
   await context.addInitScript(({key,state})=>localStorage.setItem(key,JSON.stringify(state)),{key:E.SAVE_KEY,state});
   const p=await context.newPage();p.on('pageerror',e=>errors.push(e.message));
   await p.goto(url);await p.locator('.start-overlay button').waitFor();
   if(start){await p.locator('.start-overlay button').click();if(state.location!=='guild'){await p.locator('canvas[data-enemy]').waitFor();await p.locator('.arena-loading').waitFor({state:'detached'});}}
   return {p,context};
  }
  async function shot(p,file,state){await p.screenshot({path:path.join(pictures,file)});captures.push({file,state,viewport:p.viewportSize(),testProfile:true});}
  const fresh=await scenario(E.fresh(),undefined,false);
  await shot(fresh.p,'01-start.png','Новый игрок, стартовая заставка, бой ещё не идёт');
  await fresh.p.locator('.start-overlay button').click();await fresh.p.locator('canvas[data-enemy]').waitFor();await fresh.p.locator('.arena-loading').waitFor({state:'detached'});
  await fresh.p.evaluate(()=>window.dispatchEvent(new Event('mage:platform-pause')));
  for(const [width,height] of [[320,640],[360,640],[390,844],[412,915],[768,1024],[1440,900]]){
   await fresh.p.setViewportSize({width,height});await fresh.p.waitForTimeout(120);
   layouts.push(await fresh.p.evaluate(()=>{const selectors=['.idle-shell','.brand','.resources','.depth-header','.level-carousel','.level-card.current','.room-progress','.arena','.enemy-caption','.hp-track','.gear-rail.left','.gear-rail.right','.gear-slot','.notice','.advance','.bottom-nav'];return {viewport:{width:innerWidth,height:innerHeight},elements:selectors.map(selector=>{const el=document.querySelector(selector),r=el.getBoundingClientRect(),s=getComputedStyle(el);return {selector,x:r.x,y:r.y,width:r.width,height:r.height,fontSize:s.fontSize,color:s.color,background:s.background,border:s.border,borderRadius:s.borderRadius};})};}));
   assert.equal(await fresh.p.evaluate(()=>document.documentElement.scrollWidth),width);
   await shot(fresh.p,`02-combat-${width}x${height}.png`,'Новый игрок, активный UI; для стабильного кадра симуляция приостановлена тестом');
  }
  await fresh.p.setViewportSize({width:390,height:844});
  await fresh.p.getByRole('button',{name:/Настройки/}).click();await shot(fresh.p,'03-settings.png','Окно настроек; звук включён');
  await fresh.p.getByRole('button',{name:'Как играть',exact:true}).click();await shot(fresh.p,'04-help.png','Справка по текущей игре');
  await fresh.p.getByRole('button',{name:'Закрыть окно',exact:true}).click();
  await fresh.p.getByRole('button',{name:'Наручи, открывается в комнате 20',exact:true}).click();await shot(fresh.p,'05-equipment-locked.png','Закрытый предмет: наручи, порог уровня 20');
  await fresh.context.close();

  const rich=E.fresh();rich.room=58;rich.highest=58;rich.gold=1e15;rich.diamonds=1950;rich.clickLevel=10;rich.reputation=35;
  for(const d of E.EQUIPMENT)rich.gear[d.id].level=15;
  for(const m of E.MATERIALS)rich.inventory[m.id]={count:7,value:190};
  const mid=await scenario(rich);await mid.p.evaluate(()=>window.dispatchEvent(new Event('mage:platform-pause')));
  await shot(mid.p,'06-midgame-upgrades.png','Тест: уровень 58, все вещи 15, достаточно золота; пульсация UI работает, бой приостановлен');
  await mid.p.getByRole('button',{name:'Шлем, уровень 15',exact:true}).click();await shot(mid.p,'07-equipment-upgrade.png','Покупка уровней и отдельного ×2, тестовое золото');
  await mid.p.getByRole('button',{name:'Закрыть прокачку',exact:true}).click();
  await mid.p.getByRole('button',{name:/Инвентарь/}).click();await shot(mid.p,'08-inventory.png','Все шесть компонентов по 7 шт., цена каждого стека 190 алмазов');
  await mid.p.getByRole('button',{name:'Закрыть окно',exact:true}).click();
  await mid.p.locator('.bottom-nav').getByRole('button',{name:/Тренировка/}).click();await shot(mid.p,'09-training.png','Тренировка 10; открывает боевой настрой');
  await mid.p.getByRole('button',{name:'Закрыть окно',exact:true}).click();
  await mid.p.locator('.depth-header button').click();await shot(mid.p,'10-path-upwards.png','Путь снизу вверх, текущий уровень 58; пройденные боссы отмечены');
  await mid.p.getByRole('button',{name:'Закрыть окно',exact:true}).click();
  await mid.p.locator('.bottom-nav').getByRole('button',{name:/Гильдия/}).click();await shot(mid.p,'11-guild.png','Гильдия, тестовые стеки, ранг Искатель, продажа за алмазы');
  await mid.context.close();

  const hitState=E.fresh();hitState.room=58;hitState.highest=58;
  const hit=await scenario(hitState);
  await hit.p.locator('canvas').click({position:{x:195,y:180}});await shot(hit.p,'12-blade-hit.png','Один ручной удар: диагональный светлый клинок, число урона и фоновая подсветка');
  const scene=fs.readFileSync('src/idle/phaser/DungeonScene.ts','utf8');
  const body=scene.split('  private createHitTextures() {')[1].split('\n  private lootEffect')[0];
  const js=ts.transpile(`function makeTextures() {${body}`,{target:ts.ScriptTarget.ES2022});
  fs.writeFileSync(path.join(generated,'procedural-textures.js'),js+'\n');
  const textures=await hit.p.evaluate(source=>{const images={};const fake={textures:{exists:()=>false,createCanvas:(key,w,h)=>{const c=document.createElement('canvas');c.width=w;c.height=h;images[key]=c;return {getContext:()=>c.getContext('2d'),refresh:()=>{}};}}};new Function(source+'; return makeTextures;')().call(fake);return Object.fromEntries(Object.entries(images).map(([k,c])=>[k,c.toDataURL('image/png').split(',')[1]]));},js);
  for(const [key,data] of Object.entries(textures))fs.writeFileSync(path.join(generated,key+'.png'),Buffer.from(data,'base64'));
  const icons=fs.readFileSync('src/idle/Icons.tsx','utf8');
  const diamond='<svg xmlns="http://www.w3.org/2000/svg" '+icons.split('<svg ')[1].split('</svg>')[0].replace('className="diamond-icon" ','').replaceAll('strokeWidth','stroke-width').replaceAll('strokeLinejoin','stroke-linejoin')+'</svg>';
  fs.writeFileSync(path.join(generated,'diamond.svg'),diamond);
  const raster=await hit.p.evaluate(async svg=>{const im=new Image();im.src='data:image/svg+xml;charset=utf-8,'+encodeURIComponent(svg);await im.decode();const c=document.createElement('canvas');c.width=c.height=192;c.getContext('2d').drawImage(im,0,0,192,192);return c.toDataURL('image/png').split(',')[1];},diamond);
  fs.writeFileSync(path.join(generated,'diamond.png'),Buffer.from(raster,'base64'));
  const symbols={settings:'⚙',sound_on:'♪',sound_off:'♩',dungeon:'⚔',inventory:'▣',training:'✧',guild:'⌂',emblem:'◈',path:'↟',upgrade:'↑',check:'✓',close:'×',timer:'◷',boss_node:'♜',victory:'✦',current:'▲',left:'‹',right:'›',locked:'◇'};
  fs.mkdirSync(path.join(generated,'ui-symbols'),{recursive:true});
  const glyphs=await hit.p.evaluate(symbols=>Object.fromEntries(Object.entries(symbols).map(([key,glyph])=>{const c=document.createElement('canvas');c.width=c.height=96;const ctx=c.getContext('2d');ctx.font='64px Roboto, Arial';ctx.fillStyle='#dfc084';ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(glyph,48,48);return [key,c.toDataURL('image/png').split(',')[1]];})),symbols);
  for(const [key,glyph] of Object.entries(symbols)){
   fs.writeFileSync(path.join(generated,'ui-symbols',key+'.png'),Buffer.from(glyphs[key],'base64'));
   fs.writeFileSync(path.join(generated,'ui-symbols',key+'.svg'),`<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 96 96"><text x="48" y="48" fill="#dfc084" font-family="Roboto, Arial" font-size="64" text-anchor="middle" dominant-baseline="central">${glyph}</text></svg>`);
  }
  await hit.context.close();

  for(const region of E.LAYERS){const s=E.fresh();s.room=region.start;s.highest=region.start;const a=await scenario(s);await shot(a.p,`13-region-${region.region}.png`,`Ярус ${region.region}: ${region.name}, первая комната`);await a.context.close();}
  const champion=E.fresh();champion.room=5;champion.highest=5;champion.clickLevel=100;
  const win=await scenario(champion);await shot(win.p,'14-boss.png','Босс 5, таймер новой попытки');
  await win.p.locator('canvas').click({position:{x:195,y:160}});await win.p.locator('.victory-flash').waitFor();await shot(win.p,'15-boss-victory.png','Победа над боссом; тестовый усиленный клик');await win.context.close();
  const weak=E.fresh();weak.room=5;weak.highest=5;
  const fail=await scenario(weak);await fail.p.getByRole('dialog',{name:'Попытка босса завершена'}).waitFor({timeout:40000});await shot(fail.p,'16-boss-timeout.png','Реальное истечение 30 секунд; локально без рекламной кнопки');await fail.context.close();

  const loadingContext=await browser.newContext({viewport:{width:390,height:844}});
  await loadingContext.route('**/art/enemies/region-1-01.webp',route=>route.fulfill({status:503,body:'Intentional reference capture failure'}));
  const loading=await loadingContext.newPage();await loading.goto(url);await loading.locator('.start-overlay button').click();await loading.getByRole('button',{name:'Повторить загрузку',exact:true}).waitFor();await shot(loading,'17-loading-error.png','Намеренно прервана загрузка одной текстуры, показана кнопка повтора');await loadingContext.close();
  assert.deepEqual(errors,[]);
  json('02_UI/layout-measurements.json',layouts);
  json('03_ASSETS/Generated/export-info.json',{method:'Exact active Canvas texture function transpiled and executed; DiamondIcon SVG extracted; UI glyphs rasterized with browser font rendering',generatedTextures:Object.keys(textures),glyphs:symbols,notes:['Glyph SVG requires font; PNG captures this system rendering','Exports are convenience files for another engine, not original authored assets']});
  json('04_REFERENCES/current/capture-report.json',{date:'2026-09-27',source:'fresh production build of current project',captures,pageErrors:errors,personalSaveUsed:false});
  console.log(JSON.stringify({captures:captures.length,viewports:layouts.length,generatedTextures:Object.keys(textures),errors}));
 }finally{await browser.close();server.close();}
})().catch(e=>{console.error(e);process.exitCode=1;});
