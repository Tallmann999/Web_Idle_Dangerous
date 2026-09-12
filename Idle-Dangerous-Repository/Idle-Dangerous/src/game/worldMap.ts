// Original transparent canvases, positioned against the supplied 1280 × 720 world.
export const REGION_MAP_ART = [
  { x: 37, y: 247, width: 512, height: 512, detailViewBox: "20 36 473 423" },
  { x: 438, y: 180, width: 512, height: 512, detailViewBox: "-12 -8 526 447" },
  { x: 105, y: 75, width: 512, height: 512, detailViewBox: "28 -8 431 303" },
  { x: 271, y: -8, width: 750, height: 400, detailViewBox: "21 1 687 248" },
  { x: 681, y: 72, width: 512, height: 512, detailViewBox: "1 15 498 324" },
  { x: 568, y: 350, width: 750, height: 400, detailViewBox: "10 21 563 327" },
] as const;

export function getMapRegionState(
  region: { startZone: number; endZone: number }, highestZone: number, currentZone: number,
): "locked" | "current" | "completed" | "unlocked" {
  if (highestZone < region.startZone) return "locked";
  if (highestZone > 105) return "completed";
  if (currentZone >= region.startZone && currentZone <= region.endZone) return "current";
  return highestZone > region.endZone ? "completed" : "unlocked";
}

export const MAP_STATE_COLORS = {
  locked: "#d85b62", current: "#ffda68", completed: "#7bd99a", unlocked: "#ffda68",
} as const;
