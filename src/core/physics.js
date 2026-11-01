import { angleBetween, limitMag, mapRange, rotate2d, setMag } from './math.js'

export const SPEED_LIMIT = 3

export function dragCoefficient(angleRadians, lowest, highest) {
  return mapRange(Math.abs(angleRadians), 0, 90, lowest, highest)
}

export function applyRocketStep(state, maneuver, physics) {
  const rotation = rotate2d(state.rotation, state.tiltAcc * physics.rocketManeuverability)
  const thrustMag = (physics.rocketThrust * maneuver.thrust) / physics.rocketMass
  const thrust = setMag(rotation, thrustMag)

  let vel = { x: state.vel.x + thrust.x, y: state.vel.y + thrust.y }
  const speedBeforeDrag = Math.hypot(vel.x, vel.y)
  if (speedBeforeDrag > 0) {
    const angle = angleBetween(vel, rotation)
    const coeff = dragCoefficient(angle, physics.rocketDragLowest, physics.rocketDragHighest)
    const dragMag = coeff * speedBeforeDrag * speedBeforeDrag
    vel = {
      x: vel.x + (-vel.x / speedBeforeDrag) * dragMag,
      y: vel.y + (-vel.y / speedBeforeDrag) * dragMag,
    }
  }

  vel = limitMag(vel, SPEED_LIMIT)
  const pos = { x: state.pos.x + vel.x, y: state.pos.y + vel.y }
  const traveled = Math.hypot(vel.x, vel.y)

  return {
    rotation,
    vel,
    pos,
    fuelUsed: (state.fuelUsed || 0) + maneuver.thrust,
    distanceTraveled: (state.distanceTraveled || 0) + traveled,
  }
}

export function commandFromOutputs(thrust, steering, duration = 10) {
  return { thrust: thrust + 0.000005, steering, duration }
}
