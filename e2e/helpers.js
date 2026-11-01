import { expect } from '@playwright/test'

export const SIM_QUERY = '/index.html?popSize=3&timeoutFrames=12&debug=0&scene=corridor'

export function collectPageProblems(page) {
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

export function qsPanel(page, title) {
  return page.locator('.qs_main').filter({ has: page.locator('.qs_title_bar', { hasText: title }) })
}

export function qsButton(page, label) {
  return page.locator(`input[type="button"][value="${label}"]`)
}

export function qsCheckbox(page, panelTitle, label) {
  return qsPanel(page, panelTitle)
    .locator('.qs_container')
    .filter({ hasText: label })
    .locator('input[type="checkbox"]')
}

export async function setQsCheckbox(page, panelTitle, label, checked) {
  const input = qsCheckbox(page, panelTitle, label)
  if ((await input.isChecked()) === checked) return
  await qsPanel(page, panelTitle)
    .locator('.qs_container')
    .filter({ hasText: label })
    .locator('label.qs_checkbox')
    .click()
}

export function qsRange(page, panelTitle, label) {
  return qsPanel(page, panelTitle)
    .locator('.qs_container')
    .filter({ hasText: label })
    .locator('input[type="range"]')
}

export function qsSelect(page, panelTitle, label) {
  const panel = qsPanel(page, panelTitle)
  const labeled = panel.locator('.qs_container').filter({ hasText: label }).locator('select')
  return labeled
}

export function qsText(page, panelTitle, label) {
  return qsPanel(page, panelTitle)
    .locator('.qs_container')
    .filter({ hasText: label })
    .locator('input[type="text"]')
}

export function qsFile(page, panelTitle) {
  return qsPanel(page, panelTitle).locator('input[type="file"]')
}

export async function gotoSim(page, query = SIM_QUERY) {
  await page.goto(query)
  await page.waitForFunction(() => window.sentientRockets && document.querySelector('canvas'))
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.locator('.qs_title_bar', { hasText: 'Brains' })).toBeVisible()
}

export async function gotoDesigner(page) {
  await page.goto('/scene-designer/index.html')
  await page.waitForFunction(() => window.sentientDesigner && document.querySelector('canvas'))
  await expect(page.locator('canvas')).toBeVisible()
  await expect(page.locator('.qs_title_bar', { hasText: 'Controls' })).toBeVisible()
}

export async function clickCanvas(page, x, y) {
  const canvas = page.locator('#canvasDiv canvas')
  const box = await canvas.boundingBox()
  await page.mouse.click(box.x + x, box.y + y)
}

export async function dragCanvas(page, fromX, fromY, toX, toY) {
  const canvas = page.locator('#canvasDiv canvas')
  const box = await canvas.boundingBox()
  await page.mouse.move(box.x + fromX, box.y + fromY)
  await page.mouse.down()
  await page.mouse.move(box.x + toX, box.y + toY, { steps: 8 })
  await page.mouse.up()
}

export async function expandPhysics(page) {
  const title = qsPanel(page, 'Physics').locator('.qs_title_bar')
  await title.dblclick()
  const slider = qsRange(page, 'Physics', 'rocketMass')
  try {
    await slider.waitFor({ state: 'visible', timeout: 1500 })
  } catch (err) {
    await title.click()
    await slider.waitFor({ state: 'visible', timeout: 1500 })
  }
}

export function assertNoProblems(problems) {
  expect(problems, problems.join('\n')).toEqual([])
}
