type Point = readonly [number, number];
type FuturePoint = { icon: "gold-mine" | "dungeon"; point: Point };
type RegionLayout = { viewBox: readonly [number, number, number, number]; image: readonly [number, number, number, number]; route: readonly Point[]; dungeons: readonly Point[]; future: readonly FuturePoint[]; nodeWidth: number };

// Coordinates from the user's 512 × 512 sketches. Geographic art IDs 2/3
// retain their original identity after their campaign order was swapped.
// Five extra stops extend the sketched spiral to 105. Small offsets leave
// clearance for boss frames and nearby future-content icons.
const finalRoute: Point[] = [[252,60],[236,93],[208,127],[176,146],[146,177],[100,214],[108,255],[139,287],[193,296],[223,291],[253,286],[329,277],[364,239],[419,203],[431,174],[443,145],[405,99],[374,90],[343,81],[297,122],[247,149],[196,183],[191,231],[259,244],[320,204],[364,165],[350,130],[292,155],[252,191],[289,190]];

export const REGION_LAYOUTS: Record<number, RegionLayout> = {
  1: { viewBox: [30,25,460,450], image: [0,0,512,512], nodeWidth: 7,
    route: [[160,347],[245,340],[206,282],[152,220],[198,164],[282,138],[306,215],[329,275],[415,279],[434,194]],
    dungeons: [[287,76],[430,346]], future: [] },
  3: { viewBox: [20,-8,445,305], image: [0,0,512,512], nodeWidth: 5,
    route: [[333,245],[302,219],[278,194],[226,206],[181,190],[143,202],[98,183],[177,150],[241,135],[229,94],[292,91],[336,108],[326,153],[395,154],[390,213]],
    dungeons: [[209,32],[386,105]], future: [{icon:"dungeon",point:[339,194]}] },
  2: { viewBox: [-15,-12,540,452], image: [0,0,512,512], nodeWidth: 6,
    route: [[110,123],[66,175],[87,235],[87,315],[108,370],[173,355],[236,307],[276,272],[270,215],[322,225],[398,202],[368,145],[286,145],[211,123],[210,55]],
    dungeons: [[195,234],[464,189]], future: [{icon:"gold-mine",point:[140,177]}] },
  4: { viewBox: [-15,65,530,215], image: [-24,80,550,293.333333], nodeWidth: 4.4,
    route: [[45,169],[71,156],[97,167],[110,193],[143,196],[142,158],[172,128],[210,120],[215,164],[229,208],[261,191],[269,147],[312,133],[333,164],[307,196]],
    dungeons: [[334,106],[455,152]], future: [{icon:"gold-mine",point:[252,119]},{icon:"dungeon",point:[181,205]}] },
  5: { viewBox: [-10,35,525,315], image: [0,0,512,512], nodeWidth: 4.4,
    route: [[105,119],[102,164],[147,187],[178,148],[190,107],[230,106],[275,99],[305,122],[258,141],[239,169],[221,199],[232,243],[278,228],[307,178],[350,156],[371,198],[380,236],[358,272],[310,283],[277,301]],
    dungeons: [[335,238],[454,230]], future: [{icon:"gold-mine",point:[113,225]},{icon:"gold-mine",point:[292,73]},{icon:"dungeon",point:[176,205]}] },
  6: { viewBox: [-15,10,545,345], image: [-40,-3,750,400], nodeWidth: 4.8,
    route: finalRoute, dungeons: [[63,240],[309,53],[482,157]],
    future: [{icon:"gold-mine",point:[394,141]},{icon:"gold-mine",point:[292,272]},{icon:"dungeon",point:[146,231]},{icon:"dungeon",point:[400,57]}] },
};

export function mapPoint(regionId: number, point: Point) {
  const [x, y, width, height] = REGION_LAYOUTS[regionId].viewBox;
  return { x: (point[0] - x) / width * 100, y: (point[1] - y) / height * 100 };
}
