import { describe, expect, it } from 'vitest'
import {
  lineIntersectsRect,
  lineSegmentsIntersect,
  pointHitsWorld,
  pointInRect,
  rocketHitsWorld,
} from '../src/core/collision.js'
import { angleBetween, clamp, gaussian, limitMag, mapRange, rotate2d, setMag } from '../src/core/math.js'
import { defaultGaussian, defaultRandom, mulberry32 } from '../src/core/random.js'
import { Barrier } from '../src/barrier.js'

describe('math helpers', () => {
  it('maps a value between ranges', () => {
    expect(mapRange(5, 0, 10, 0, 100)).toBe(50)
    expect(mapRange(0, 0, 0, 3, 9)).toBe(3)
  })

  it('clamps values', () => {
    expect(clamp(12, 0, 10)).toBe(10)
    expect(clamp(-2, 0, 10)).toBe(0)
  })

  it('rotates, scales, and limits vectors', () => {
    const turned = rotate2d({ x: 1, y: 0 }, Math.PI / 2)
    expect(turned.x).toBeCloseTo(0, 8)
    expect(turned.y).toBeCloseTo(1, 8)
    expect(setMag({ x: 3, y: 4 }, 10)).toEqual({ x: 6, y: 8 })
    expect(limitMag({ x: 6, y: 8 }, 5)).toEqual({ x: 3, y: 4 })
    expect(limitMag({ x: 1, y: 0 }, 5)).toEqual({ x: 1, y: 0 })
  })

  it('measures the angle between two headings', () => {
    expect(angleBetween({ x: 1, y: 0 }, { x: 0, y: 1 })).toBeCloseTo(Math.PI / 2)
    expect(angleBetween({ x: 0, y: 0 }, { x: 1, y: 0 })).toBe(0)
  })

  it('builds a gaussian sample from a random function', () => {
    const rng = mulberry32(3)
    const sample = gaussian(rng)
    expect(Number.isFinite(sample)).toBe(true)
    expect(mulberry32(3)()).toBe(mulberry32(3)())
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
    expect(pointHitsWorld(250, 300, bounds)).toBe(false)
    expect(pointHitsWorld(501, 10, bounds)).toBe(true)
  })

  it('treats parallel line segments as not intersecting', () => {
    expect(lineSegmentsIntersect(0, 0, 10, 0, 0, 5, 10, 5)).toBe(false)
    expect(lineSegmentsIntersect(0, 0, 10, 10, 10, 0, 0, 10)).toBe(true)
  })

  it('lets a barrier test points and rays', () => {
    const barrier = new Barrier(100, 100, 50, 20)
    expect(barrier.isCollidingWithPoint(110, 110)).toBe(true)
    expect(barrier.isCollidingWithLine(0, 110, 200, 110)).toBe(true)
    expect(barrier.isCollidingWithLine(0, 10, 200, 10)).toBe(false)
    const copy = Barrier.fromJSON({ ry: 1, rx: 2, rw: 3, rh: 4, id: 9, color: 'red' })
    expect(copy.id).toBe(9)
    expect(copy.color).toBe('red')
  })
})

describe('random helpers', () => {
  it('uses p5 random when present and falls back if it throws', () => {
    expect(defaultRandom()).toBeGreaterThanOrEqual(0)
    const previous = globalThis.random
    globalThis.random = () => {
      throw new Error('p5 random exploded')
    }
    expect(typeof defaultRandom()).toBe('number')
    delete globalThis.random
    expect(typeof defaultRandom()).toBe('number')
    globalThis.random = previous
  })

  it('uses p5 gaussian when present and falls back if it throws', () => {
    expect(Number.isFinite(defaultGaussian())).toBe(true)
    const previous = globalThis.randomGaussian
    globalThis.randomGaussian = () => {
      throw new Error('p5 gaussian exploded')
    }
    expect(Number.isFinite(defaultGaussian())).toBe(true)
    delete globalThis.randomGaussian
    expect(Number.isFinite(defaultGaussian())).toBe(true)
    globalThis.randomGaussian = previous
  })
})
