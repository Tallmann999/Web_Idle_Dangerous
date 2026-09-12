const PAGE_SCROLL_KEYS = new Set([
  " ", "Spacebar", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "PageUp", "PageDown", "Home", "End",
]);
const INTERACTIVE_SELECTOR = "button, input, select, textarea, a[href], [contenteditable='true'], [role='button'], [role='slider']";

export function shouldPreventPageScrollKey(key: string, target: EventTarget | null): boolean {
  if (!PAGE_SCROLL_KEYS.has(key)) return false;
  return !(typeof Element !== "undefined" && target instanceof Element && target.closest(INTERACTIVE_SELECTOR));
}

function scrollableAncestor(target: EventTarget | null, deltaY?: number): Element | null {
  if (!(target instanceof Element)) return null;
  let element: Element | null = target;
  while (element && element !== document.documentElement) {
    const style = window.getComputedStyle(element);
    const scrollable = /(auto|scroll)/.test(style.overflowY) && element.scrollHeight > element.clientHeight;
    if (scrollable) {
      if (deltaY === undefined) return element;
      const canMoveDown = deltaY > 0 && element.scrollTop + element.clientHeight < element.scrollHeight;
      const canMoveUp = deltaY < 0 && element.scrollTop > 0;
      if (canMoveDown || canMoveUp) return element;
    }
    element = element.parentElement;
  }
  return null;
}

export function installGameInputGuard(): () => void {
  const onKeyDown = (event: KeyboardEvent) => {
    if (shouldPreventPageScrollKey(event.key, event.target)) event.preventDefault();
  };
  const onWheel = (event: WheelEvent) => {
    if (!scrollableAncestor(event.target, event.deltaY)) event.preventDefault();
  };
  const onTouchMove = (event: TouchEvent) => {
    if (!scrollableAncestor(event.target)) event.preventDefault();
  };

  window.addEventListener("keydown", onKeyDown, { capture: true });
  window.addEventListener("wheel", onWheel, { capture: true, passive: false });
  window.addEventListener("touchmove", onTouchMove, { capture: true, passive: false });

  return () => {
    window.removeEventListener("keydown", onKeyDown, { capture: true });
    window.removeEventListener("wheel", onWheel, { capture: true });
    window.removeEventListener("touchmove", onTouchMove, { capture: true });
  };
}
