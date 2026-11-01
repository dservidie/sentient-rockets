import { Barrier } from '../../src/barrier.js'
import { builtinScenes, defaultTarget } from '../../src/core/scenes.js'
import { Stage } from '../../src/stage.js'

var guiControls
var selectedObjectParametersGui
var selectedObjectParametersQS
var qsControls

var selectedObject
var locked = false
var draggingObject
var mousePreviousX
var mousePreviousY
var lastStatus = 'Ready.'
var logP

window.currentSceneName = ''
window.scenesList = []
window.sceneAction = [
  'Load selected Scene',
  'Create New',
  'Download selected Scene',
  'Delete Scene',
]

function setup() {
  const canvas = createCanvas(500, 600)
  canvas.parent('canvasDiv')
  Stage.initialize()
  createUI()
  refreshScenesList()
  setStatus('Add barriers, drag them, then save the scene.')
}

function draw() {
  background(0)

  if (!locked) {
    draggingObject = hitTest(mouseX, mouseY)
    for (const obj of Stage.objects) {
      obj.color = obj === draggingObject ? 'Gainsboro' : 'White'
    }
  }

  if (logP) {
    logP.html(
      'Selected: ' +
        describeObject(selectedObject) +
        '<br>Dragging: ' +
        describeObject(draggingObject)
    )
  }

  Stage.draw(true)
  drawTargetHighlight()
}

function drawTargetHighlight() {
  if (!draggingObject || draggingObject.kind !== 'target') return
  noFill()
  stroke('PaleGreen')
  strokeWeight(2)
  ellipse(Stage.target.x, Stage.target.y, 22, 22)
  noStroke()
}

function isTargetHit(px, py) {
  return dist(px, py, Stage.target.x, Stage.target.y) <= 12
}

function getTargetHandle() {
  return {
    kind: 'target',
    id: 'target',
    get rx() {
      return Stage.target.x
    },
    set rx(value) {
      Stage.target.x = Number(value)
    },
    get ry() {
      return Stage.target.y
    },
    set ry(value) {
      Stage.target.y = Number(value)
    },
    isCollidingWithPoint: isTargetHit,
  }
}

function hitTest(px, py) {
  if (isTargetHit(px, py)) return getTargetHandle()
  for (const obj of Stage.objects.slice().reverse()) {
    if (obj.isCollidingWithPoint(px, py)) return obj
  }
  return null
}

function describeObject(obj) {
  if (!obj) return 'none'
  if (obj.kind === 'target') {
    return JSON.stringify({ kind: 'target', x: Stage.target.x, y: Stage.target.y })
  }
  return JSON.stringify({ id: obj.id, rx: obj.rx, ry: obj.ry, rw: obj.rw, rh: obj.rh })
}

function mousePressed(e) {
  if (!e || !e.target || e.target.tagName !== 'CANVAS') return
  if (draggingObject) {
    locked = true
    selectedObject = draggingObject.kind === 'target' ? getTargetHandle() : draggingObject
    if (selectedObject.kind !== 'target') selectedObject.color = 'PaleGreen'
    onSelectedObject()
  } else {
    locked = false
    selectedObject = null
    onLeaveSelectedObject()
  }
  mousePreviousX = mouseX
  mousePreviousY = mouseY
}

function mouseDragged() {
  if (locked && draggingObject) {
    const dx = mouseX - mousePreviousX
    const dy = mouseY - mousePreviousY
    if (draggingObject.kind === 'target') {
      Stage.target.x += dx
      Stage.target.y += dy
    } else {
      draggingObject.rx += dx
      draggingObject.ry += dy
    }
    mousePreviousX = mouseX
    mousePreviousY = mouseY
  }
}

function mouseReleased() {
  locked = false
}

