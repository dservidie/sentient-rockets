export function mapRange(value, start1, stop1, start2, stop2) {
  if (start1 === stop1) return start2
  return start2 + ((value - start1) / (stop1 - start1)) * (stop2 - start2)
}

export function clamp(value, min, max) {
  return Math.min(max, Math.max(min, value))
}

export function angleBetween(a, b) {
  const magA = Math.hypot(a.x, a.y)
  const magB = Math.hypot(b.x, b.y)
  if (magA === 0 || magB === 0) return 0
  const dot = (a.x * b.x + a.y * b.y) / (magA * magB)
  return Math.acos(clamp(dot, -1, 1))
}

export function rotate2d(v, radians) {
  const heading = Math.atan2(v.y, v.x) + radians
  const mag = Math.hypot(v.x, v.y)
  return { x: Math.cos(heading) * mag, y: Math.sin(heading) * mag }
}

export function setMag(v, mag) {
  const current = Math.hypot(v.x, v.y)
  if (current === 0) return { x: mag, y: 0 }
  return { x: (v.x / current) * mag, y: (v.y / current) * mag }
}

export function limitMag(v, max) {
  const mag = Math.hypot(v.x, v.y)
  if (mag <= max || mag === 0) return { x: v.x, y: v.y }
  return { x: (v.x / mag) * max, y: (v.y / mag) * max }
}

export function gaussian(randomFn) {
  const u = Math.max(randomFn(), 1e-12)
  const v = Math.max(randomFn(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
