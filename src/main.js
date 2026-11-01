import { applyQueryConfig, config } from './config.js'
import { parseBrainFile } from './core/brain.js'
import { NeuralNetwork } from './neuralNetwork/neural-network.js'
import { Population } from './population.js'
import { Stage } from './stage.js'

var guiStage
var guiBrains
var guiRun
var guiPhysics
var qsBrains
var generationP
var lifeP
var statusP
var logP
var framesCounter = 0
var generationCounter = 1
var lastLoadedBrain = null
var bootScene = 'corridor'
var lastStatus = 'No brain loaded yet.'

window.scenesList = []
window.runSettings = {
  paused: false,
  debugMode: config.debugMode,
  drawing: true,
  simSpeed: 60,
  simSpeedMin: 5,
  simSpeedMax: 60,
  simSpeedStep: 1,
}

const queryOptions = applyQueryConfig(typeof location !== 'undefined' ? location.search : '')
bootScene = queryOptions.scene || 'corridor'
window.runSettings.debugMode = config.debugMode

function setup() {
  const canvas = createCanvas(500, 600)
  canvas.parent('canvasDiv')
  frameRate(window.runSettings.simSpeed)

  Stage.initialize(bootScene)
  Population.initialize()
  createUI()
  refreshScenesList()
  setBrainStatus('Training. Scene: ' + (Stage.name || bootScene))
}

function draw() {
  config.debugMode = window.runSettings.debugMode
  frameRate(window.runSettings.simSpeed)
  if (window.runSettings.paused) return

  if (window.runSettings.drawing) background(0)
  Population.run(window.runSettings.drawing, framesCounter)

  const simulationFinished = Population.simulationFinished(framesCounter)
  if (skipFrames(15)) {
    updateDisplay()
  }

  framesCounter++
  Stage.draw(window.runSettings.drawing)

  if (simulationFinished && !window.runSettings.paused) {
    window.runSettings.paused = true
    Population.evaluate().then((report) => {
      updateDisplay()
      if (Population.mode === 'evaluate') {
        setBrainStatus(
          'Evaluation done. Best fitness ' +
            report.best.toFixed(3) +
            ', avg ' +
            report.avg.toFixed(3) +
            ', reached target ' +
            report.success +
            '/' +
            report.size
        )
        return
      }
      framesCounter = 0
      generationCounter++
      window.runSettings.paused = false
      if (!String(lastStatus).startsWith('Could not load brain')) {
        setBrainStatus('Training generation #' + generationCounter + ' on ' + (Stage.name || 'scene'))
      }
    })
  }
}

function updateDisplay() {
  const modeLabel = Population.mode === 'evaluate' ? 'Evaluation' : 'Generation'
  const report = Population.lastReport
  generationP.html(modeLabel + ' #' + generationCounter)
  lifeP.html('Frame: ' + framesCounter + ' - ' + frameRate().toFixed(1))
  statusP.html(
    'Flying ' +
      Population.rockets.filter((rocket) => rocket.flying).length +
      ' | hit target ' +
      Population.successCounter +
      ' | crashed ' +
      Population.failedCounter +
      (report
        ? ' | last best ' + report.best.toFixed(3) + ' avg ' + report.avg.toFixed(3)
        : '')
  )
}

function mouseClicked(e) {
  if (e && e.target && e.target.tagName === 'CANVAS') {
    window.runSettings.paused = !window.runSettings.paused
    syncRunGui()
  }
}

function windowResized() {
  if (guiStage) guiStage.setPosition(5, 5)
  if (guiRun) guiRun.setPosition(210, 5)
  if (guiBrains) guiBrains.setPosition(5, 280)
  if (guiPhysics) guiPhysics.setPosition(Math.max(220, windowWidth - 220), 5)
}

function skipFrames(frames) {
  return framesCounter % frames === 0
}

function setBrainStatus(text) {
  lastStatus = text
  if (qsBrains) {
    qsBrains.setValue('Status', text)
  }
}

function syncRunGui() {
  if (!guiRun) return
  const qs = guiRun.getQS()
  if (qs && qs.setValue) {
    qs.setValue('paused', window.runSettings.paused)
  }
}

