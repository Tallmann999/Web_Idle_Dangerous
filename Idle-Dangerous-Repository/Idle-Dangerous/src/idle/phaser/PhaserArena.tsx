import { useEffect, useRef, useState, type MutableRefObject } from 'react';
import Phaser from 'phaser';
import { DungeonScene, type DungeonBridge } from './DungeonScene';

export type ArenaHandle = { attack(): void };

export function PhaserArena({ bridge, handle }: { bridge: DungeonBridge; handle: MutableRefObject<ArenaHandle | null> }) {
  const host = useRef<HTMLDivElement>(null);
  const latest = useRef(bridge);
  latest.current = bridge;
  const [progress, setProgress] = useState(0);
  const [error, setError] = useState('');
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    const parent = host.current!;
    let disposed = false;
    setError('');
    setProgress(0);
    const scene = new DungeonScene({
      state: () => latest.current.state(),
      blocked: () => disposed || latest.current.blocked(),
      changed: () => { if (!disposed) latest.current.changed(); },
      outcome: out => { if (!disposed) latest.current.outcome(out); },
      attacked: () => { if (!disposed) latest.current.attacked(); },
      loading: (value, problem) => {
        if (disposed) return;
        setProgress(value);
        if (problem) setError(problem);
        latest.current.loading(value, problem);
      },
    });
    const game = new Phaser.Game({
      type: Phaser.AUTO,
      parent,
      width: Math.max(1, parent.clientWidth),
      height: Math.max(1, parent.clientHeight),
      backgroundColor: '#14221e',
      scene,
      banner: false,
      render: { antialias: true, roundPixels: false, powerPreference: 'low-power' },
      scale: { mode: Phaser.Scale.NONE },
      fps: { target: 60, smoothStep: true },
      // HTML keyboard controls remain accessible; Phaser handles mouse and touch.
      input: { keyboard: false, activePointers: 2, windowEvents: false },
    });
    handle.current = { attack: () => scene.attack() };
    const observer = new ResizeObserver(() => {
      if (!disposed && game.isBooted && parent.clientWidth && parent.clientHeight) {
        game.scale.resize(parent.clientWidth, parent.clientHeight);
      }
    });
    observer.observe(parent);
    return () => {
      disposed = true;
      handle.current = null;
      observer.disconnect();
      // React StrictMode can mount/unmount before Phaser's first frame.
      // Detach the canvas immediately; Phaser releases the scene on its next step.
      game.canvas?.remove();
      game.destroy(true);
    };
  }, [attempt, handle]);

  return <>
    <div className="phaser-arena" ref={host} />
    {(progress < 1 || error) && <div className="arena-loading" role="status">
      {error ? <><span>{error}</span><button onClick={() => setAttempt(n => n + 1)}>Повторить загрузку</button></>
        : <>Загружаем ярус… {Math.round(progress * 100)}%</>}
    </div>}
  </>;
}
