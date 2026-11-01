import { mapRange } from './math.js'

export const ELITE_RATIO = 0.2

export function collectStats(rockets) {
  const stats = {
    minClosest: Number.POSITIVE_INFINITY,
    maxClosest: Number.NEGATIVE_INFINITY,
    minFinal: Number.POSITIVE_INFINITY,
    maxFinal: Number.NEGATIVE_INFINITY,
    minDetections: Number.POSITIVE_INFINITY,
    maxDetections: Number.NEGATIVE_INFINITY,
  }

  for (const rocket of rockets) {
    const detections = rocket.rocketSensorsTotalDetections || 0
    stats.minClosest = Math.min(stats.minClosest, rocket.closestTargetDistance)
    stats.maxClosest = Math.max(stats.maxClosest, rocket.closestTargetDistance)
    stats.minFinal = Math.min(stats.minFinal, rocket.finalTargetDistance)
    stats.maxFinal = Math.max(stats.maxFinal, rocket.finalTargetDistance)
    stats.minDetections = Math.min(stats.minDetections, detections)
    stats.maxDetections = Math.max(stats.maxDetections, detections)
  }

  if (stats.maxClosest <= stats.minClosest) stats.maxClosest = stats.minClosest + 1e-10
  if (stats.maxFinal <= stats.minFinal) stats.maxFinal = stats.minFinal + 1e-10
  if (stats.maxDetections <= stats.minDetections) stats.maxDetections = stats.minDetections + 1e-10
  return stats
}

export function scoreRocket(rocket, stats, scores) {
  const closest =
    mapRange(rocket.closestTargetDistance, stats.minClosest, stats.maxClosest, 1, 0) *
    scores.closestTargetDistance
  const final =
    mapRange(rocket.finalTargetDistance, stats.minFinal, stats.maxFinal, 1, 0) *
    scores.finalTargetDistance
  const detections =
    mapRange(rocket.rocketSensorsTotalDetections || 0, stats.minDetections, stats.maxDetections, 1, 0) *
    scores.sensorDetection
  return {
    fitness: closest + final,
    closest,
    final,
    detections,
  }
}

export function scoreGeneration(rockets, scores) {
  const stats = collectStats(rockets)
  for (const rocket of rockets) {
    const scored = scoreRocket(rocket, stats, scores)
    rocket.fitness = scored.fitness
  }
  return stats
}

export function normalizeFitness(rockets) {
  const maxFitness = Math.max(0, ...rockets.map((rocket) => rocket.fitness || 0))
  if (maxFitness === 0) {
    rockets.forEach((rocket) => {
      rocket.fitness = 0
    })
    return 0
  }
  rockets.forEach((rocket) => {
    rocket.fitness /= maxFitness
  })
  return maxFitness
}

export function selectElite(rockets, popSize, eliteRatio = ELITE_RATIO) {
  const sorted = rockets.slice().sort((a, b) => (b.fitness || 0) - (a.fitness || 0))
  const count = Math.max(1, Math.ceil(popSize * eliteRatio))
  return sorted.slice(0, count)
}

export function pickParent(elite, randomFn) {
  if (!elite.length) return null
  const index = Math.floor(randomFn() * elite.length)
  return elite[Math.min(elite.length - 1, Math.max(0, index))]
}

export function isGenerationDone(framesCounter, timeoutFrames, rockets) {
  if (framesCounter > timeoutFrames) return true
  return rockets.every((rocket) => !rocket.flying)
}

export function summarizeGeneration(rockets) {
  const fitnesses = rockets.map((rocket) => rocket.fitness || 0)
  const best = Math.max(0, ...fitnesses)
  const avg = fitnesses.length ? fitnesses.reduce((sum, value) => sum + value, 0) / fitnesses.length : 0
  const success = rockets.filter((rocket) => rocket.success).length
  const crashed = rockets.filter((rocket) => rocket.crashed).length
  return {
    size: rockets.length,
    best,
    avg,
    success,
    crashed,
  }
}