function updateDropDown(qs, title, names, selected) {
  if (!qs || !qs._controls || !qs._controls[title]) return selected
  const select = qs._controls[title].control
  const pick = names.indexOf(selected) >= 0 ? selected : names[0]
  select.innerHTML = ''
  names.forEach((name) => {
    const option = document.createElement('option')
    option.label = name
    option.innerText = name
    select.add(option)
  })
  select.selectedIndex = Math.max(0, names.indexOf(pick))
  return pick
}

function refreshScenesList() {
  const names = Stage.listScenes()
  const previous =
    typeof window.scenesList === 'string' && names.indexOf(window.scenesList) >= 0
      ? window.scenesList
      : Stage.name && names.indexOf(Stage.name) >= 0
        ? Stage.name
        : names[0]
  const qs = guiStage && guiStage.getQS()
  window.scenesList = updateDropDown(qs, 'scenesList', names, previous) || names[0]
}

function restartRun(options = {}) {
  framesCounter = 0
  generationCounter = 1
  window.runSettings.paused = false
  syncRunGui()
  if (options.brain) {
    Population.loadBrain(options.brain, options)
  } else {
    Population.initialize({ mode: options.mode || 'train' })
  }
  updateDisplay()
}

function resetSimulation() {
  const keepBrain = Population.mode !== 'train' && lastLoadedBrain
  restartRun(
    keepBrain
      ? { brain: lastLoadedBrain, mode: Population.mode, mutate: false }
      : { mode: 'train' }
  )
  setBrainStatus('Reset. Scene: ' + (Stage.name || bootScene))
}

function loadSelectedScene() {
  const sceneName = window.scenesList || bootScene
  Stage.loadByName(sceneName)
  if (Population.mode === 'evaluate' && lastLoadedBrain) {
    restartRun({ brain: lastLoadedBrain, mode: 'evaluate' })
    setBrainStatus('Loaded scene ' + sceneName + '. Evaluating the imported brain.')
  } else if (Population.mode === 'train' && lastLoadedBrain && Population.loadedBrain) {
    restartRun({ brain: lastLoadedBrain, mode: 'train', mutate: true })
    setBrainStatus('Loaded scene ' + sceneName + '. Continuing from the imported brain.')
  } else {
    restartRun({ mode: 'train' })
    setBrainStatus('Loaded scene ' + sceneName + '. Training from random brains.')
  }
}

function exportBestBrain() {
  const data = Population.exportBestBrain({
    scene: Stage.name,
    generation: generationCounter,
  })
  lastLoadedBrain = data
  try {
    localStorage.setItem('brain-last-export', JSON.stringify(data))
  } catch (err) {
    // ignore quota errors
  }
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.href = url
  link.download = 'brain-' + (Stage.name || 'scene') + '.json'
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
  setBrainStatus('Exported best brain from ' + (Stage.name || 'the current scene') + '.')
  return data
}

function importBrainData(data, mode) {
  let brain
  try {
    brain = parseBrainFile(data)
  } catch (err) {
    setBrainStatus('Could not load brain: ' + err.message)
    return null
  }
  lastLoadedBrain = brain
  try {
    localStorage.setItem('brain-last-import', JSON.stringify(brain))
  } catch (err) {
    // ignore quota errors
  }
  restartRun({
    brain,
    mode: mode || 'evaluate',
    mutate: mode === 'train',
  })
  setBrainStatus(
    mode === 'train'
      ? 'Loaded brain. Continuing training from those weights.'
      : 'Loaded brain. Evaluating with no evolution.'
  )
  return brain
}

function loadBrainFromFile(file, mode) {
  return file.text().then((text) => importBrainData(text, mode))
}

function evaluateLoadedBrain() {
  if (!lastLoadedBrain) {
    setBrainStatus('Load a brain file first.')
    return
  }
  restartRun({ brain: lastLoadedBrain, mode: 'evaluate' })
  setBrainStatus('Evaluating the loaded brain. No mutation this run.')
}

