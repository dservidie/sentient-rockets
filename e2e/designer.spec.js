import { expect, test } from '@playwright/test'
import {
  assertNoProblems,
  collectPageProblems,
  dragCanvas,
  gotoDesigner,
  qsButton,
  qsPanel,
  qsRange,
  qsSelect,
  qsText,
} from './helpers.js'

test('designer page exposes every QuickSettings control', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoDesigner(page)

  await expect(qsPanel(page, 'Controls')).toBeVisible()
  await expect(qsText(page, 'Controls', 'currentSceneName')).toBeVisible()
  await expect(qsSelect(page, 'Controls', 'scenesList')).toBeVisible()
  await expect(qsSelect(page, 'Controls', 'sceneAction')).toBeVisible()
  await expect(qsButton(page, 'Execute Action')).toBeVisible()
  await expect(qsButton(page, 'Add Barrier')).toBeVisible()
  await expect(qsButton(page, 'Save Scene')).toBeVisible()
  await expect(qsButton(page, 'Delete selected')).toBeVisible()
  assertNoProblems(problems)
})

test('placing, moving and deleting obstacles and the target', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoDesigner(page)

  await qsButton(page, 'Add Barrier').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.objects.length)).toBe(1)

  const before = await page.evaluate(() => {
    const barrier = window.sentientDesigner.Stage.objects[0]
    return { rx: barrier.rx, ry: barrier.ry, id: barrier.id }
  })
  await page.evaluate(() => window.sentientDesigner.selectAt(275, 325))
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.getSelected()?.id)).toBe(before.id)
  await expect(qsPanel(page, 'Barrier Properties')).toBeVisible()
  await qsRange(page, 'Barrier Properties', 'rw').fill('80')
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.objects[0].rw)).toBe(80)

  await dragCanvas(page, before.rx + 10, before.ry + 10, before.rx + 70, before.ry + 40)
  const moved = await page.evaluate(() => {
    const barrier = window.sentientDesigner.Stage.objects[0]
    return { rx: barrier.rx, ry: barrier.ry }
  })
  expect(moved.rx).not.toBe(before.rx)

  await qsButton(page, 'Delete selected').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.objects.length)).toBe(0)

  await page.evaluate(() => window.sentientDesigner.selectAt(250, 50))
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.getSelected()?.kind)).toBe('target')
  await expect(qsPanel(page, 'Target Properties')).toBeVisible()
  await qsRange(page, 'Target Properties', 'x').fill('300')
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.getTarget().x)).toBe(300)

  await dragCanvas(page, 300, 50, 330, 90)
  const targetMoved = await page.evaluate(() => window.sentientDesigner.getTarget())
  expect(targetMoved.x).not.toBe(300)

  await qsButton(page, 'Delete selected').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.getTarget())).toEqual({ x: 250, y: 50 })
  assertNoProblems(problems)
})

test('saving, loading and switching stages in the dojo', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoDesigner(page)

  await qsSelect(page, 'Controls', 'scenesList').selectOption('corridor')
  await qsSelect(page, 'Controls', 'sceneAction').selectOption('Load selected Scene')
  await qsButton(page, 'Execute Action').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.name)).toBe('corridor')
  const corridorCount = await page.evaluate(() => window.sentientDesigner.Stage.objects.length)
  expect(corridorCount).toBeGreaterThan(0)

  await qsSelect(page, 'Controls', 'scenesList').selectOption('wide-gap')
  await qsButton(page, 'Execute Action').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.name)).toBe('wide-gap')

  await qsSelect(page, 'Controls', 'sceneAction').selectOption('Create New')
  await qsButton(page, 'Execute Action').click()
  const createdName = await page.evaluate(() => window.sentientDesigner.getSceneName())
  expect(createdName).toMatch(/^new-scene-/)
  await qsText(page, 'Controls', 'currentSceneName').fill('e2e-dojo')
  await qsButton(page, 'Save Scene').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.getStatus())).toContain('Saved scene e2e-dojo')
  await expect(qsSelect(page, 'Controls', 'scenesList').locator('option', { hasText: 'e2e-dojo' })).toHaveCount(1)

  await qsSelect(page, 'Controls', 'scenesList').selectOption('corridor')
  await qsSelect(page, 'Controls', 'sceneAction').selectOption('Load selected Scene')
  await qsButton(page, 'Execute Action').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.name)).toBe('corridor')

  await qsSelect(page, 'Controls', 'scenesList').selectOption('e2e-dojo')
  await qsButton(page, 'Execute Action').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.name)).toBe('e2e-dojo')

  const downloadPromise = page.waitForEvent('download')
  await qsSelect(page, 'Controls', 'sceneAction').selectOption('Download selected Scene')
  await qsButton(page, 'Execute Action').click()
  const download = await downloadPromise
  expect(download.suggestedFilename()).toMatch(/e2e-dojo/)

  await qsSelect(page, 'Controls', 'sceneAction').selectOption('Delete Scene')
  await qsButton(page, 'Execute Action').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.getStatus())).toContain('Deleted scene e2e-dojo')
  await expect(qsSelect(page, 'Controls', 'scenesList').locator('option', { hasText: 'e2e-dojo' })).toHaveCount(0)

  await qsSelect(page, 'Controls', 'scenesList').selectOption('corridor')
  await qsSelect(page, 'Controls', 'sceneAction').selectOption('Delete Scene')
  await qsButton(page, 'Execute Action').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.getStatus())).toContain('Cannot delete a built-in scene')

  await page.setViewportSize({ width: 1000, height: 700 })
  await page.waitForTimeout(200)
  await expect(qsPanel(page, 'Controls')).toBeVisible()
  await expect(page.locator('canvas')).toBeVisible()
  assertNoProblems(problems)
})

test('designer localStorage keeps a saved scene after reload', async ({ page }) => {
  const problems = collectPageProblems(page)
  await gotoDesigner(page)
  await qsButton(page, 'Add Barrier').click()
  await qsText(page, 'Controls', 'currentSceneName').fill('persist-dojo')
  await qsButton(page, 'Save Scene').click()
  await expect.poll(() => page.evaluate(() => localStorage.getItem('scene-persist-dojo'))).toBeTruthy()

  await page.reload()
  await page.waitForFunction(() => window.sentientDesigner && document.querySelector('canvas'))
  await qsSelect(page, 'Controls', 'scenesList').selectOption('persist-dojo')
  await qsSelect(page, 'Controls', 'sceneAction').selectOption('Load selected Scene')
  await qsButton(page, 'Execute Action').click()
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.name)).toBe('persist-dojo')
  await expect.poll(() => page.evaluate(() => window.sentientDesigner.Stage.objects.length)).toBe(1)
  assertNoProblems(problems)
})
