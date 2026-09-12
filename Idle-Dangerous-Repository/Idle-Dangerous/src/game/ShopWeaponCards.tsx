import { type CSSProperties, useEffect, useLayoutEffect, useRef, useState } from "react";
import { SHOP_WEAPON_PREVIEWS, type ShopUpgradePreview, type ShopWeaponPreview } from "./shopCatalog";

type PreviewTooltip = { weapon: ShopWeaponPreview; upgrade: ShopUpgradePreview; anchor: HTMLElement };

export function ShopWeaponCards({ assetUrl }: { assetUrl: (path: string) => string }) {
  const [tooltip, setTooltip] = useState<PreviewTooltip | null>(null);
  const [position, setPosition] = useState({ left: 12, top: 12 });
  const tooltipRef = useRef<HTMLElement>(null);
  useLayoutEffect(() => {
    if (!tooltip || !tooltipRef.current) return;
    const panel = tooltipRef.current;
    const place = () => {
      const anchor = tooltip.anchor.getBoundingClientRect();
      const box = panel.getBoundingClientRect();
      const left = Math.max(12, Math.min(window.innerWidth - box.width - 12, anchor.left + anchor.width / 2 - box.width / 2));
      const preferredTop = anchor.top >= box.height + 20 ? anchor.top - box.height - 10 : anchor.bottom + 10;
      setPosition({ left, top: Math.max(12, Math.min(window.innerHeight - box.height - 12, preferredTop)) });
    };
    place();
    const observer = new ResizeObserver(place);
    observer.observe(panel);
    return () => observer.disconnect();
  }, [tooltip]);
  useEffect(() => {
    const close = () => setTooltip(null);
    const onKey = (event: KeyboardEvent) => { if (event.key === "Escape") close(); };
    const onOutside = (event: PointerEvent) => {
      if (event.target instanceof Element && !event.target.closest(".shop-upgrade-slot, .shop-preview-tooltip")) close();
    };
    window.addEventListener("resize", close);
    document.addEventListener("keydown", onKey);
    document.addEventListener("pointerdown", onOutside);
    return () => {
      window.removeEventListener("resize", close);
      document.removeEventListener("keydown", onKey);
      document.removeEventListener("pointerdown", onOutside);
    };
  }, []);

  return <>
    <div className="shop-weapon-grid" onScroll={() => setTooltip((current) => current ? { ...current } : null)}>
      {SHOP_WEAPON_PREVIEWS.map((weapon) => <article key={weapon.id} className="shop-weapon-card preview" style={{ "--card-color": weapon.color } as CSSProperties}>
        <div className="shop-weapon-art"><img src={assetUrl(weapon.art)} alt={weapon.name} draggable={false} decoding="async" /></div>
        <div className="shop-weapon-copy">
          <strong>{weapon.name}</strong>
          <small>{weapon.description}</small>
        </div>
        <div className="weapon-upgrade-slots shop-upgrade-slots" aria-label={`Улучшения: ${weapon.name}`}>
          {weapon.upgrades.map((upgrade) => {
            const tooltipId = `shop-${weapon.id}-${upgrade.level}`;
            const showing = tooltip?.weapon.id === weapon.id && tooltip.upgrade.level === upgrade.level;
            return <div className={`shop-upgrade-tile ${upgrade.kind}`} key={upgrade.level}>
              <button type="button" className="weapon-upgrade-slot purchased shop-upgrade-slot"
                aria-label={`${upgrade.name}, ${upgrade.level}`}
                aria-describedby={showing ? tooltipId : undefined}
                onPointerEnter={(event) => {
                  if (event.pointerType === "mouse" && window.matchMedia("(hover: hover)").matches) setTooltip({ weapon, upgrade, anchor: event.currentTarget });
                }}
                onPointerLeave={(event) => {
                  if (event.pointerType === "mouse" && !(event.relatedTarget instanceof Element && event.relatedTarget.closest(".shop-preview-tooltip"))) setTooltip(null);
                }}
                onFocus={(event) => setTooltip({ weapon, upgrade, anchor: event.currentTarget })}
                onBlur={() => setTooltip(null)}
                onClick={(event) => setTooltip({ weapon, upgrade, anchor: event.currentTarget })}
              >
                {upgrade.icon ? <img src={assetUrl(upgrade.icon)} alt="" draggable={false} /> : <span className="shop-upgrade-diamond" aria-hidden="true">◆</span>}
                <small>{upgrade.level}</small>
              </button>
            </div>;
          })}
        </div>
        <button type="button" disabled aria-label={`${weapon.name}: скоро`}><span>СКОРО</span></button>
      </article>)}
    </div>
    {tooltip && <aside ref={tooltipRef} className="shop-preview-tooltip" role="tooltip"
      id={`shop-${tooltip.weapon.id}-${tooltip.upgrade.level}`}
      style={{ ...position, "--card-color": tooltip.weapon.color } as CSSProperties}>
      {tooltip.upgrade.icon && <img className="shop-tooltip-ability-icon" src={assetUrl(tooltip.upgrade.icon)} alt="" />}
      <strong className="shop-tooltip-title">{tooltip.upgrade.name}</strong>
      {tooltip.upgrade.kind !== "upgrade" && <span className={`shop-tooltip-kind ${tooltip.upgrade.kind}`}>
        {tooltip.upgrade.kind === "active" ? "АКТИВНОЕ УМЕНИЕ" : "ПАССИВНОЕ УМЕНИЕ"}
      </span>}
      <small className="shop-tooltip-requirement">ТРЕБУЕТСЯ УРОВЕНЬ {tooltip.upgrade.level}</small>
      <p>{tooltip.upgrade.description}</p>
      {tooltip.upgrade.kind === "upgrade" && <b className="shop-tooltip-multiplier">УРОН ОРУЖИЯ ×2</b>}
      <footer><strong>✓ АКТИВНО</strong><small>ПРЕДПРОСМОТР</small></footer>
    </aside>}
  </>;
}
