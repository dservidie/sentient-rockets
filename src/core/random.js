export function mulberry32(seed) {
  let a = seed >>> 0
  return function random() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export function defaultRandom() {
  if (typeof random === 'function') {
    try {
      return random(1)
    } catch (err) {
      return Math.random()
    }
  }
  return Math.random()
}

export function defaultGaussian() {
  if (typeof randomGaussian === 'function') {
    try {
      return randomGaussian()
    } catch (err) {
      // fall through to Box-Muller
    }
  }
  const u = Math.max(Math.random(), 1e-12)
  const v = Math.max(Math.random(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
