interface ScreenPoint { x: number; y: number }

// Spread nearby markers in screen pixels while preserving their GPS coordinates.
export function getTrackingMarkerOffsets(points: ScreenPoint[]): [number, number][] {
  const placed: ScreenPoint[] = [];
  return points.map(point => {
    const fits = (candidate: ScreenPoint) => placed.every(other => Math.hypot(candidate.x - other.x, candidate.y - other.y) >= 52);
    if (fits(point)) {
      placed.push(point);
      return [0, 0];
    }
    // Search concentric rings for the closest free position. Check every previously
    // placed pin, including neighbouring groups, to avoid creating new overlaps.
    for (let ring = 1; ; ring++) {
      const slots = ring * 8;
      for (let slot = 0; slot < slots; slot++) {
        const angle = slot * 2 * Math.PI / slots - Math.PI / 2;
        const offset: [number, number] = [Math.cos(angle) * ring * 60, Math.sin(angle) * ring * 60];
        const candidate = { x: point.x + offset[0], y: point.y + offset[1] };
        if (fits(candidate)) {
          placed.push(candidate);
          return offset;
        }
      }
    }
  });
}
