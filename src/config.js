export const config = {
  simulation: {
    popSize: 50,
    timeoutFrames: 1000,
  },
  simulationRanges: {
    popSizeMin: 10,
    popSizeMax: 100,
  },

  physics: {
    rocketMass: 0.3,
    rocketThrust: 0.03,
    rocketManeuverability: 0.08,
    rocketDragLowest: 0.005,
    rocketDragHighest: 2.5,
  },

  physicsRanges: {
    rocketMassMin: 0.5,
    rocketMassMax: 10.0,
    rocketThrustMin: 0.001,
    rocketThrustMax: 0.2,
    rocketManeuverabilityMin: 0.05,
    rocketManeuverabilityMax: 0.2,
    rocketDragLowestMin: 0.0001,
    rocketDragLowestMax: 0.1,
    rocketDragHighestMin: 0.2,
    rocketDragHighestMax: 5.0,
  },

  score_SensorDetection: 10,
  score_FuelUsed: -1,
  score_DistanceTraveled: 3,
  score_ClosestTargetDistance: 150,
  score_FinalTargetDistance: 70,

  mutationRate: 0.1,
  mutationDeviation: 0.35,
  debugMode: true,
}

export function applyQueryConfig(search = '') {
  const query = new URLSearchParams(search.startsWith('?') ? search : search ? '?' + search : '')
  if (query.has('popSize')) {
    const value = Number(query.get('popSize'))
    if (Number.isFinite(value) && value > 0) config.simulation.popSize = Math.floor(value)
  }
  if (query.has('timeoutFrames')) {
    const value = Number(query.get('timeoutFrames'))
    if (Number.isFinite(value) && value > 0) config.simulation.timeoutFrames = Math.floor(value)
  }
  if (query.has('mutationRate')) {
    const value = Number(query.get('mutationRate'))
    if (Number.isFinite(value) && value >= 0) config.mutationRate = value
  }
  if (query.has('debug')) {
    config.debugMode = query.get('debug') !== '0' && query.get('debug') !== 'false'
  }
  return {
    scene: query.get('scene') || 'corridor',
  }
}
