import type { Side } from "./types";

/** Angle of each side's center, measured from the top, clockwise. */
export const SIDE_ANGLES: Record<Side, number> = { top: 0, right: 90, bottom: 180, left: 270 };

export interface StrokePath {
  d: string;
  length: number;
  /** Length along the path where a ray from the card's center at this angle meets it. */
  lengthAtAngle(angle: number): number;
}

interface Segment {
  length: number;
  pointAt(fraction: number): [number, number];
}

function line(x0: number, y0: number, x1: number, y1: number): Segment {
  return {
    length: Math.hypot(x1 - x0, y1 - y0),
    pointAt: (f) => [x0 + (x1 - x0) * f, y0 + (y1 - y0) * f],
  };
}

/** A quarter arc; angles in degrees, 0 pointing right, 90 pointing down. */
function arc(cx: number, cy: number, r: number, from: number): Segment {
  return {
    length: (Math.PI * r) / 2,
    pointAt: (f) => {
      const a = ((from + 90 * f) * Math.PI) / 180;
      return [cx + r * Math.cos(a), cy + r * Math.sin(a)];
    },
  };
}

function strokePath(d: string, segments: Segment[], width: number, height: number): StrokePath {
  const length = segments.reduce((sum, s) => sum + s.length, 0);

  const pointAt = (distance: number): [number, number] => {
    let rest = distance;
    for (const s of segments) {
      if (rest <= s.length || s === segments[segments.length - 1]) {
        return s.pointAt(s.length ? Math.min(rest / s.length, 1) : 0);
      }
      rest -= s.length;
    }
    return [0, 0];
  };

  const lengthAtAngle = (angle: number): number => {
    const want = ((angle % 360) + 360) % 360;
    const steps = Math.max(360, Math.ceil(length));
    let best = 0;
    let bestDiff = Infinity;
    for (let i = 0; i < steps; i++) {
      const distance = (i / steps) * length;
      const [x, y] = pointAt(distance);
      const a = ((Math.atan2(x - width / 2, height / 2 - y) * 180) / Math.PI + 360) % 360;
      const diff = Math.min(Math.abs(a - want), 360 - Math.abs(a - want));
      if (diff < bestDiff) {
        bestDiff = diff;
        best = distance;
      }
    }
    return best;
  };

  return { d, length, lengthAtAngle };
}

/** A rounded rectangle along the middle of the border, starting at the top center and running clockwise. */
export function outlinePath(width: number, height: number, thickness: number, radius: number): StrokePath {
  const h = thickness / 2;
  const [x0, y0, x1, y1] = [h, h, width - h, height - h];
  const r = Math.max(0, Math.min(radius - h, (x1 - x0) / 2, (y1 - y0) / 2));
  const cx = width / 2;
  const d =
    `M${cx} ${y0}H${x1 - r}A${r} ${r} 0 0 1 ${x1} ${y0 + r}V${y1 - r}A${r} ${r} 0 0 1 ${x1 - r} ${y1}` +
    `H${x0 + r}A${r} ${r} 0 0 1 ${x0} ${y1 - r}V${y0 + r}A${r} ${r} 0 0 1 ${x0 + r} ${y0}Z`;
  const segments = [
    line(cx, y0, x1 - r, y0),
    arc(x1 - r, y0 + r, r, -90),
    line(x1, y0 + r, x1, y1 - r),
    arc(x1 - r, y1 - r, r, 0),
    line(x1 - r, y1, x0 + r, y1),
    arc(x0 + r, y1 - r, r, 90),
    line(x0, y1 - r, x0, y0 + r),
    arc(x0 + r, y0 + r, r, 180),
    line(x0 + r, y0, cx, y0),
  ];
  return strokePath(d, segments, width, height);
}

/**
 * A straight line along one side, drawn in the clockwise direction for that side
 * (left to right on top, top to bottom on the right, right to left on the bottom, bottom to top on the left).
 * The line runs the full length of the side, and the card's rounded corners clip its ends,
 * so it follows the theme's corner radius without bending.
 */
export function sidePath(side: Side, width: number, height: number, thickness: number): StrokePath {
  const h = thickness / 2;
  const points: Record<Side, [number, number, number, number]> = {
    top: [0, h, width, h],
    right: [width - h, 0, width - h, height],
    bottom: [width, height - h, 0, height - h],
    left: [h, height, h, 0],
  };
  const [x0, y0, x1, y1] = points[side];
  return strokePath(`M${x0} ${y0}L${x1} ${y1}`, [line(x0, y0, x1, y1)], width, height);
}

/** Dash settings that show only `length` of a path, starting at `start`. The period equals the path length, so it wraps on a closed path. */
export function dash(start: number, length: number, total: number) {
  const visible = Math.max(0, Math.min(length, total));
  return {
    "stroke-dasharray": `${visible}px ${total - visible}px`,
    "stroke-dashoffset": `${-start}px`,
  };
}
