import { expect, test } from '@playwright/test'
import fs from 'node:fs'
import path from 'node:path'
import {
  assertNoProblems,
  collectPageProblems,
  expandPhysics,
  gotoSim,
  qsButton,
  qsFile,
  qsPanel,
  qsRange,
  qsSelect,
} from './helpers.js'

async function exportBrain(page) {
  const downloadPromise = page.waitForEvent('download')
  await qsButton(page, 'Export best brain').click()
  const download = await downloadPromise
  const filePath = await download.path()
  const brain = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  return { filePath, brain, suggested: download.suggestedFilename() }
}

test('export, import, evaluate and continue a brain across scenes', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)
  await page.waitForFunction(() => window.sentientRockets.getGeneration() >= 2, null, { timeout: 45000 })

  const { filePath, brain, suggested } = await exportBrain(page)
  expect(brain.weights.length).toBeGreaterThan(0)
  expect(brain.input_nodes).toBe(8)
  expect(brain.kind).toBe('sentient-rockets-brain')
  expect(suggested).toMatch(/brain-corridor/)
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('brain-last-export')))).toBe(true)

  await qsSelect(page, 'Stage', 'scenesList').selectOption('wide-gap')
  await qsButton(page, 'Load Scene').click()
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getScene())).toBe('wide-gap')

  await qsFile(page, 'Brains').setInputFiles(filePath)
  await page.waitForFunction(() => window.sentientRockets.getMode() === 'evaluate')
  const afterLoad = await page.evaluate(() => ({
    mode: window.sentientRockets.getMode(),
    scene: window.sentientRockets.getScene(),
    fingerprint: window.sentientRockets.getFingerprint(),
    loaded: window.sentientRockets.getLoadedFingerprint(),
    status: window.sentientRockets.getStatus(),
  }))
  expect(afterLoad.scene).toBe('wide-gap')
  expect(afterLoad.mode).toBe('evaluate')
  expect(afterLoad.fingerprint).toBe(afterLoad.loaded)
  expect(afterLoad.status).toMatch(/Evaluating/)

  await page.waitForFunction(() => window.sentientRockets.getReport(), null, { timeout: 45000 })
  const report = await page.evaluate(() => window.sentientRockets.getReport())
  expect(report.mode).toBe('evaluate')
  expect(report.size).toBe(3)

  await qsButton(page, 'Continue training from loaded').click()
  const continued = await page.evaluate(() => ({
    mode: window.sentientRockets.getMode(),
    fingerprint: window.sentientRockets.getFingerprint(),
    loaded: window.sentientRockets.getLoadedFingerprint(),
    status: window.sentientRockets.getStatus(),
  }))
  expect(continued.mode).toBe('train')
  expect(continued.fingerprint).toBe(continued.loaded)
  expect(continued.status).toMatch(/Continuing/)

  await qsSelect(page, 'Stage', 'scenesList').selectOption('corridor')
  await qsButton(page, 'Load Scene').click()
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getScene())).toBe('corridor')
  await qsButton(page, 'Evaluate loaded brain').click()
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getMode())).toBe('evaluate')
  await page.waitForFunction(() => window.sentientRockets.getReport(), null, { timeout: 45000 })
  const second = await page.evaluate(() => window.sentientRockets.getReport())
  expect(second.mode).toBe('evaluate')
  assertNoProblems(problems)
})

test('invalid and corrupt brain files show an error and keep training', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)
  await page.evaluate(() => window.sentientRockets.setPaused(true))

  await qsButton(page, 'Evaluate loaded brain').click()
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getStatus())).toContain('Load a brain file first')
  await qsButton(page, 'Continue training from loaded').click()
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getStatus())).toContain('Load a brain file first')

  await page.locator('[id="Load brain"]').setInputFiles({
    name: 'corrupt.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{'),
  })
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getStatus())).toContain('Could not load brain')
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getMode())).toBe('train')

  await page.locator('[id="Load brain"]').setInputFiles({
    name: 'empty-brain.json',
    mimeType: 'application/json',
    buffer: Buffer.from('{"foo":1}'),
  })
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getStatus())).toMatch(/topology|Could not load brain/)
  await expect.poll(() => page.evaluate(() => window.sentientRockets.getMode())).toBe('train')
  assertNoProblems(problems)
})

test('physics settings persist in localStorage across reload', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)
  await expandPhysics(page)
  await qsRange(page, 'Physics', 'rocketThrust').fill('0.12')
  await expect.poll(() => page.evaluate(() => window.sentientRockets.config.physics.rocketThrust)).toBe(0.12)
  await expect.poll(() => page.evaluate(() => Boolean(localStorage.getItem('qs_sentient-rockets-physics') || localStorage.getItem('sentient-rockets-physics')))).toBe(true)

  await page.reload()
  await page.waitForFunction(() => window.sentientRockets && document.querySelector('canvas'))
  await expect.poll(() => page.evaluate(() => Number(window.sentientRockets.config.physics.rocketThrust.toFixed(2)))).toBe(0.12)
  assertNoProblems(problems)
})

test('brains panel is a QuickSettings panel', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoSim(page)
  const panel = qsPanel(page, 'Brains')
  await expect(panel.locator('.qs_title_bar')).toHaveText(/Brains/)
  await expect(panel.locator('input[type="button"][value="Export best brain"]')).toBeVisible()
  await expect(panel.locator('input[type="file"]')).toHaveCount(1)
  const shotDir = '/opt/cursor/artifacts/screenshots'
  fs.mkdirSync(shotDir, { recursive: true })
  await panel.screenshot({ path: path.join(shotDir, 'brains-panel.png') })
  await page.screenshot({ path: path.join(shotDir, 'sim-quicksettings.png'), fullPage: true })
  assertNoProblems(problems)
})
