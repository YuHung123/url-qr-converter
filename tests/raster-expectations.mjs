// Independent test oracle: enumerate all legal uniform scales, nearest first,
// then prefer more detail on ties. Production only evaluates floor/ceil.
export function expectedRasterSize(target, totalModules) {
  return Array.from({ length: Math.floor(2048 / totalModules) - 1 }, (_, i) => (i + 2) * totalModules)
    .sort((a, b) => Math.abs(a - target) - Math.abs(b - target) || b - a)[0];
}
