export const CANVAS_WIDTH = 500
export const CANVAS_HEIGHT = 600

export const builtinScenes = {
  corridor: {
    name: 'corridor',
    objects: [
      { ry: 90, rx: 175, rw: 150, rh: 50 },
      { ry: 200, rx: 0, rw: 110, rh: 50 },
      { ry: 200, rx: 390, rw: 110, rh: 50 },
      { ry: 330, rx: 175, rw: 150, rh: 50 },
      { ry: 450, rx: 0, rw: 210, rh: 150 },
      { ry: 450, rx: 290, rw: 210, rh: 150 },
    ],
  },
  'wide-gap': {
    name: 'wide-gap',
    objects: [
      { ry: 80, rx: 0, rw: 180, rh: 40 },
      { ry: 80, rx: 320, rw: 180, rh: 40 },
      { ry: 250, rx: 0, rw: 90, rh: 180 },
      { ry: 250, rx: 410, rw: 90, rh: 180 },
      { ry: 470, rx: 150, rw: 80, rh: 40 },
      { ry: 470, rx: 270, rw: 80, rh: 40 },
    ],
  },
}

export function sceneStorageKey(sceneName) {
  return 'scene-' + String(sceneName || '').replace(/ /g, '-')
}

export function parseScene(jsonString) {
  if (!jsonString) {
    throw new Error('Missing scene JSON')
  }
  const json = typeof jsonString === 'string' ? JSON.parse(jsonString) : jsonString
  if (!json || !Array.isArray(json.objects)) {
    throw new Error('Scene JSON must include an objects array')
  }
  return {
    name: json.name || 'untitled',
    objects: json.objects.map((object) => ({
      id: object.id,
      ry: object.ry,
      rx: object.rx,
      rw: object.rw,
      rh: object.rh,
      color: object.color || 'white',
    })),
  }
}

export function serializeScene(scene) {
  return JSON.stringify(
    {
      name: scene.name,
      objects: (scene.objects || []).map((object) => ({
        id: object.id,
        ry: object.ry,
        rx: object.rx,
        rw: object.rw,
        rh: object.rh,
        color: object.color,
      })),
    },
    null,
    2
  )
}

export function listSceneNames(storage) {
  const stored = []
  if (storage) {
    for (let i = 0; i < storage.length; i++) {
      const key = storage.key(i)
      if (key && key.startsWith('scene-')) {
        stored.push(key.replace('scene-', ''))
      }
    }
  }
  return Array.from(new Set([...Object.keys(builtinScenes), ...stored])).sort()
}

export function loadSceneData(sceneName, storage) {
  if (builtinScenes[sceneName]) {
    return parseScene(builtinScenes[sceneName])
  }
  if (!storage) {
    throw new Error('Unknown scene: ' + sceneName)
  }
  const raw = storage.getItem(sceneStorageKey(sceneName))
  if (!raw) {
    throw new Error('Unknown scene: ' + sceneName)
  }
  return parseScene(raw)
}

export function defaultTarget(width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  return { x: width / 2, y: 50 }
}
