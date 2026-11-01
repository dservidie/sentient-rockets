import * as tf from '@tensorflow/tfjs'

await tf.setBackend('cpu')
await tf.ready()
globalThis.tf = tf

class Vec {
  constructor(x = 0, y = 0) {
    this.x = x
    this.y = y
  }
  static fromAngle(angle) {
    return new Vec(Math.cos(angle), Math.sin(angle))
  }
  copy() {
    return new Vec(this.x, this.y)
  }
  set(x, y) {
    this.x = x
    this.y = y
    return this
  }
  heading() {
    return Math.atan2(this.y, this.x)
  }
  mag() {
    return Math.hypot(this.x, this.y)
  }
  mult(value) {
    this.x *= value
    this.y *= value
    return this
  }
}

globalThis.width = 500
globalThis.height = 600
globalThis.p5 = { Vector: Vec }
globalThis.createVector = (x = 0, y = 0) => new Vec(x, y)
globalThis.radians = (degrees) => (degrees * Math.PI) / 180
globalThis.degrees = (radians) => (radians * 180) / Math.PI
globalThis.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1)
globalThis.random = (max = 1) => Math.random() * max
globalThis.randomGaussian = () => {
  const u = Math.max(Math.random(), 1e-12)
  const v = Math.max(Math.random(), 1e-12)
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v)
}
