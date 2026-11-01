import { describe, expect, it } from 'vitest'
import {
  brainsHaveSameTopology,
  cloneBrainData,
  fingerprintWeights,
  parseBrainFile,
  validateBrainData,
} from '../src/core/brain.js'
import { mulberry32 } from '../src/core/random.js'
import { NeuralNetwork } from '../src/neuralNetwork/neural-network.js'

describe('neural network wrapper', () => {
  it('creates a model and returns two outputs', () => {
    const nn = new NeuralNetwork(8, 16, 2)
    const out = nn.predict([0, 0, 0, 0, 0, 0, 0, 0])
    expect(out).toHaveLength(2)
    expect(out[0]).toBeGreaterThanOrEqual(0)
    expect(out[0]).toBeLessThanOrEqual(1)
    nn.dispose()
  })

  it('copies weights so both networks predict the same values', () => {
    const nn = new NeuralNetwork(4, 6, 2)
    const copy = nn.copy()
    const input = [0.2, 0.1, -0.3, 1]
    expect(copy.predict(input)).toEqual(nn.predict(input))
    expect(copy.fingerprint()).toBe(nn.fingerprint())
    nn.dispose()
    copy.dispose()
  })

  it('mutates weights when the rate is 1 and leaves them alone when the rate is 0', () => {
    const nn = new NeuralNetwork(3, 4, 2)
    const before = nn.fingerprint()
    nn.mutate(0, () => 0, () => 1)
    expect(nn.fingerprint()).toBe(before)

    const rng = mulberry32(7)
    nn.mutate(1, rng, () => 0.25)
    expect(nn.fingerprint()).not.toBe(before)
    nn.dispose()
  })

  it('does not implement crossover; reproduction is copy then mutate', () => {
    expect(NeuralNetwork.prototype.crossover).toBeUndefined()
  })

  it('exports topology plus weights and loads the same brain back', () => {
    const nn = new NeuralNetwork(5, 8, 2)
    const json = nn.toJSON({ scene: 'corridor', generation: 4 })
    expect(json.input_nodes).toBe(5)
    expect(json.hidden_nodes).toBe(8)
    expect(json.output_nodes).toBe(2)
    expect(json.weights.length).toBeGreaterThan(0)
    expect(parseBrainFile(JSON.stringify(json)).scene).toBe('corridor')

    const loaded = NeuralNetwork.fromJSON(json)
    const input = [0.5, 0.1, 0, 1, 0]
    expect(loaded.predict(input)).toEqual(nn.predict(input))
    expect(fingerprintWeights(loaded.getWeightsData())).toBe(nn.fingerprint())
    nn.dispose()
    loaded.dispose()
  })

  it('rejects empty, corrupt, and incomplete brain files', () => {
    expect(() => parseBrainFile('')).toThrow(/empty/)
    expect(() => parseBrainFile('{')).toThrow(/valid JSON/)
    expect(() => parseBrainFile('{"foo":1}')).toThrow(/topology/)
    expect(() => validateBrainData({ input_nodes: 8, hidden_nodes: 16, output_nodes: 2, weights: [] })).toThrow(
      /missing weights/
    )
    expect(() =>
      validateBrainData({
        input_nodes: 8,
        hidden_nodes: 16,
        output_nodes: 2,
        weights: [{ shape: [1], values: null }],
      })
    ).toThrow(/expected format/)
  })

  it('clones a valid brain and compares topology', () => {
    const brain = {
      input_nodes: 8,
      hidden_nodes: 16,
      output_nodes: 2,
      weights: [{ shape: [2, 2], values: [1, 2, 3, 4] }],
    }
    const copy = cloneBrainData(brain)
    copy.weights[0].values[0] = 99
    expect(brain.weights[0].values[0]).toBe(1)
    expect(brainsHaveSameTopology(brain, copy)).toBe(true)
    expect(brainsHaveSameTopology(brain, { ...brain, output_nodes: 3 })).toBe(false)
  })
})
