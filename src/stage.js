import { Barrier } from './barrier.js'
import { rocketHitsWorld } from './core/collision.js'
import {
  builtinScenes,
  CANVAS_HEIGHT,
  CANVAS_WIDTH,
  defaultTarget,
  listSceneNames,
  loadSceneData,
  serializeScene,
} from './core/scenes.js'

export class Stage {
  static name
  static target
  static objects

  static initialize(sceneName) {
    Stage.target = createVector(width / 2, 50)
    Stage.objects = []
    Stage.name = sceneName || ''
    if (sceneName) {
      Stage.loadByName(sceneName)
    }
  }

  static loadByName(sceneName, storage = globalThis.localStorage) {
    const scene = loadSceneData(sceneName, storage)
    Stage.applyScene(scene)
    return scene
  }

  static applyScene(scene) {
    Stage.name = scene.name
    Stage.target = createVector(width / 2, 50)
    Stage.objects = scene.objects.map((object) => Barrier.fromJSON(object))
  }

  static loadJSON(jsonString) {
    const json = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
    Stage.applyScene(json)
  }

  static toJSON() {
    return serializeScene({
      name: Stage.name,
      objects: Stage.objects,
    })
  }

  static listScenes(storage = globalThis.localStorage) {
    return listSceneNames(storage)
  }

  static addBarrier(barrier) {
    Stage.objects.push(barrier)
  }

  static rocketCollision(rocket) {
    return rocketHitsWorld(rocket, Stage.objects, { width, height })
  }

  static draw(mustDraw) {
    if (mustDraw) {
      for (const obj of this.objects) {
        obj.draw()
      }
      fill('LightGreen')
      ellipse(Stage.target.x, Stage.target.y, 16, 16)
    }
  }

  static drawArrow(vector, location, color, scale = 5) {
    push()
    stroke(color)
    fill(color)
    strokeWeight(3)
    translate(location.x, location.y)
    line(0, 0, vector.x * scale, vector.y * scale)
    rotate(vector.heading())
    const arrowSize = 3
    translate(vector.mag() * scale - arrowSize, 0)
    triangle(0, arrowSize / 2, 0, -arrowSize / 2, arrowSize, 0)
    pop()
  }
}

export { builtinScenes, CANVAS_HEIGHT, CANVAS_WIDTH, defaultTarget }
