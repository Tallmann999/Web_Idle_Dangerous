import { useEffect, useRef, useState } from 'react';
import { boss, TOTAL_ROOMS } from './engine';

type Props = {
  room: number;
  highest: number;
  defeated: number[];
  disabled: boolean;
  onSelect: (room: number) => void;
};

const levels = Array.from({ length: TOTAL_ROOMS }, (_, i) => i + 1);
const scrollBehavior = (): ScrollBehavior => matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth';

export function LevelCarousel({ room, highest, defeated, disabled, onSelect }: Props) {
  const track = useRef<HTMLDivElement>(null);
  const [edges, setEdges] = useState({ start: true, end: false });
  const updateEdges = () => {
    const el = track.current;
    if (el) setEdges({ start: el.scrollLeft < 2, end: el.scrollLeft + el.clientWidth >= el.scrollWidth - 2 });
  };

  useEffect(() => {
    const el = track.current!;
    const center = () => {
      const card = el.querySelector<HTMLElement>('[aria-current="step"]');
      if (card) el.scrollLeft = card.offsetLeft - (el.clientWidth - card.offsetWidth) / 2;
      updateEdges();
    };
    center();
    const resize = new ResizeObserver(center);
    resize.observe(el);
    return () => resize.disconnect();
  }, [room]);

  useEffect(() => {
    const el = track.current!;
    const wheel = (event: WheelEvent) => {
      if (event.ctrlKey) return;
      event.preventDefault();
      const delta = Math.abs(event.deltaX) > Math.abs(event.deltaY) ? event.deltaX : event.deltaY;
      el.scrollLeft += delta * (event.deltaMode === 1 ? 16 : event.deltaMode === 2 ? el.clientWidth : 1);
    };
    el.addEventListener('wheel', wheel, { passive: false });
    return () => el.removeEventListener('wheel', wheel);
  }, []);

  const scroll = (direction: number) => {
    const el = track.current!;
    el.scrollBy({ left: direction * el.clientWidth * .8, behavior: scrollBehavior() });
  };

  return <nav className="level-carousel" aria-label="Уровни подземелья">
    <button className="level-arrow" aria-label="Прокрутить уровни назад" disabled={edges.start} onClick={() => scroll(-1)}>‹</button>
    <div className="level-track" ref={track} onScroll={updateEdges} data-horizontal-scroll>
      {levels.map(level => {
        const current = room === level, won = defeated.includes(level), locked = level > highest, isBoss = boss(level);
        const status = won ? 'Побеждён' : locked ? 'Закрыт' : current ? 'Вы здесь' : level < highest ? 'Пройден' : 'Открыт';
        return <button key={level} data-level={level}
          className={`level-card ${current ? 'current' : won ? 'defeated' : locked ? 'locked' : level < highest ? 'cleared' : 'available'} ${isBoss ? 'is-boss' : ''}`}
          aria-current={current ? 'step' : undefined}
          title={`${isBoss ? 'Босс' : 'Уровень'} ${level} · ${status}`}
          aria-label={`${isBoss ? 'Босс' : 'Уровень'} ${level} · ${status}`}
          disabled={locked || won || disabled}
          onClick={() => { if (!current) onSelect(level); }}>
          {isBoss && <span aria-hidden="true">Босс</span>}
          <strong>{level}</strong>
          <small aria-hidden="true">{won ? '✓' : locked ? '·' : current ? '▲' : level < highest ? '✓' : '↑'}</small>
        </button>;
      })}
    </div>
    <button className="level-arrow" aria-label="Прокрутить уровни вперёд" disabled={edges.end} onClick={() => scroll(1)}>›</button>
  </nav>;
}
