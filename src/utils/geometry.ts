import { Landmark } from '../types';

/**
 * Calculates angle between 3 points a, b, c (vertex at b).
 * Inputs: coordinates [x, y].
 */
export function calculateAngle(
  a: [number, number],
  b: [number, number],
  c: [number, number]
): number {
  const rad = Math.atan2(c[1] - b[1], c[0] - b[0]) - Math.atan2(a[1] - b[1], a[0] - b[0]);
  let ang = Math.abs((rad * 180.0) / Math.PI);
  if (ang > 180.0) {
    ang = 360.0 - ang;
  }
  return ang;
}

export function landmarkXY(lm: Landmark): [number, number] {
  return [lm.x, lm.y];
}
