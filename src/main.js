import { applyQueryConfig, config } from './config.js'
import { parseBrainFile } from './core/brain.js'
import { NeuralNetwork } from './neuralNetwork/neural-network.js'
import { Population } from './population.js'
import { Stage } from './stage.js'

var paused = false
var guiStage
var guiPhysics
var scenesList
var generationP
var lifeP
var statusP
var logP
var framesCounter = 0
var generationCounter = 1
var drawing = true
var lastLoadedBrain = null
var bootScene = 'corridor'

const queryOptions = applyQueryConfig(typeof location !== 'undefined' ? location.search : '')
bootScene = queryOptions.scene || 'corridor'

function setup() {
  const canvas = createCanvas(500, 600)
  canvas.parent('canvasDiv')

  Stage.initialize(bootScene)
  Population.initialize()
  createUI()
  refreshSceneSelect()
  setStatus('Training. Scene: ' + (Stage.name || bootScene))
}

function draw() {
  if (paused) return
  if (drawing) background(0)
  Population.run(drawing, framesCounter)

  const simulationFinished = Population.simulationFinished(framesCounter)
  if (skipFrames(15)) {
    const modeLabel = Population.mode === 'evaluate' ? 'Evaluation' : 'Generation'
    generationP.html(modeLabel + ' #' + generationCounter)
    lifeP.html('Frame: ' + framesCounter + ' - ' + frameRate().toFixed(1))
  }

  framesCounter++
  Stage.draw(drawing)

  if (simulationFinished && !paused) {
    paused = true
    Population.evaluate().then((report) => {
      if (Population.mode === 'evaluate') {
        setStatus(
          'Evaluation done. Best fitness ' +
            report.best.toFixed(3) +
            ', avg ' +
            report.avg.toFixed(3) +
            ', reached target ' +
            report.success +
            '/' +
            report.size
        )
        statusP.html(
          'Evaluate: best ' +
            report.best.toFixed(3) +
            ' | avg ' +
            report.avg.toFixed(3) +
            ' | success ' +
            report.success +
            '/' +
            report.size
        )
        return
      }
      framesCounter = 0
      generationCounter++
      paused = false
      setStatus('Training generation #' + generationCounter + ' on ' + (Stage.name || 'scene'))
    })
  }
}

function mouseClicked(e) {
  if (e && e.target && e.target.tagName === 'CANVAS') {
    paused = !paused
  }
}

function skipFrames(frames) {
  return framesCounter % frames === 0
}

function setStatus(text) {
  const el = document.getElementById('brainStatus')
  if (el) el.textContent = text
}

function refreshSceneSelect() {
  const select = document.getElementById('sceneSelect')
  if (!select) return
  const names = Stage.listScenes()
  scenesList = names
  select.innerHTML = names
    .map((name) => '<option value="' + name + '"' + (name === Stage.name ? ' selected' : '') + '>' + name + '</option>')
    .join('')
}

function restartRun(options = {}) {
  framesCounter = 0
  generationCounter = 1
  paused = false
  if (options.brain) {
    Population.loadBrain(options.brain, options)
  } else {
    Population.initialize({ mode: options.mode || 'train' })
  }
}

function loadSelectedScene() {
  const select = document.getElementById('sceneSelect')
  const sceneName = (select && select.value) || scenesList || bootScene
  Stage.loadByName(sceneName)
  if (Population.mode === 'evaluate' && lastLoadedBrain) {
    restartRun({ brain: lastLoadedBrain, mode: 'evaluate' })
    setStatus('Loaded scene ' + sceneName + '. Evaluating the imported brain.')
  } else if (Population.mode === 'train' && lastLoadedBrain && Population.loadedBrain) {
    restartRun({ brain: lastLoadedBrain, mode: 'train', mutate: true })
    setStatus('Loaded scene ' + sceneName + '. Continuing from the imported brain.')
  } else {
    restartRun({ mode: 'train' })
    setStatus('Loaded scene ' + sceneName + '. Training from random brains.')
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
  setStatus('Exported best brain from ' + (Stage.name || 'the current scene') + '.')
  return data
}

function importBrainData(data, mode) {
  const brain = parseBrainFile(data)
  lastLoadedBrain = brain
  restartRun({
    brain,
    mode: mode || 'evaluate',
    mutate: mode === 'train',
  })
  setStatus(
    mode === 'train'
      ? 'Loaded brain. Continuing training from those weights.'
      : 'Loaded brain. Evaluating with no evolution.'
  )
  statusP.html(mode === 'train' ? 'Mode: continue training' : 'Mode: evaluate')
  return brain
}

function loadBrainFromFile(file, mode) {
  return file.text().then((text) => importBrainData(text, mode))
}

function evaluateLoadedBrain() {
  if (!lastLoadedBrain) {
    setStatus('Load a brain file first.')
    return
  }
  restartRun({ brain: lastLoadedBrain, mode: 'evaluate' })
  setStatus('Evaluating the loaded brain. No mutation this run.')
}

function continueFromLoadedBrain() {
  if (!lastLoadedBrain) {
    setStatus('Load a brain file first.')
    return
  }
  restartRun({ brain: lastLoadedBrain, mode: 'train', mutate: false })
  setStatus('Continuing training from the loaded brain, not random weights.')
}

function createUI() {
  guiStage = createGui('Stage').setPosition(5, 5)
  const qsControls = guiStage.getQS()
  qsControls.addHTML(
    'How to use',
    'Pick a scene on the right, train, then export the best brain. Load that file in another scene to evaluate it or keep training.'
  )
  scenesList = Stage.listScenes()
  window.scenesList = scenesList
  guiStage.addGlobals('scenesList')
  guiStage.addComponent({
    label: 'Load Scene',
    callback: loadSelectedScene,
  })

  sliderRange(0, Math.max(width, height), 0.0001)
  guiPhysics = createGui('Physics (double click to expand)').setPosition(width - 200, 5)
  guiPhysics.addObject({ ...config.physics, ...config.physicsRanges })
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

  const sceneSelect = document.getElementById('sceneSelect')
  const loadSceneBtn = document.getElementById('loadSceneBtn')
  const exportBtn = document.getElementById('exportBrain')
  const importBtn = document.getElementById('importBrain')
  const brainFile = document.getElementById('brainFile')
  const evaluateBtn = document.getElementById('evaluateBrain')
  const continueBtn = document.getElementById('continueBrain')

  if (loadSceneBtn) loadSceneBtn.addEventListener('click', loadSelectedScene)
  if (sceneSelect) {
    sceneSelect.addEventListener('change', () => {
      scenesList = sceneSelect.value
    })
  }
  if (exportBtn) exportBtn.addEventListener('click', exportBestBrain)
  if (importBtn && brainFile) {
    importBtn.addEventListener('click', () => brainFile.click())
    brainFile.addEventListener('change', () => {
      const file = brainFile.files && brainFile.files[0]
      if (!file) return
      loadBrainFromFile(file, 'evaluate').finally(() => {
        brainFile.value = ''
      })
    })
  }
  if (evaluateBtn) evaluateBtn.addEventListener('click', evaluateLoadedBrain)
  if (continueBtn) continueBtn.addEventListener('click', continueFromLoadedBrain)
}

window.setup = setup
window.draw = draw
window.mouseClicked = mouseClicked

window.sentientRockets = {
  getGeneration: () => generationCounter,
  getMode: () => Population.mode,
  getScene: () => Stage.name,
  getReport: () => Population.lastReport,
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
    const select = document.getElementById('sceneSelect')
    if (select) select.value = name
    loadSelectedScene()
  },
  config,
  Population,
  Stage,
  NeuralNetwork,
}
