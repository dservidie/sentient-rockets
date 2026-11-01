import { describe, expect, it } from 'vitest'
import {
  collectStats,
  isGenerationDone,
  normalizeFitness,
  pickParent,
  scoreGeneration,
  selectElite,
  summarizeGeneration,
} from '../src/core/fitness.js'
import {
  builtinScenes,
  deleteStoredScene,
  listSceneNames,
  loadSceneData,
  parseScene,
  saveSceneToStorage,
  sceneStorageKey,
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

  it('summarizes best, average, success and crash counts', () => {
    const report = summarizeGeneration([
      { fitness: 1, success: true, crashed: false },
      { fitness: 0.5, success: false, crashed: true },
      { fitness: 0, success: false, crashed: false },
    ])
    expect(report.size).toBe(3)
    expect(report.best).toBe(1)
    expect(report.avg).toBeCloseTo(0.5)
    expect(report.success).toBe(1)
    expect(report.crashed).toBe(1)
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
      target: { x: 120, y: 80 },
    }
    const json = serializeScene(original)
    const loaded = parseScene(json)
    expect(loaded).toEqual(original)
  })

  it('defaults the target when a scene omits it', () => {
    const loaded = parseScene({ name: 'no-target', objects: [] })
    expect(loaded.target).toEqual({ x: 250, y: 50 })
  })

  it('rejects scene JSON without an objects array', () => {
    expect(() => parseScene('{"name":"bad"}')).toThrow(/objects array/)
    expect(() => parseScene('')).toThrow(/Missing scene JSON/)
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

  it('saves and deletes custom scenes but refuses built-ins', () => {
    const store = new Map()
    const storage = {
      getItem(key) {
        return store.has(key) ? store.get(key) : null
      },
      setItem(key, value) {
        store.set(key, value)
      },
      removeItem(key) {
        store.delete(key)
      },
      key(index) {
        return Array.from(store.keys())[index]
      },
      get length() {
        return store.size
      },
    }
    const key = saveSceneToStorage(
      { name: 'my-dojo', objects: [{ ry: 1, rx: 2, rw: 3, rh: 4 }], target: { x: 9, y: 8 } },
      storage
    )
    expect(key).toBe(sceneStorageKey('my-dojo'))
    expect(loadSceneData('my-dojo', storage).target).toEqual({ x: 9, y: 8 })
    expect(() => deleteStoredScene('corridor', storage)).toThrow(/built-in/)
    deleteStoredScene('my-dojo', storage)
    expect(() => loadSceneData('my-dojo', storage)).toThrow(/Unknown scene/)
  })
})
