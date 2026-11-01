import { detectRay, projectRay } from './core/sensors.js'
import { Stage } from './stage.js'

export class Sensor {
  constructor(angle, distance) {
    this.angle = angle
    this.distance = distance
    this.origin = null
    this.range = null
    this.detection = false
    this.detectionHistory = []
    this.rotation = { x: 0, y: -distance }
    this.debug = ''
  }

  update(rotation, position, bounds = { width, height }, obstacles = Stage.objects) {
    this.origin = position
    const projected = projectRay(position, rotation, this.angle, this.distance)
    this.range = projected.range
    this.rotation = projected.direction

    const previousState = this.detection
    const result = detectRay(this.origin, this.range, obstacles, bounds)
    this.detection = result.detection

    if (!previousState && this.detection) {
      this.detectionHistory.push(result.objectId != null ? result.objectId : result.borderId)
    }

    return this.detection
  }

  getDetectedObjects() {
    return this.detectionHistory
  }

  getDifferentDetectedObjects() {
    return [...new Set(this.detectionHistory)]
  }

  draw() {
    push()
    noSmooth()
    stroke(color(this.detection ? 'darkred' : 'DarkGreen'))
    line(this.origin.x, this.origin.y, this.range.x, this.range.y)
    smooth()
    pop()
  }
}
