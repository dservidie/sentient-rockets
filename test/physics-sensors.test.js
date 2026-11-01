import { describe, expect, it } from 'vitest'
import { applyRocketStep, commandFromOutputs, dragCoefficient, SPEED_LIMIT } from '../src/core/physics.js'
import { detectRay, projectRay, buildNetworkInputs } from '../src/core/sensors.js'

const physics = {
  rocketMass: 0.3,
  rocketThrust: 0.03,
  rocketManeuverability: 0.08,
  rocketDragLowest: 0.005,
  rocketDragHighest: 2.5,
}

describe('rocket physics', () => {
  it('moves the rocket along its heading when thrusting', () => {
    const next = applyRocketStep(
      {
        rotation: { x: 0, y: -1 },
        vel: { x: 0, y: 0 },
        pos: { x: 250, y: 500 },
        tiltAcc: 0,
        fuelUsed: 0,
        distanceTraveled: 0,
      },
      { thrust: 1, steering: 0, duration: 10 },
      physics
    )
    expect(next.pos.y).toBeLessThan(500)
    expect(next.fuelUsed).toBe(1)
    expect(next.distanceTraveled).toBeGreaterThan(0)
  })

  it('rotates when steering is applied', () => {
    const next = applyRocketStep(
      {
        rotation: { x: 0, y: -1 },
        vel: { x: 0, y: 0 },
        pos: { x: 250, y: 500 },
        tiltAcc: 1,
        fuelUsed: 0,
        distanceTraveled: 0,
      },
      { thrust: 0, steering: 1, duration: 10 },
      physics
    )
    expect(next.rotation.x).not.toBeCloseTo(0, 5)
  })

  it('caps speed', () => {
    const next = applyRocketStep(
      {
        rotation: { x: 0, y: -1 },
        vel: { x: 0, y: -10 },
        pos: { x: 250, y: 500 },
        tiltAcc: 0,
        fuelUsed: 0,
        distanceTraveled: 0,
      },
      { thrust: 1, steering: 0, duration: 10 },
      { ...physics, rocketDragLowest: 0, rocketDragHighest: 0 }
    )
    expect(Math.hypot(next.vel.x, next.vel.y)).toBeLessThanOrEqual(SPEED_LIMIT + 1e-9)
  })

  it('builds a fly command from network outputs', () => {
    const command = commandFromOutputs(0.4, 0.2, 10)
    expect(command.thrust).toBeCloseTo(0.400005)
    expect(command.steering).toBe(0.2)
    expect(command.duration).toBe(10)
  })

  it('uses more drag when the rocket is sideways to its velocity', () => {
    expect(dragCoefficient(0, 0.005, 2.5)).toBeCloseTo(0.005)
    expect(dragCoefficient(90, 0.005, 2.5)).toBeCloseTo(2.5)
  })
})

describe('sensors', () => {
  const bounds = { width: 500, height: 600 }

  it('projects a ray from the rocket nose', () => {
    const { range } = projectRay({ x: 100, y: 100 }, { x: 0, y: -1 }, 0, 50)
    expect(range.x).toBeCloseTo(100)
    expect(range.y).toBeCloseTo(50)
  })

  it('detects obstacles and world edges', () => {
    const wall = { id: 7, rx: 90, ry: 40, rw: 20, rh: 20 }
    const hit = detectRay({ x: 100, y: 100 }, { x: 100, y: 50 }, [wall], bounds)
    expect(hit.detection).toBe(true)
    expect(hit.objectId).toBe(7)

    const miss = detectRay({ x: 10, y: 10 }, { x: 20, y: 20 }, [wall], bounds)
    expect(miss.detection).toBe(false)

    const edge = detectRay({ x: 10, y: 10 }, { x: -5, y: 10 }, [], bounds)
    expect(edge.detection).toBe(true)
    expect(edge.borderId).toBe('detectedLeft')
  })

  it('builds network inputs from velocity and sensor flags', () => {
    const inputs = buildNetworkInputs({ x: 2, y: -4 }, 0.1, [{ detection: true }, { detection: false }])
    expect(inputs).toEqual([1, -2, 0.1, 1, 0])
  })
})
