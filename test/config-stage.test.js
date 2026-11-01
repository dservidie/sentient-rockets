import { afterEach, describe, expect, it } from 'vitest'
import { applyQueryConfig, config } from '../src/config.js'
import { Barrier } from '../src/barrier.js'
import { Stage } from '../src/stage.js'

const original = {
  popSize: config.simulation.popSize,
  timeoutFrames: config.simulation.timeoutFrames,
  mutationRate: config.mutationRate,
  debugMode: config.debugMode,
}

afterEach(() => {
  config.simulation.popSize = original.popSize
  config.simulation.timeoutFrames = original.timeoutFrames
  config.mutationRate = original.mutationRate
  config.debugMode = original.debugMode
})

describe('query config', () => {
  it('applies simulation overrides from the URL', () => {
    const result = applyQueryConfig('?popSize=7&timeoutFrames=9&mutationRate=0.2&debug=0&scene=wide-gap')
    expect(result.scene).toBe('wide-gap')
    expect(config.simulation.popSize).toBe(7)
    expect(config.simulation.timeoutFrames).toBe(9)
    expect(config.mutationRate).toBe(0.2)
    expect(config.debugMode).toBe(false)
  })

  it('keeps defaults when the query is empty', () => {
    const result = applyQueryConfig('')
    expect(result.scene).toBe('corridor')
    expect(config.simulation.popSize).toBe(original.popSize)
  })
})

describe('stage editing', () => {
  it('loads a built-in scene, then adds and removes barriers', () => {
    Stage.initialize('corridor')
    expect(Stage.name).toBe('corridor')
    expect(Stage.objects.length).toBe(6)
    expect(Stage.target.x).toBe(250)
    const extra = Stage.addBarrier(new Barrier(10, 20, 30, 40))
    expect(Stage.objects).toHaveLength(7)
    Stage.removeBarrier(extra)
    expect(Stage.objects).toHaveLength(6)
  })

  it('round-trips a custom scene through storage including the target', () => {
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

    Stage.initialize('wide-gap')
    Stage.name = 'custom-gap'
    Stage.target.x = 180
    Stage.target.y = 90
    Stage.saveCurrent(storage)
    Stage.resetTarget()
    expect(Stage.target.y).toBe(50)

    Stage.loadByName('custom-gap', storage)
    expect(Stage.name).toBe('custom-gap')
    expect(Stage.target.x).toBe(180)
    expect(Stage.target.y).toBe(90)
    expect(Stage.listScenes(storage)).toContain('custom-gap')

    Stage.deleteStored('custom-gap', storage)
    expect(() => Stage.loadByName('custom-gap', storage)).toThrow(/Unknown scene/)
    expect(() => Stage.deleteStored('wide-gap', storage)).toThrow(/built-in/)
  })
})