function continueFromLoadedBrain() {
  if (!lastLoadedBrain) {
    setBrainStatus('Load a brain file first.')
    return
  }
  restartRun({ brain: lastLoadedBrain, mode: 'train', mutate: false })
  setBrainStatus('Continuing training from the loaded brain, not random weights.')
}

function createUI() {
  Object.assign(config.physics, config.physicsRanges)

  guiStage = createGui('Stage').setPosition(5, 5)
  const qsStage = guiStage.getQS()
  qsStage.addHTML(
    'How to use',
    'Pick a scene, train, then export the best brain. Load that file in another scene to evaluate it or keep training.'
  )
  window.scenesList = Stage.listScenes()
  guiStage.addGlobals('scenesList')
  guiStage.addComponent({ label: 'Load Scene', callback: loadSelectedScene })
  guiStage.addComponent({ label: 'Reset', callback: resetSimulation })

  guiBrains = createGui('Brains').setPosition(5, 280)
  qsBrains = guiBrains.getQS()
  qsBrains.addHTML(
    'How to use',
    'Export a trained brain, then load it in another scene. Evaluate runs it as-is. Continue training mutates from those weights.'
  )
  qsBrains.addHTML('Status', lastStatus)
  guiBrains.addComponent({ label: 'Export best brain', callback: exportBestBrain })
  qsBrains.addFileChooser('Load brain', 'Choose JSON', '.json,application/json', (file) => {
    if (!file) return
    loadBrainFromFile(file, 'evaluate')
  })
  guiBrains.addComponent({ label: 'Evaluate loaded brain', callback: evaluateLoadedBrain })
  guiBrains.addComponent({ label: 'Continue training from loaded', callback: continueFromLoadedBrain })

  guiRun = createGui('Run').setPosition(210, 5)
  guiRun.addObject(window.runSettings, 'paused', 'debugMode', 'drawing', 'simSpeed')

  sliderRange(0, Math.max(width, height), 0.0001)
  guiPhysics = createGui('Physics (double click to expand)').setPosition(width - 200, 5)
  guiPhysics.addObject(config.physics)
  const qsPhysics = guiPhysics.getQS()
  qsPhysics.saveInLocalStorage('sentient-rockets-physics')
  qsPhysics.collapse()

  generationP = createP()
  lifeP = createP()
  statusP = createP()
  logP = createP('')
  generationP.id('generationLabel')
  lifeP.id('frameLabel')
  statusP.id('statusLabel')
  generationP.parent('display')
  lifeP.parent('display')
  statusP.parent('display')
  logP.parent('display')

  updateDisplay()
}

window.setup = setup
window.draw = draw
window.mouseClicked = mouseClicked
window.windowResized = windowResized

window.sentientRockets = {
  getGeneration: () => generationCounter,
  getFrames: () => framesCounter,
  getMode: () => Population.mode,
  getScene: () => Stage.name,
  getPaused: () => window.runSettings.paused,
  getStatus: () => lastStatus,
  getReport: () => Population.lastReport,
  getCounters: () => ({
    flying: Population.rockets.filter((rocket) => rocket.flying).length,
    success: Population.successCounter,
    crashed: Population.failedCounter,
  }),
  getFingerprint: () => {
    const rocket = Population.rockets[0]
    return rocket ? rocket.neuralNetwork.fingerprint() : null
  },
  getLoadedFingerprint: () => (lastLoadedBrain ? NeuralNetwork.fromJSON(lastLoadedBrain).fingerprint() : null),
  getFingerprints: () => Population.fingerprints(),
  exportBestBrainJson: () =>
    Population.exportBestBrain({
      scene: Stage.name,
      generation: generationCounter,
    }),
  importBrainJson: (data, mode) => importBrainData(data, mode),
  loadScene: (name) => {
    window.scenesList = name
    loadSelectedScene()
  },
  reset: resetSimulation,
  setPaused: (value) => {
    window.runSettings.paused = Boolean(value)
    syncRunGui()
  },
  refreshScenesList,
  runSettings: window.runSettings,
  config,
  Population,
  Stage,
  NeuralNetwork,
}
