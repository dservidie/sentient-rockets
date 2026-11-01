export function pointInRect(px, py, rx, ry, rw, rh) {
  return px >= rx && px <= rx + rw && py >= ry && py <= ry + rh
}

export function lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, x4, y4) {
  const den = (y4 - y3) * (x2 - x1) - (x4 - x3) * (y2 - y1)
  if (den === 0) return false
  const ua = ((x4 - x3) * (y1 - y3) - (y4 - y3) * (x1 - x3)) / den
  const ub = ((x2 - x1) * (y1 - y3) - (y2 - y1) * (x1 - x3)) / den
  return ua >= 0 && ua <= 1 && ub >= 0 && ub <= 1
}

export function lineIntersectsRect(x1, y1, x2, y2, rx, ry, rw, rh) {
  if (pointInRect(x1, y1, rx, ry, rw, rh) || pointInRect(x2, y2, rx, ry, rw, rh)) {
    return true
  }
  const x3 = rx + rw
  const y3 = ry + rh
  return (
    lineSegmentsIntersect(x1, y1, x2, y2, rx, ry, x3, ry) ||
    lineSegmentsIntersect(x1, y1, x2, y2, x3, ry, x3, y3) ||
    lineSegmentsIntersect(x1, y1, x2, y2, x3, y3, rx, y3) ||
    lineSegmentsIntersect(x1, y1, x2, y2, rx, y3, rx, ry)
  )
}

export function pointHitsWorld(px, py, bounds) {
  return px < 0 || py < 0 || px > bounds.width || py > bounds.height
}

export function rocketHitsWorld(rocket, objects, bounds) {
  if (pointHitsWorld(rocket.pos.x, rocket.pos.y, bounds)) return true
  return objects.some((obj) => pointInRect(rocket.pos.x, rocket.pos.y, obj.rx, obj.ry, obj.rw, obj.rh))
}
