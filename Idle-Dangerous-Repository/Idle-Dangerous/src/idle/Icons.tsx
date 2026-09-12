import type { GearId, MaterialId } from './engine';
import { assetUrl, itemPath } from './art';

export function GearIcon({ id }: { id: GearId | 'click' }) {
  return <img className="item-icon" src={assetUrl(id === 'click' ? 'art/abilities/strength.webp' : itemPath(id))}
    alt="" aria-hidden="true" draggable={false} />;
}

export function MaterialIcon({ id }: { id: MaterialId }) {
  return <img className="item-icon" src={assetUrl(itemPath(id))} alt="" aria-hidden="true" draggable={false} />;
}
