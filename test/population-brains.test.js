import { beforeEach, describe, expect, it } from 'vitest'
import { config } from '../src/config.js'
import { NeuralNetwork } from '../src/neuralNetwork/neural-network.js'
import { Population } from '../src/population.js'
import { Stage } from '../src/stage.js'

describe('population brains', () => {
  beforeEach(() => {
    config.simulation.popSize = 4
    config.mutationRate = 0.1
    Stage.initialize('corridor')
  })

  it('seeds every rocket from a loaded brain instead of random weights', () => {
    const source = new NeuralNetwork(8, 16, 2)
    const brain = source.toJSON({ scene: 'corridor' })
    const fingerprint = source.fingerprint()
    Population.loadBrain(brain, { mode: 'evaluate', popSize: 4 })
    const fingerprints = Population.fingerprints()
    expect(fingerprints).toHaveLength(4)
    expect(new Set(fingerprints).size).toBe(1)
    expect(fingerprints[0]).toBe(fingerprint)
    expect(Population.mode).toBe('evaluate')
    source.dispose()
  })

  it('keeps the loaded weights after an evaluation run', async () => {
    const source = new NeuralNetwork(8, 16, 2)
    const brain = source.toJSON()
    const fingerprint = source.fingerprint()
    Population.loadBrain(brain, { mode: 'evaluate', popSize: 3 })
    Population.rockets.forEach((rocket) => {
      rocket.flying = false
      rocket.closestTargetDistance = 40
      rocket.finalTargetDistance = 40
    })
    const report = await Population.evaluate()
    expect(report.mode).toBe('evaluate')
    expect(Population.fingerprints().every((value) => value === fingerprint)).toBe(true)
    source.dispose()
  })

  it('continues training from the loaded brain rather than new random networks', async () => {
    const source = new NeuralNetwork(8, 16, 2)
    const brain = source.toJSON()
    const fingerprint = source.fingerprint()
    config.mutationRate = 0
    Population.loadBrain(brain, { mode: 'train', mutate: false, popSize: 3 })
    expect(Population.fingerprints()[0]).toBe(fingerprint)

    Population.rockets.forEach((rocket, index) => {
      rocket.flying = false
      rocket.closestTargetDistance = 10 + index
      rocket.finalTargetDistance = 10 + index
    })
    await Population.evaluate()
    expect(Population.fingerprints().every((value) => value === fingerprint)).toBe(true)
    source.dispose()
  })

  it('exports the current best rocket as a portable brain file', () => {
    Population.initialize({ popSize: 3 })
    Population.rockets[0].fitness = 0.2
    Population.rockets[1].fitness = 0.9
    Population.rockets[2].fitness = 0.1
    const exported = Population.exportBestBrain({ scene: 'wide-gap', generation: 2 })
    expect(exported.scene).toBe('wide-gap')
    expect(exported.weights.length).toBeGreaterThan(0)
    expect(exported.input_nodes).toBe(8)
    expect(exported.fitness).toBe(0.9)
  })

  it('counts crashes and successes while the population runs', () => {
    Population.initialize({ popSize: 2 })
    Population.rockets[0].pos.set(Stage.target.x, Stage.target.y)
    Population.rockets[1].pos.set(-2, 20)
    Population.run(false, 1000)
    expect(Population.successCounter).toBe(1)
    expect(Population.failedCounter).toBe(1)
    expect(Population.simulationFinished(1000)).toBe(true)
    Population.increaseSuccessCounter()
    Population.increaseFailedCounter()
    expect(Population.successCounter).toBe(2)
    expect(Population.failedCounter).toBe(2)
    Population.resetFlights()
    expect(Population.successCounter).toBe(0)
    expect(Population.rockets[0].flying).toBe(true)
  })
})
