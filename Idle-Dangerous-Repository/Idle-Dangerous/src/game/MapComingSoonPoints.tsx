import { useState } from "react";

import { REGION_LAYOUTS, mapPoint } from "./regionLayouts";

export function MapComingSoonPoints({ regionId, assetUrl }: { regionId: number; assetUrl: (path: string) => string }) {
  const [selected, setSelected] = useState<string | null>(null);
  return <>{REGION_LAYOUTS[regionId].future.map((entry, index) => {
    const point = { ...entry, ...mapPoint(regionId, entry.point), name: entry.icon === "gold-mine" ? "Золотая жила" : "Подземелье" };
    const id = `${regionId}-${index}`;
    return <button
    key={id} type="button" className="map-coming-soon-point"
    style={{ left: `${point.x}%`, top: `${point.y}%` }}
    aria-label={`${point.name}: Пока в разработке`}
    aria-describedby={`coming-soon-${id}`}
    onClick={() => setSelected(id)} onBlur={() => setSelected(null)}
    data-selected={selected === id}
  >
    <img src={assetUrl(`art/map-points/${point.icon}.webp`)} alt="" draggable={false} />
    <b>{point.name}</b>
    <span id={`coming-soon-${id}`} role="tooltip">Пока в разработке</span>
  </button>; })}</>;
}
