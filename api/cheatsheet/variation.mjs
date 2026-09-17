// Seeded randomness, and the rule about what a seed is allowed to move.
//
// **Determinism is a property of this layer, not of the renderers.** The ported
// renderers are already pure: `toSVG` and `toPNG` read a document and write
// bytes, touching no clock, no global and no platform source of entropy, so one
// document renders to identical bytes every time in both formats. What was
// missing was upstream of them - a composition that chooses anything at random
// is a different document on every call, and no amount of renderer purity makes
// that reproducible. So every choice a composition makes is drawn from here,
// and here has exactly one source of randomness, which is the seed.
//
// What that buys is the three things the roadmap asked for in one property: a
// variation can be **reproduced**, because the seed is the whole input; it can
// be **reviewed**, because the seed and the values it produced are reported
// beside the composition; and it can be **regenerated identically**, because
// nothing else was ever consulted.
//
// **The generator is written out rather than delegated.** `Math.random` cannot
// be seeded, and seeding a global would make two compositions in one process
// depend on the order they were composed in. A package is not available either:
// the page imports this tree directly with no build step and no dependency
// manifest.

/**
 * A seeded pseudo-random source: SplitMix32.
 *
 * Chosen because it is small enough to read, holds all its state in one 32-bit
 * word, and passes the distribution tests the alternatives of this size fail -
 * a bare linear congruential generator has visible structure in its low bits,
 * which would show up as variations that are not evenly spread. Every operation
 * is `Math.imul` or a shift, so it produces the same sequence on every engine
 * rather than drifting with floating point.
 *
 * @param {number} seed
 * @returns {() => number} The next value in [0, 1), each call.
 */
export function splitmix32(seed) {
  let state = seed >>> 0;
  return function next() {
    state = (state + 0x9e3779b9) >>> 0;
    let z = state;
    z = Math.imul(z ^ (z >>> 16), 0x21f0aaad);
    z = Math.imul(z ^ (z >>> 15), 0x735a2d97);
    return ((z ^ (z >>> 15)) >>> 0) / 4294967296;
  };
}

/**
 * Turns a string into a seed, so a cheatsheet can be seeded by its own slug.
 *
 * FNV-1a over the code units. A sheet seeded by its slug regenerates identically
 * without anyone having to record a number beside it.
 *
 * @param {string} text
 * @returns {number}
 */
export function seedFrom(text) {
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return hash >>> 0;
}

/**
 * Normalises whatever a caller passed as a seed into a number.
 *
 * A number is taken as it is, a string is hashed, and anything else - including
 * the `undefined` of a caller who named no seed - is 0. **The default is a
 * number rather than an absence on purpose**: a composition with no seed still
 * has to be reproducible, and falling back to something unseeded would make
 * "forgot to pass a seed" silently mean "never the same twice".
 *
 * @param {number | string | undefined} seed
 * @returns {number}
 */
export function normalizeSeed(seed) {
  if (typeof seed === "number" && Number.isFinite(seed)) return seed >>> 0;
  if (typeof seed === "string") return seedFrom(seed);
  return 0;
}

/**
 * A choice a variation made, kept so the composition can be reviewed.
 *
 * @typedef {object} Choice
 * @property {string} name
 * @property {number} value
 * @property {[number, number]} range
 */

/** The seeded source a composition draws every choice from. */
export class Variation {
  /**
   * @param {number | string} [seed]
   */
  constructor(seed) {
    /** The seed as a number, which is what reproduces this variation. */
    this.seed = normalizeSeed(seed);
    /** What the seed was given as, so a slug-seeded sheet says so. */
    this.givenSeed = seed ?? 0;
    /**
     * Every choice made, in the order it was made.
     *
     * @type {Choice[]}
     */
    this.choices = [];
    this.next = splitmix32(this.seed);
  }

  /**
   * A value in `[min, max]`, recorded under a name.
   *
   * An empty or inverted range returns `min` and still consumes a value from
   * the sequence. That matters more than it looks: a composition whose content
   * leaves no slack must not shift every later choice by skipping a draw, or
   * two sheets with the same seed would differ because one of them happened to
   * be full.
   *
   * @param {string} name
   * @param {number} min
   * @param {number} max
   * @returns {number}
   */
  between(name, min, max) {
    const draw = this.next();
    const value = max > min ? min + draw * (max - min) : min;
    this.choices.push({ name, value, range: [min, max] });
    return value;
  }

  /**
   * A value in `[min, max]` snapped to a multiple of `step`, recorded under a
   * name.
   *
   * Snapping is inside the range rather than around it: a multiple that would
   * fall outside is pulled back, so a snapped choice can never leave the bounds
   * the design language measured.
   *
   * @param {string} name
   * @param {number} min
   * @param {number} max
   * @param {number} step
   * @returns {number}
   */
  betweenOnStep(name, min, max, step) {
    const draw = this.next();
    const low = Math.ceil(min / step);
    const high = Math.floor(max / step);
    let value;
    if (high >= low) {
      value = (low + Math.floor(draw * (high - low + 1))) * step;
      // `draw` is in [0, 1), so the floor cannot reach high + 1. Clamped anyway,
      // because a rounding change here would be a silent off-by-one rather than
      // an error.
      value = Math.min(value, high * step);
    } else {
      // No multiple of the step fits between the bounds, so the range itself is
      // the answer and the step does not apply.
      value = min;
    }
    this.choices.push({ name, value, range: [min, max] });
    return value;
  }

  /**
   * One of a list, recorded under a name by its index.
   *
   * @template T
   * @param {string} name
   * @param {T[]} items
   * @returns {T}
   */
  pick(name, items) {
    const draw = this.next();
    const index = items.length > 0 ? Math.min(Math.floor(draw * items.length), items.length - 1) : 0;
    this.choices.push({ name, value: index, range: [0, Math.max(items.length - 1, 0)] });
    return items[index];
  }

  /**
   * The choices as a plain object, for a report or a JSON result.
   *
   * @returns {{ seed: number, givenSeed: number | string, choices: Choice[] }}
   */
  toJSON() {
    return { seed: this.seed, givenSeed: this.givenSeed, choices: this.choices };
  }
}
