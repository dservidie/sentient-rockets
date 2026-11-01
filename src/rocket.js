import { config } from './config.js'
import { applyRocketStep, commandFromOutputs } from './core/physics.js'
import { buildNetworkInputs } from './core/sensors.js'
import { NeuralNetwork } from './neuralNetwork/neural-network.js'
import { Sensor } from './sensor.js'
import { Stage } from './stage.js'

export class Rocket {
  static launchSequenceCounter = 0

  constructor(...args) {
    const neuralNetwork = args[0]
    this.sensors = args[1] || []
    this.addSensor(new Sensor(-0.5, 80))
    this.addSensor(new Sensor(-0.25, 90))
    this.addSensor(new Sensor(0, 120))
    this.addSensor(new Sensor(0.25, 90))
    this.addSensor(new Sensor(0.5, 80))
    this.noseColor = 'red'

    this.tiltAcc = 0
    this.rotation = p5.Vector.fromAngle(-radians(90))
    this.pos = createVector(width / 2, height - 25)
    this.vel = createVector(0, 0)
    this.acc = createVector(0, 0)
    this.maneuver = Rocket.createCommand(0.0, 0.0, 1)
    this.maneuverTimeout = 0

    this.command = 0
    this.success = false
    this.crashed = false
    this.flying = true
    this.launchSequence = Rocket.launchSequenceCounter++
    this.rocketSensorsTotalDetections = 0
    this.fuelUsed = 0
    this.distanceTraveled = 0
    this.closestTargetDistance = Number.MAX_VALUE / 2
    this.finalTargetDistance = 10000000000
    this.fitness = 0

    if (neuralNetwork) {
      this.neuralNetwork = neuralNetwork
    } else {
      const inputsCount = this.sensors.length + 3
      this.neuralNetwork = new NeuralNetwork(inputsCount, inputsCount * 2, 2)
    }
    this.debug = ''
  }

  resetFlight() {
    this.tiltAcc = 0
    this.rotation = p5.Vector.fromAngle(-radians(90))
    this.pos = createVector(width / 2, height - 25)
    this.vel = createVector(0, 0)
    this.acc = createVector(0, 0)
    this.maneuver = Rocket.createCommand(0.0, 0.0, 1)
    this.maneuverTimeout = 0
    this.success = false
    this.crashed = false
    this.flying = true
    this.rocketSensorsTotalDetections = 0
    this.fuelUsed = 0
    this.distanceTraveled = 0
    this.closestTargetDistance = Number.MAX_VALUE / 2
    this.finalTargetDistance = 10000000000
    this.fitness = 0
    this.sensors.forEach((sensor) => {
      sensor.detection = false
      sensor.detectionHistory = []
    })
  }

  mutate() {
    this.neuralNetwork.mutate(config.mutationRate)
  }

  calculateDistance() {
    const d = dist(this.pos.x, this.pos.y, Stage.target.x, Stage.target.y)
    this.finalTargetDistance = d
    return d
  }

  update() {
    if (!this.flying) return

    const d = this.calculateDistance()
    if (d < 10) {
      this.success = true
      this.crashed = false
      this.flying = false
      this.pos = Stage.target.copy()
      return
    }

    if (Stage.rocketCollision(this)) {
      this.crashed = true
      this.flying = false
      return
    }

    this.updateSensors()

    if (this.maneuverTimeout <= 0) {
      this.maneuver = this.getCommand()
      this.tiltAcc = this.maneuver.steering
      this.maneuverTimeout = this.maneuver.duration
    }
    this.maneuverTimeout--

    const next = applyRocketStep(
      {
        rotation: { x: this.rotation.x, y: this.rotation.y },
        vel: { x: this.vel.x, y: this.vel.y },
        pos: { x: this.pos.x, y: this.pos.y },
        tiltAcc: this.tiltAcc,
        fuelUsed: this.fuelUsed,
        distanceTraveled: this.distanceTraveled,
      },
      this.maneuver,
      config.physics
    )

    this.rotation.set(next.rotation.x, next.rotation.y)
    this.vel.set(next.vel.x, next.vel.y)
    this.pos.set(next.pos.x, next.pos.y)
    this.fuelUsed = next.fuelUsed
    this.distanceTraveled = next.distanceTraveled
    if (d < this.closestTargetDistance) this.closestTargetDistance = d
    this.acc.mult(0)
  }

  getCommand() {
    const inputs = buildNetworkInputs(this.vel, this.tiltAcc, this.sensors)
    const output = this.neuralNetwork.predict(inputs)
    const [thrust, steering] = output
    return Rocket.createCommand(thrust, steering * 2 - 1, 10)
  }

  addSensor(sensor) {
    this.sensors.push(sensor)
  }

  updateSensors() {
    this.sensors.forEach((sensor) => {
      sensor.update(this.rotation, this.pos)
    })
  }

  getSensorsDetections() {
    const detections = this.sensors.map((sensor) => sensor.getDetectedObjects()).flat()
    return [...new Set(detections)]
  }

  static createCommand(thrust, steering, duration) {
    return commandFromOutputs(thrust, steering, duration)
  }

  draw() {
    if (config.debugMode && this.flying) {
      this.sensors.forEach((sensor) => {
        sensor.draw()
      })
    }
    push()
    noStroke()
    translate(this.pos.x, this.pos.y)
    rotate(this.rotation.heading())
    noSmooth()
    triangle(-3, 5, -3, -5, 15, 0)
    fill(this.noseColor)
    arc(5, 0, 25, 5, PI + HALF_PI, HALF_PI)
    fill(225, 225, 225)
    triangle(-3, 8, -3, -8, 5, 0)
    rectMode(CENTER)
    rect(0, 0, 10, 5)
    if (this.maneuver.thrust > 0 && this.flying) {
      noSmooth()
      fill(255, 240, 0)
      quad(
        -5,
        0,
        -8,
        -3 * this.maneuver.thrust,
        -(15 * this.maneuver.thrust + 5),
        random(-2, 2),
        -8,
        3 * this.maneuver.thrust
      )
      smooth()
    }
    pop()
  }
}
