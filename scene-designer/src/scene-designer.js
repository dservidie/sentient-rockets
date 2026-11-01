import { Barrier } from '../../src/barrier.js'
import { Stage } from '../../src/stage.js'

// gui panel references
var guiPhysics, guiControls, selectedObjectParametersGui, selectedObjectParametersQS

var currentSceneName = ''
let selectedObject
let locked = false
let draggingObject
let mousePreviousX, mousePreviousY

var scenesList

var sceneAction = [
  'Load selected Scene',
  'Create New',
  'Download selected Scene',
  'Delete Scene',
]

let selectedObjectParametersGuiX, selectedObjectParametersGuiY
let logP

function setup() {
  console.log('SETUP START')
  let canvas = createCanvas(500, 600)
  canvas.parent('canvasDiv')

  Stage.initialize()
  createUI()
}

function draw() {
  background(0)

  // Test if the cursor is over the box
  // Rocket hits one object
  if (!locked) {
    draggingObject = null
    // Inverted so item on top has priority
    for (let obj of Stage.objects.slice().reverse()) {
      if (!draggingObject && obj.isCollidingWithPoint(mouseX, mouseY)) {
        obj.color = 'Gainsboro'
        draggingObject = obj
      } else {
        obj.color = 'White'
      }
    }
  }

  logP.html(
    'Selected:' +
      JSON.stringify(selectedObject) +
      '</BR>' +
      'Dragging: ' +
      JSON.stringify(draggingObject)
  )
  // Renders barrier for rockets
  Stage.draw(true)
}

function mousePressed(e) {
  if (e.target.tagName === 'CANVAS') {
    if (draggingObject) {
      locked = true
      selectedObject = draggingObject
      draggingObject.color = 'PaleGreen'
      onSelectedObject()
    } else {
      locked = false
      selectedObject = null
      onLeaveSelectedObject()
    }
  }
  mousePreviousX = mouseX
  mousePreviousY = mouseY
}

function mouseDragged() {
  if (locked && draggingObject) {
    draggingObject.rx += mouseX - mousePreviousX
    draggingObject.ry += mouseY - mousePreviousY
    mousePreviousX = mouseX
    mousePreviousY = mouseY
  }
}

function mouseReleased() {
  locked = false
}

function onSelectedObject() {
  if (selectedObject) {
    destroySelectedObjectParametersGui()
    selectedObjectParametersGui = createGui('Barrier Properties: id ' + selectedObject.id)
    selectedObjectParametersQS = selectedObjectParametersGui.getQS()
    selectedObject.rwMin = 20
    selectedObject.rwMax = width
    selectedObject.rhMin = 20
    selectedObject.rhMax = height
    selectedObjectParametersGui.addObject(selectedObject, 'rw', 'rh')

    if (!selectedObjectParametersGuiX) {
      selectedObjectParametersGui.setPosition(
        width - 200,
        height - selectedObjectParametersQS._panel.offsetHeight
      )
    } else {
      console.log('selectedObjectParametersGuiX', selectedObjectParametersGuiX)
      console.log('selectedObjectParametersGuiY', selectedObjectParametersGuiY)

      selectedObjectParametersGui.setPosition(
        selectedObjectParametersGuiX,
        selectedObjectParametersGuiY
      )
    }

    selectedObjectParametersGui.setPosition(
      width - 200,
      height - selectedObjectParametersQS._panel.offsetHeight
    )
  }
}

function onLeaveSelectedObject() {
  destroySelectedObjectParametersGui()
}

function destroySelectedObjectParametersGui() {
  if (selectedObjectParametersGui) {
    selectedObjectParametersGuiX = selectedObjectParametersQS._panel.offsetWidth
    selectedObjectParametersGuiY = selectedObjectParametersQS._panel.offsetHeight
    console.log('selectedObjectParametersGuiX', selectedObjectParametersGuiX)
    console.log('selectedObjectParametersGuiY', selectedObjectParametersGuiY)
    selectedObjectParametersGui.destroy()
    selectedObjectParametersGui = null
  }
}

function createUI() {
  // Create the GUI
  sliderRange(0, Math.max(width, height), 1)
  guiControls = createGui('Controls').setPosition(5, 5)
  let qsControls = guiControls.getQS()
  qsControls.addHTML(
    'How to use',
    'You can add barriers. Select a barrier to edit its properties. Drag and drop to move them in the stage'
  )
  scenesList = Stage.listScenes()
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

  // Creation of controls
  logP = createP('')
  logP.parent('display') // Setting it in the right place
}

function executeAction() {
  switch (sceneAction) {
    case 'Create New':
      Stage.name = 'new-scene-' + Date.now().toString()
      Stage.objects = []
      Stage.addBarrier(new Barrier(90, 175, 150, 50))
      Stage.addBarrier(new Barrier(200, 0, 110, 50))
      Stage.addBarrier(new Barrier(200, 390, 110, 50))
      Stage.addBarrier(new Barrier(330, 175, 150, 50))
      Stage.addBarrier(new Barrier(450, 0, 210, 150))
      Stage.addBarrier(new Barrier(450, 290, 210, 150))
      currentSceneName = Stage.name
      break

    case 'Load selected Scene':
      loadScene(scenesList)
      break

    case 'Download selected Scene':
      let sceneJson = Stage.toJSON()
      let sceneStorageName = 'scene-' + currentSceneName.replace(' ', '-')
      save(sceneJson, sceneStorageName + '.json', true)
      break

    case 'Delete Scene':
      let sceneName4 = prompt('Name the new scene:', '')

      break
    default:
      break
  }
}

function addBarrier() {
  Stage.addBarrier(new Barrier(height / 2, width / 2))
}

function loadScene(sceneName) {
  Stage.loadByName(sceneName)
  currentSceneName = Stage.name
}

function saveScene() {
  let sceneJson = Stage.toJSON()
  let sceneStorageName = 'scene-' + currentSceneName.replace(' ', '-')
  console.log('saveScene', sceneStorageName)
  localStorage.setItem(sceneStorageName, sceneJson)
}

function getSceneStorageName(sceneName) {
  return 'scene-' + sceneName.replace(' ', '-')
}

window.setup = setup
window.draw = draw
window.mousePressed = mousePressed
window.mouseDragged = mouseDragged
window.mouseReleased = mouseReleased
window.sentientDesigner = {
  addBarrier,
  Stage,
}
