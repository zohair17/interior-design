export const clamp = (v, min, max) => (v < min ? min : v > max ? max : v);

/** Hermite ease between two edges — the workhorse for depth falloff. */
export const smoothstep = (edge0, edge1, x) => {
  const t = clamp((x - edge0) / (edge1 - edge0), 0, 1);
  return t * t * (3 - 2 * t);
};

export const lerp = (a, b, t) => a + (b - a) * t;
