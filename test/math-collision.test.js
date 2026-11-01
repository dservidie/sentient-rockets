import { describe, expect, it } from 'vitest'
import { lineIntersectsRect, pointInRect, rocketHitsWorld } from '../src/core/collision.js'
import { clamp, mapRange } from '../src/core/math.js'

describe('math helpers', () => {
  it('maps a value between ranges', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50)
    expect(mapRange(0, 0, 0, 3, 9)).toBe(3)
  })

  it('clamps values', () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-2, 0, 10)).toBe(0)
  })
})

describe('collision', () => {
  const wall = { rx: 100, ry: 100, rw: 50, rh: 20 }

  it('detects a point inside a barrier', () => {
    expect(pointInRect(110, 110, wall.rx, wall.ry, wall.rw, wall.rh)).toBe(true)
    expect(pointInRect(10, 10, wall.rx, wall.ry, wall.rw, wall.rh)).toBe(false)
  })

  it('detects a sensor ray hitting a barrier', () => {
    expect(lineIntersectsRect(0, 110, 200, 110, wall.rx, wall.ry, wall.rw, wall.rh)).toBe(true)
    expect(lineIntersectsRect(0, 10, 200, 10, wall.rx, wall.ry, wall.rw, wall.rh)).toBe(false)
  })

  it('detects rockets hitting the world edge or a barrier', () => {
    const bounds = { width: 500, height: 600 }
    expect(rocketHitsWorld({ pos: { x: -1, y: 10 } }, [], bounds)).toBe(true)
    expect(rocketHitsWorld({ pos: { x: 110, y: 110 } }, [wall], bounds)).toBe(true)
    expect(rocketHitsWorld({ pos: { x: 10, y: 10 } }, [wall], bounds)).toBe(false)
  })
})
