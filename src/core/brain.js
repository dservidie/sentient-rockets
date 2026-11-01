export function validateBrainData(data) {
  if (!data || typeof data !== 'object') {
    throw new Error('Brain file is empty')
  }
  if (!data.input_nodes || !data.hidden_nodes || !data.output_nodes) {
    throw new Error('Brain file is missing network topology')
  }
  if (!Array.isArray(data.weights) || data.weights.length === 0) {
    throw new Error('Brain file is missing weights')
  }
  for (const layer of data.weights) {
    if (!layer || !Array.isArray(layer.shape) || !Array.isArray(layer.values)) {
      throw new Error('Brain weights are not in the expected format')
    }
  }
  return data
}

export function parseBrainFile(text) {
  const data = typeof text === 'string' ? JSON.parse(text) : text
  return validateBrainData(data)
}

export function fingerprintWeights(weights) {
  return (weights || []).map((layer) => layer.values.join(',')).join('|')
}

export function brainsHaveSameTopology(a, b) {
  return (
    a.input_nodes === b.input_nodes &&
    a.hidden_nodes === b.hidden_nodes &&
    a.output_nodes === b.output_nodes
  )
}

export function cloneBrainData(data) {
  return JSON.parse(JSON.stringify(validateBrainData(data)))
}