function onSelectedObject() {
  destroySelectedObjectParametersGui()
  if (!selectedObject) return

  if (selectedObject.kind === 'target') {
    selectedObjectParametersGui = createGui('Target Properties')
    selectedObjectParametersQS = selectedObjectParametersGui.getQS()
    Stage.target.xMin = 0
    Stage.target.xMax = width
    Stage.target.xStep = 1
    Stage.target.yMin = 0
    Stage.target.yMax = height
    Stage.target.yStep = 1
    selectedObjectParametersGui.addObject(Stage.target, 'x', 'y')
  } else {
    selectedObjectParametersGui = createGui('Barrier Properties: id ' + selectedObject.id)
    selectedObjectParametersQS = selectedObjectParametersGui.getQS()
    selectedObject.rwMin = 20
    selectedObject.rwMax = width
    selectedObject.rhMin = 20
    selectedObject.rhMax = height
    selectedObjectParametersGui.addObject(selectedObject, 'rw', 'rh')
  }

  selectedObjectParametersGui.setPosition(
    width - 200,
    height - (selectedObjectParametersQS._panel.offsetHeight || 160)
  )
}

function onLeaveSelectedObject() {
  destroySelectedObjectParametersGui()
}

function destroySelectedObjectParametersGui() {
  if (!selectedObjectParametersGui) return
  selectedObjectParametersGui.destroy()
  selectedObjectParametersGui = null
  selectedObjectParametersQS = null
}

function setStatus(text) {
  lastStatus = text
  if (qsControls) qsControls.setValue('Status', text)
}

