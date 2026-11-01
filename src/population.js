import { config } from './config.js'
import { cloneBrainData } from './core/brain.js'
import {
  isGenerationDone,
  normalizeFitness,
  pickParent,
  scoreGeneration,
  selectElite,
  summarizeGeneration,
} from './core/fitness.js'
import { defaultRandom } from './core/random.js'
import { NeuralNetwork } from './neuralNetwork/neural-network.js'
import { Rocket } from './rocket.js'

export class Population {
  static successCounter = 0
  static failedCounter = 0
  static rockets = []
  static popSize
  static mode = 'train'
  static lastReport = null
  static loadedBrain = null

  static initialize(options = {}) {
    Population.rockets = []
    Population.popSize = options.popSize || config.simulation.popSize
    Population.mode = options.mode || 'train'
    Population.successCounter = 0
    Population.failedCounter = 0
    Population.lastReport = null
    Rocket.launchSequenceCounter = 0

    if (options.brain) {
      Population.loadedBrain = cloneBrainData(options.brain)
      Population.seedFromBrain(options.brain, { mutate: options.mutate === true })
      return
    }

    for (let i = 0; i < Population.popSize; i++) {
      Population.rockets[i] = new Rocket()
    }
  }

  static seedFromBrain(brainData, options = {}) {
    const source = NeuralNetwork.fromJSON(brainData)
    Population.rockets = []
    Rocket.launchSequenceCounter = 0
    for (let i = 0; i < Population.popSize; i++) {
      const child = source.copy()
      if (options.mutate) child.mutate(config.mutationRate)
      Population.rockets.push(new Rocket(child))
    }
    source.dispose()
  }

  static resetFlights() {
    Rocket.launchSequenceCounter = 0
    Population.successCounter = 0
    Population.failedCounter = 0
    Population.rockets.forEach((rocket, index) => {
      rocket.launchSequence = index
      rocket.resetFlight()
    })
  }

  static async evaluate() {
    for (const rocket of Population.rockets) {
      rocket.rocketSensorsTotalDetections = rocket.getSensorsDetections().length
    }

    const scores = {
      closestTargetDistance: config.score_ClosestTargetDistance,
      finalTargetDistance: config.score_FinalTargetDistance,
      sensorDetection: config.score_SensorDetection,
    }
    scoreGeneration(Population.rockets, scores)
    normalizeFitness(Population.rockets)
    Population.rockets.sort((a, b) => b.fitness - a.fitness)

    const report = summarizeGeneration(Population.rockets)
    report.mode = Population.mode
    Population.lastReport = report

    if (config.debugMode) {
      console.log('Detections scored. Best fitness:', report.best)
    }

    if (Population.mode === 'evaluate') {
      return report
    }

    const elite = selectElite(Population.rockets, Population.popSize)
    const newRockets = []
    Rocket.launchSequenceCounter = 0
    for (let i = 0; i < Population.popSize; i++) {
      const parent = pickParent(elite, defaultRandom)
      const childNN = parent.neuralNetwork.copy()
      childNN.mutate(config.mutationRate)
      newRockets.push(new Rocket(childNN))
    }

    Population.rockets.forEach((rocket) => {
      if (rocket.neuralNetwork && !newRockets.some((child) => child.neuralNetwork === rocket.neuralNetwork)) {
        rocket.neuralNetwork.dispose()
      }
    })

    Population.rockets = newRockets
    Population.successCounter = 0
    Population.failedCounter = 0
    return report
  }

  static run(mustDraw, framesCounter) {
    for (const rocket of Population.rockets) {
      if (framesCounter / 5 > rocket.launchSequence) {
        const flyingBefore = rocket.flying
        rocket.update()
        if (flyingBefore && !rocket.flying) {
          if (rocket.success) Population.successCounter++
          else if (rocket.crashed) Population.failedCounter++
        }
        if (mustDraw) rocket.draw()
      }
    }
  }

  static simulationFinished(framesCounter) {
    if (isGenerationDone(framesCounter, config.simulation.timeoutFrames, Population.rockets)) {
      for (const rocket of Population.rockets) {
        rocket.flying = false
      }
      return true
    }
    return false
  }

  static bestRocket() {
    if (!Population.rockets.length) return null
    return Population.rockets.slice().sort((a, b) => (b.fitness || 0) - (a.fitness || 0))[0]
  }

  static exportBestBrain(extra = {}) {
    const best = Population.bestRocket()
    if (!best) throw new Error('No rockets to export')
    return best.neuralNetwork.toJSON({
      savedAt: new Date().toISOString(),
      scene: extra.scene || null,
      generation: extra.generation || null,
      fitness: best.fitness || 0,
    })
  }

  static loadBrain(brainData, options = {}) {
    Population.loadedBrain = cloneBrainData(brainData)
    Population.mode = options.mode || 'evaluate'
    Population.initialize({
      brain: Population.loadedBrain,
      mode: Population.mode,
      mutate: options.mutate === true,
      popSize: options.popSize,
    })
    return Population.loadedBrain
  }

  static fingerprints() {
    return Population.rockets.map((rocket) => rocket.neuralNetwork.fingerprint())
  }

  static increaseSuccessCounter() {
    Population.successCounter++
  }

  static increaseFailedCounter() {
    Population.failedCounter++
  }
}
