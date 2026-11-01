import { describe, expect, it } from 'vitest'
import {
  collectStats,
  isGenerationDone,
  normalizeFitness,
  pickParent,
  scoreGeneration,
  selectElite,
} from '../src/core/fitness.js'
import {
  builtinScenes,
  listSceneNames,
  loadSceneData,
  parseScene,
  serializeScene,
} from '../src/core/scenes.js'

function rocket(values) {
  return {
    closestTargetDistance: values.closest,
    finalTargetDistance: values.final,
    rocketSensorsTotalDetections: values.detections || 0,
    flying: values.flying !== false,
    fitness: 0,
  }
}

describe('fitness and selection', () => {
  const scores = {
    closestTargetDistance: 150,
    finalTargetDistance: 70,
    sensorDetection: 10,
  }

  it('gives a higher score to rockets that ended closer to the target', () => {
    const rockets = [rocket({ closest: 40, final: 20 }), rocket({ closest: 80, final: 200 })]
    scoreGeneration(rockets, scores)
    expect(rockets[0].fitness).toBeGreaterThan(rockets[1].fitness)
  })

  it('normalizes the best rocket to fitness 1', () => {
    const rockets = [rocket({ closest: 10, final: 10 }), rocket({ closest: 90, final: 90 })]
    scoreGeneration(rockets, scores)
    normalizeFitness(rockets)
    expect(Math.max(...rockets.map((item) => item.fitness))).toBeCloseTo(1)
  })

  it('keeps the top 20 percent as elite', () => {
    const rockets = Array.from({ length: 10 }, (_, i) => ({ fitness: i }))
    const elite = selectElite(rockets, 10, 0.2)
    expect(elite).toHaveLength(2)
    expect(elite[0].fitness).toBe(9)
    expect(elite[1].fitness).toBe(8)
  })

  it('picks a parent from the elite set', () => {
    const elite = [{ id: 'a' }, { id: 'b' }]
    expect(pickParent(elite, () => 0).id).toBe('a')
    expect(pickParent(elite, () => 0.99).id).toBe('b')
  })

  it('ends a generation when the timeout hits or nobody is flying', () => {
    expect(isGenerationDone(5, 10, [rocket({ closest: 1, final: 1, flying: true })])).toBe(false)
    expect(isGenerationDone(11, 10, [rocket({ closest: 1, final: 1, flying: true })])).toBe(true)
    expect(isGenerationDone(1, 10, [rocket({ closest: 1, final: 1, flying: false })])).toBe(true)
  })

  it('collects min and max stats from a generation', () => {
    const stats = collectStats([
      rocket({ closest: 4, final: 8, detections: 1 }),
      rocket({ closest: 12, final: 3, detections: 5 }),
    ])
    expect(stats.minClosest).toBe(4)
    expect(stats.maxClosest).toBe(12)
    expect(stats.minFinal).toBe(3)
    expect(stats.maxFinal).toBe(8)
  })
})

describe('scenes from the designer', () => {
  it('ships built-in corridor and wide-gap stages', () => {
    expect(Object.keys(builtinScenes)).toEqual(['corridor', 'wide-gap'])
    expect(loadSceneData('corridor').objects.length).toBeGreaterThan(0)
    expect(loadSceneData('wide-gap').name).toBe('wide-gap')
  })

  it('round-trips scene JSON used by the designer', () => {
    const original = {
      name: 'custom-run',
      objects: [{ id: 3, ry: 10, rx: 20, rw: 30, rh: 40, color: 'white' }],
    }
    const json = serializeScene(original)
    const loaded = parseScene(json)
    expect(loaded).toEqual(original)
  })

  it('lists built-in scenes plus anything saved in localStorage', () => {
    const storage = {
      keys: ['scene-my-dojo', 'unrelated'],
      length: 2,
      key(index) {
        return this.keys[index]
      },
    }
    const names = listSceneNames(storage)
    expect(names).toContain('corridor')
    expect(names).toContain('wide-gap')
    expect(names).toContain('my-dojo')
  })
})
