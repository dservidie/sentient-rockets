import { lineIntersectsRect, pointInRect } from './core/collision.js'

export class Barrier {
  static nextId = 0

  constructor(ry, rx, rw = 50, rh = 50) {
    this.id = Barrier.nextId++
    this.ry = ry
    this.rx = rx
    this.rw = rw
    this.rh = rh
    this.color = 'white'
  }

  isCollidingWithPoint(pointX, pointY) {
    return pointInRect(pointX, pointY, this.rx, this.ry, this.rw, this.rh)
  }

  isCollidingWithLine(firstPointX, firstPointY, secondPointX, secondPointY) {
    return lineIntersectsRect(
      firstPointX,
      firstPointY,
      secondPointX,
      secondPointY,
      this.rx,
      this.ry,
      this.rw,
      this.rh
    )
  }

  draw() {
    fill(this.color)
    rect(this.rx, this.ry, this.rw, this.rh)
  }

  static fromJSON(json) {
    const barrier = new Barrier(json.ry, json.rx, json.rw, json.rh)
    if (json.id !== undefined) barrier.id = json.id
    if (json.color) barrier.color = json.color
    return barrier
  }
}
