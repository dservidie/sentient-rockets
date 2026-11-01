import { lineIntersectsRect } from './collision.js'
import { rotate2d, setMag } from './math.js'

export function projectRay(origin, heading, angle, distance) {
  const direction = rotate2d(setMag(heading, distance), (Math.PI / 2) * angle)
  return {
    range: { x: origin.x + direction.x, y: origin.y + direction.y },
    direction,
  }
}

export function detectRay(origin, range, obstacles, bounds) {
  const detectedObject = (obstacles || []).find((obj) =>
    lineIntersectsRect(origin.x, origin.y, range.x, range.y, obj.rx, obj.ry, obj.rw, obj.rh)
  )
  const detectedLeft = range.x < 0
  const detectedRight = range.x > bounds.width
  const detectedTop = range.y < 0
  const detectedBottom = range.y > bounds.height
  const detectedBorders = detectedLeft || detectedRight || detectedTop || detectedBottom

  let borderId = null
  if (detectedLeft) borderId = 'detectedLeft'
  else if (detectedRight) borderId = 'detectedRight'
  else if (detectedTop) borderId = 'detectedTop'
  else if (detectedBottom) borderId = 'detectedBottom'

  return {
    detection: Boolean(detectedObject || detectedBorders),
    objectId: detectedObject ? detectedObject.id : null,
    borderId,
  }
}

export function buildNetworkInputs(vel, tiltAcc, sensors) {
  const inputs = [vel.x / 2, vel.y / 2, tiltAcc]
  for (const sensor of sensors) {
    inputs.push(sensor.detection ? 1 : 0)
  }
  return inputs
}