function syncSceneGui() {
  if (!qsControls) return
  const names = Stage.listScenes()
  const sceneName = Stage.name || window.currentSceneName || names[0]
  window.currentSceneName = sceneName
  if (names.indexOf(window.scenesList) < 0) {
    window.scenesList = names.indexOf(sceneName) >= 0 ? sceneName : names[0]
  }
  try {
    qsControls.setValue('currentSceneName', window.currentSceneName)
  } catch (err) {
    // control might not exist yet
  }
  const index = names.indexOf(window.scenesList)
  if (index >= 0) {
    try {
      qsControls.setValue('scenesList', { index })
    } catch (err) {
      // dropdown might not exist yet
    }
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
  window.scenesList = updateDropDown(qsControls, 'scenesList', names, previous) || names[0]
}

function executeAction() {
  switch (window.sceneAction) {
    case 'Create New':
      createNewScene()
      break
    case 'Load selected Scene':
      loadScene(window.scenesList)
      break
    case 'Download selected Scene':
      downloadScene()
      break
    case 'Delete Scene':
      deleteSelectedScene()
      break
    default:
      break
  }
}

function createNewScene() {
  Stage.name = 'new-scene-' + Date.now().toString()
  Stage.objects = []
  const target = defaultTarget(width, height)
  Stage.target = createVector(target.x, target.y)
  Stage.addBarrier(new Barrier(90, 175, 150, 50))
  Stage.addBarrier(new Barrier(200, 0, 110, 50))
  Stage.addBarrier(new Barrier(200, 390, 110, 50))
  Stage.addBarrier(new Barrier(330, 175, 150, 50))
  Stage.addBarrier(new Barrier(450, 0, 210, 150))
  Stage.addBarrier(new Barrier(450, 290, 210, 150))
  window.currentSceneName = Stage.name
  selectedObject = null
  onLeaveSelectedObject()
  syncSceneGui()
  setStatus('Created ' + Stage.name + '. Save it to keep it.')
}

function addBarrier() {
  const barrier = Stage.addBarrier(new Barrier(height / 2, width / 2))
  setStatus('Added barrier ' + barrier.id)
  return barrier
}

function loadScene(sceneName) {
  const name = sceneName || window.scenesList
  Stage.loadByName(name)
  window.currentSceneName = Stage.name
  window.scenesList = Stage.name
  selectedObject = null
  onLeaveSelectedObject()
  syncSceneGui()
  setStatus('Loaded scene ' + Stage.name)
}

function saveScene() {
  const name = String(window.currentSceneName || Stage.name || '').trim()
  if (!name) {
    setStatus('Name the scene before saving.')
    return
  }
  Stage.name = name
  window.currentSceneName = name
  Stage.saveCurrent()
  refreshScenesList()
  window.scenesList = name
  syncSceneGui()
  setStatus('Saved scene ' + name)
}

function downloadScene() {
  const name = String(window.currentSceneName || Stage.name || 'scene').trim() || 'scene'
  Stage.name = name
  const sceneJson = Stage.toJSON()
  save(JSON.parse(sceneJson), 'scene-' + name.replace(/ /g, '-') + '.json', true)
  setStatus('Downloaded scene ' + name)
}

function deleteSelectedScene() {
  const name = typeof window.scenesList === 'string' ? window.scenesList : window.currentSceneName
  if (builtinScenes[name]) {
    setStatus('Cannot delete a built-in scene')
    return
  }
  try {
    Stage.deleteStored(name)
  } catch (err) {
    setStatus(err.message)
    return
  }
  refreshScenesList()
  loadScene('corridor')
  setStatus('Deleted scene ' + name)
}

function deleteSelected() {
  if (!selectedObject) {
    setStatus('Select a barrier or the target first.')
    return
  }
  if (selectedObject.kind === 'target') {
    Stage.resetTarget()
    selectedObject = getTargetHandle()
    onSelectedObject()
    setStatus('Target reset to the default position.')
    return
  }
  Stage.removeBarrier(selectedObject)
  setStatus('Deleted barrier ' + selectedObject.id)
  selectedObject = null
  draggingObject = null
  onLeaveSelectedObject()
}

function createUI() {
  sliderRange(0, Math.max(width, height), 1)
  guiControls = createGui('Controls').setPosition(5, 5)
  qsControls = guiControls.getQS()
  qsControls.addHTML(
    'How to use',
    'Add barriers, click to select, drag to move. The green circle is the target. Save a scene, then load it in the dojo or the sim.'
  )
  qsControls.addHTML('Status', lastStatus)
  window.scenesList = Stage.listScenes()
  guiControls.addGlobals('currentSceneName', 'scenesList', 'sceneAction')
  guiControls.addComponent({
    label: 'Execute Action',
    callback: executeAction,
  })
  guiControls.addComponent({
    label: 'Add Barrier',
    callback: addBarrier,
  })
  guiControls.addComponent({
    label: 'Save Scene',
    callback: saveScene,
  })
  guiControls.addComponent({
    label: 'Delete selected',
    callback: deleteSelected,
  })

  logP = createP('')
  logP.id('designerLog')
  logP.parent('display')
}

function windowResized() {
  if (guiControls) guiControls.setPosition(5, 5)
  if (selectedObjectParametersGui) {
    selectedObjectParametersGui.setPosition(Math.max(220, windowWidth - 220), 5)
  }
}

window.setup = setup
window.draw = draw
window.mousePressed = mousePressed
window.mouseDragged = mouseDragged
window.mouseReleased = mouseReleased
window.windowResized = windowResized
window.sentientDesigner = {
  addBarrier,
  deleteSelected,
  saveScene,
  loadScene,
  executeAction,
  createNewScene,
  downloadScene,
  deleteSelectedScene,
  refreshScenesList,
  Stage,
  getSelected: () => selectedObject,
  getSceneName: () => window.currentSceneName || Stage.name,
  getStatus: () => lastStatus,
  getTarget: () => ({ x: Stage.target.x, y: Stage.target.y }),
  selectAt: (x, y) => {
    draggingObject = hitTest(x, y)
    if (!draggingObject) {
      selectedObject = null
      onLeaveSelectedObject()
      return null
    }
    selectedObject = draggingObject.kind === 'target' ? getTargetHandle() : draggingObject
    onSelectedObject()
    return selectedObject
  },
  moveSelected: (dx, dy) => {
    if (!selectedObject) return null
    if (selectedObject.kind === 'target') {
      Stage.target.x += dx
      Stage.target.y += dy
    } else {
      selectedObject.rx += dx
      selectedObject.ry += dy
    }
    return selectedObject
  },
}
