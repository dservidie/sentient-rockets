import { expect, test } from '@playwright/test'
import fs from 'node:fs'

function collectPageProblems(page) {
  const problems = []
  page.on('pageerror', (error) => {
    problems.push(error.message)
  })
  page.on('console', (msg) => {
    if (msg.type() !== 'error') return
    const text = msg.text()
    if (text.includes('favicon.ico')) return
    if (text.includes('Failed to load resource') && text.includes('favicon')) return
    problems.push(text)
  })
  return problems
}

test('sim starts and generations advance without console errors', async ({ page }) => {
  const problems = collectPageProblems(page)
  await page.goto('/index.html?popSize=3&timeoutFrames=12&debug=0&scene=corridor')
  await page.waitForFunction(() => window.sentientRockets && document.querySelector('canvas'))
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.locator('#exportBrain')).toBeVisible()
  await expect(page.locator('#generationLabel')).toContainText(/Generation #1/)
  await page.waitForFunction(() => window.sentientRockets.getGeneration() >= 2, null, { timeout: 45000 })
  await expect(page.locator('#generationLabel')).toContainText(/Generation #2/)
  expect(problems, problems.join('\n')).toEqual([])
})

test('scene designer can add a barrier', async ({ page }) => {
  const problems = collectPageProblems(page)
  await page.goto('/scene-designer/index.html')
  await page.waitForFunction(() => window.sentientDesigner && document.querySelector('canvas'))
  await page.getByRole('button', { name: 'Add Barrier' }).click()
  const count = await page.evaluate(() => window.sentientDesigner.Stage.objects.length)
  expect(count).toBe(1)
  expect(problems, problems.join('\n')).toEqual([])
})

test('a trained brain can move from corridor to wide-gap', async ({ page }) => {
  const problems = collectPageProblems(page)
  await page.goto('/index.html?popSize=3&timeoutFrames=12&debug=0&mutationRate=0&scene=corridor')
  await page.waitForFunction(() => window.sentientRockets && document.querySelector('canvas'))
  await page.waitForFunction(() => window.sentientRockets.getGeneration() >= 2, null, { timeout: 45000 })

  const downloadPromise = page.waitForEvent('download')
  await page.locator('#exportBrain').click()
  const download = await downloadPromise
  const filePath = await download.path()
  const brain = JSON.parse(fs.readFileSync(filePath, 'utf8'))
  expect(brain.weights.length).toBeGreaterThan(0)
  expect(brain.input_nodes).toBe(8)

  await page.locator('#sceneSelect').selectOption('wide-gap')
  await page.locator('#loadSceneBtn').click()
  await expect(page.locator('#brainStatus')).toContainText('wide-gap')

  await page.locator('#brainFile').setInputFiles(filePath)
  await page.waitForFunction(() => window.sentientRockets.getMode() === 'evaluate')
  const afterLoad = await page.evaluate(() => ({
    mode: window.sentientRockets.getMode(),
    scene: window.sentientRockets.getScene(),
    fingerprint: window.sentientRockets.getFingerprint(),
    loaded: window.sentientRockets.getLoadedFingerprint(),
  }))
  expect(afterLoad.scene).toBe('wide-gap')
  expect(afterLoad.mode).toBe('evaluate')
  expect(afterLoad.fingerprint).toBe(afterLoad.loaded)

  await page.waitForFunction(() => window.sentientRockets.getReport(), null, { timeout: 45000 })
  const report = await page.evaluate(() => window.sentientRockets.getReport())
  expect(report.mode).toBe('evaluate')
  expect(report.size).toBe(3)

  await page.locator('#continueBrain').click()
  const continued = await page.evaluate(() => ({
    mode: window.sentientRockets.getMode(),
    fingerprint: window.sentientRockets.getFingerprint(),
    loaded: window.sentientRockets.getLoadedFingerprint(),
  }))
  expect(continued.mode).toBe('train')
  expect(continued.fingerprint).toBe(continued.loaded)
  expect(problems, problems.join('\n')).toEqual([])
})
