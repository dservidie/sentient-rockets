import { expect, test } from '@playwright/test'
import {
  assertNoProblems,
  clickCanvas,
  collectPageProblems,
  expandPhysics,
  gotoSim,
  qsButton,
  qsCheckbox,
  qsPanel,
  qsRange,
  qsSelect,
  setQsCheckbox,
} from './helpers.js'

test('sim page exposes every QuickSettings control', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)

  await expect(qsPanel(page, 'Stage')).toBeVisible()
  await expect(qsPanel(page, 'Brains')).toBeVisible()
  await expect(qsPanel(page, 'Run')).toBeVisible()
  await expect(qsPanel(page, 'Physics')).toBeVisible()

  await expect(qsSelect(page, 'Stage', 'scenesList')).toBeVisible()
  await expect(qsButton(page, 'Load Scene')).toBeVisible()
  await expect(qsButton(page, 'Reset')).toBeVisible()

  await expect(qsButton(page, 'Export best brain')).toBeVisible()
  await expect(qsPanel(page, 'Brains').locator('input[type="file"]')).toHaveCount(1)
  await expect(qsButton(page, 'Evaluate loaded brain')).toBeVisible()
  await expect(qsButton(page, 'Continue training from loaded')).toBeVisible()

  await expect(qsCheckbox(page, 'Run', 'paused')).toHaveCount(1)
  await expect(qsCheckbox(page, 'Run', 'debugMode')).toHaveCount(1)
  await expect(qsCheckbox(page, 'Run', 'drawing')).toHaveCount(1)
  await expect(qsRange(page, 'Run', 'simSpeed')).toBeVisible()

  await expandPhysics(page)
  for (const name of [
    'rocketMass',
    'rocketThrust',
    'rocketManeuverability',
    'rocketDragLowest',
    'rocketDragHighest',
  ]) {
    await expect(qsRange(page, 'Physics', name)).toBeVisible()
  }

  assertNoProblems(problems)
})

test('start, pause, reset, speed, generations and fitness stats', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)

  await expect(page.locator('#generationLabel')).toContainText(/Generation #/)
  await setQsCheckbox(page, 'Run', 'paused', true)
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getPaused())).toBe(true)
  const pausedFrames = await page.evaluate(() => window.sentientRockets.getFrames())
  await page.waitForTimeout(300)
  expect(await page.evaluate(() => window.sentientRockets.getFrames())).toBe(pausedFrames)

  await setQsCheckbox(page, 'Run', 'paused', false)
  await qsRange(page, 'Run', 'simSpeed').fill('20')
  await expect.poll(() => page.evaluate(() => window.runSettings.simSpeed)).toBe(20)

  await setQsCheckbox(page, 'Run', 'debugMode', true)
  await setQsCheckbox(page, 'Run', 'drawing', false)
  await expect.poll(() => page.evaluate(() => window.sentientRockets.config.debugMode)).toBe(true)
  await expect.poll(() => page.evaluate(() => window.runSettings.drawing)).toBe(false)
  await setQsCheckbox(page, 'Run', 'drawing', true)

  await page.evaluate(() => window.sentientRockets.setPaused(false))
  await page.waitForFunction(() => window.sentientRockets.getGeneration() >= 2, null, { timeout: 45000 })
  const generation = await page.evaluate(() => window.sentientRockets.getGeneration())
  expect(generation).toBeGreaterThanOrEqual(2)
  await expect(page.locator('#generationLabel')).toContainText(/Generation #/)
  await expect(page.locator('#statusLabel')).toContainText(/last best/)
  await expect(page.locator('#statusLabel')).toContainText(/avg/)

  await qsButton(page, 'Reset').click()
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getGeneration())).toBe(1)
  await expect(page.locator('#generationLabel')).toContainText(/Generation #1/)

  await page.locator('#canvasDiv canvas').click({ position: { x: 470, y: 580 } })
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getPaused())).toBe(true)
  await page.locator('#canvasDiv canvas').click({ position: { x: 470, y: 580 } })
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getPaused())).toBe(false)

  assertNoProblems(problems)
})

test('rockets collide with obstacles and can reach the target', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)

  const result = await page.evaluate(() => {
    const { Population, Stage } = window.sentientRockets
    const targetRocket = Population.rockets[0]
    const wallRocket = Population.rockets[1]
    const wall = Stage.objects[0]
    targetRocket.flying = true
    targetRocket.success = false
    targetRocket.crashed = false
    targetRocket.pos.set(Stage.target.x, Stage.target.y)
    targetRocket.update()
    wallRocket.flying = true
    wallRocket.success = false
    wallRocket.crashed = false
    wallRocket.pos.set(wall.rx + 2, wall.ry + 2)
    wallRocket.update()
    return {
      success: targetRocket.success,
      targetFlying: targetRocket.flying,
      crashed: wallRocket.crashed,
      wallFlying: wallRocket.flying,
      objectCount: Stage.objects.length,
    }
  })

  expect(result.success).toBe(true)
  expect(result.targetFlying).toBe(false)
  expect(result.crashed).toBe(true)
  expect(result.wallFlying).toBe(false)
  expect(result.objectCount).toBeGreaterThan(0)
  assertNoProblems(problems)
})

test('loading another stage and resizing the window keep the sim running', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)

  await qsSelect(page, 'Stage', 'scenesList').selectOption('wide-gap')
  await qsButton(page, 'Load Scene').click()
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getScene())).toBe('wide-gap')
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getStatus())).toContain('wide-gap')

  await expandPhysics(page)
  await qsRange(page, 'Physics', 'rocketMass').fill('2')
  await expect.poll(() => page.evaluate(() => window.sentientRockets.config.physics.rocketMass)).toBe(2)

  await page.setViewportSize({ width: 1100, height: 720 })
  await page.waitForTimeout(200)
  await expect(page.locator('canvas')).toBeVisible()
  await expect(qsPanel(page, 'Brains')).toBeVisible()
  await expect(qsPanel(page, 'Run')).toBeVisible()

  assertNoProblems(problems)
})

test('opens from the default sim path', async ({ page }) => {
  const problems = collectPageProblems(page)
  await page.goto('/index.html')
  await page.waitForFunction(() => window.sentientRockets && document.querySelector('canvas'))
  await expect(page.locator('canvas')).toBeVisible()
  expect(page.url()).toContain('index.html')
  assertNoProblems(problems)
})
