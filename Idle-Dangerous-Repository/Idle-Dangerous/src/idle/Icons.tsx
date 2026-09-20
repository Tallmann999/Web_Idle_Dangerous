import type { GearId, MaterialId } from './engine';
import { assetUrl, itemPath } from './art';

export function DiamondIcon() {
  return <svg className="diamond-icon" viewBox="0 0 24 24" aria-hidden="true">
    <path d="M6 3h12l5 7-11 12L1 10Z" fill="#65ccea" stroke="#c5f4ff" strokeWidth="1.2" strokeLinejoin="round"/>
    <path d="m6 3 2 7h8l2-7M1 10h22M8 10l4 12 4-12" fill="none" stroke="#258ab8" strokeWidth="1.1"/>
    <path d="m6 3 2 7 4-7Zm6 0 4 7 2-7Z" fill="#d8f9ff"/>
  </svg>;
}

export function GearIcon({ id }: { id: GearId | 'click' }) {
  return <img className="item-icon" src={assetUrl(id === 'click' ? 'art/abilities/strength.webp' : itemPath(id))}
    alt="" aria-hidden="true" draggable={false} />;
}

export function MaterialIcon({ id }: { id: MaterialId }) {
  return <img className="item-icon" src={assetUrl(itemPath(id))} alt="" aria-hidden="true" draggable={false} />;
}
