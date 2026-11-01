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
    target: { x: 250, y: 50 },
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
    target: { x: 250, y: 50 },
  },
}

export function sceneStorageKey(sceneName) {
  return 'scene-' + String(sceneName || '').replace(/ /g, '-')
}

export function defaultTarget(width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  return { x: width / 2, y: 50 }
}

export function parseTarget(raw, width = CANVAS_WIDTH, height = CANVAS_HEIGHT) {
  if (raw && Number.isFinite(Number(raw.x)) && Number.isFinite(Number(raw.y))) {
    return { x: Number(raw.x), y: Number(raw.y) }
  }
  return defaultTarget(width, height)
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
    target: parseTarget(json.target),
  }
}

export function serializeScene(scene) {
  const target = parseTarget(scene && scene.target)
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
      target,
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

export function saveSceneToStorage(scene, storage) {
  if (!scene || !scene.name) {
    throw new Error('Scene needs a name')
  }
  if (!storage) {
    throw new Error('No storage available')
  }
  const key = sceneStorageKey(scene.name)
  storage.setItem(key, serializeScene(scene))
  return key
}

export function deleteStoredScene(sceneName, storage) {
  if (!sceneName) {
    throw new Error('No scene selected')
  }
  if (builtinScenes[sceneName]) {
    throw new Error('Cannot delete a built-in scene')
  }
  if (!storage) {
    throw new Error('No storage available')
  }
  const key = sceneStorageKey(sceneName)
  if (storage.getItem(key) == null) {
    throw new Error('Unknown scene: ' + sceneName)
  }
  storage.removeItem(key)
  return key
}
