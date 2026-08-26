export const EXCEL_PRIMARY_SLIP_MAX = 20;
export const EXCEL_GRIP_SLIP_MAX = 30;
export const EXCEL_FORCE_MAX = 13_000;

export interface PathPoint {
  x: number;
  y: number;
}

function coordinate(value: number): string {
  return value.toFixed(2);
}

// Excel's scatter chart uses smoothed lines. Catmull-Rom control points provide
// the same continuous, point-preserving shape in SVG.
export function smoothPath(points: PathPoint[]): string {
  if (points.length === 0) return "";

  const first = points[0];
  if (!first) return "";
  if (points.length === 1) return `M${coordinate(first.x)},${coordinate(first.y)}`;

  const commands = [`M${coordinate(first.x)},${coordinate(first.y)}`];

  for (let index = 0; index < points.length - 1; index += 1) {
    const previous = points[Math.max(0, index - 1)];
    const current = points[index];
    const next = points[index + 1];
    const following = points[Math.min(points.length - 1, index + 2)];
    if (!previous || !current || !next || !following) continue;

    const control1 = {
      x: current.x + (next.x - previous.x) / 6,
      y: current.y + (next.y - previous.y) / 6,
    };
    const control2 = {
      x: next.x - (following.x - current.x) / 6,
      y: next.y - (following.y - current.y) / 6,
    };

    commands.push(
      `C${coordinate(control1.x)},${coordinate(control1.y)} ` +
        `${coordinate(control2.x)},${coordinate(control2.y)} ` +
        `${coordinate(next.x)},${coordinate(next.y)}`,
    );
  }

  return commands.join(" ");
}
