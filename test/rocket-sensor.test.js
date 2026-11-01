import { describe, expect, it } from 'vitest'
import { Population } from '../src/population.js'
import { Rocket } from '../src/rocket.js'
import { Sensor } from '../src/sensor.js'
import { Stage } from '../src/stage.js'

describe('rocket outcomes', () => {
  it('marks success when a rocket reaches the target', () => {
    Stage.initialize('corridor')
    Population.initialize({ popSize: 1 })
    const rocket = Population.rockets[0]
    rocket.pos.set(Stage.target.x, Stage.target.y)
    rocket.update()
    expect(rocket.success).toBe(true)
    expect(rocket.crashed).toBe(false)
    expect(rocket.flying).toBe(false)
  })

  it('marks crashed when a rocket hits a barrier or the world edge', () => {
    Stage.initialize('corridor')
    Population.initialize({ popSize: 1 })
    const rocket = Population.rockets[0]
    const wall = Stage.objects[0]
    rocket.pos.set(wall.rx + 2, wall.ry + 2)
    rocket.update()
    expect(rocket.crashed).toBe(true)
    expect(rocket.flying).toBe(false)

    const edgeRocket = new Rocket(rocket.neuralNetwork.copy())
    edgeRocket.pos.set(-4, 20)
    edgeRocket.update()
    expect(edgeRocket.crashed).toBe(true)
    edgeRocket.neuralNetwork.dispose()
  })
})

describe('sensors', () => {
  it('records a detection when the ray hits an obstacle', () => {
    Stage.initialize('corridor')
    const sensor = new Sensor(0, 90)
    const hit = sensor.update({ x: 0, y: -1 }, { x: 250, y: 200 }, { width: 500, height: 600 }, Stage.objects)
    expect(hit).toBe(true)
    expect(sensor.detection).toBe(true)
    expect(sensor.getDetectedObjects().length).toBeGreaterThan(0)
    expect(sensor.getDifferentDetectedObjects()).toEqual([...new Set(sensor.getDetectedObjects())])
  })
})
