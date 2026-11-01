import { gaussian } from '../core/math.js'
import { defaultGaussian, defaultRandom } from '../core/random.js'
import { fingerprintWeights, validateBrainData } from '../core/brain.js'

export class NeuralNetwork {
  constructor(a, b, c, d) {
    if (NeuralNetwork.isModel(a)) {
      this.model = a
      this.input_nodes = b
      this.hidden_nodes = c
      this.output_nodes = d
    } else {
      this.input_nodes = a
      this.hidden_nodes = b
      this.output_nodes = c
      this.model = this.createModel()
    }
  }

  copy() {
    const modelCopy = this.createModel()
    tf.tidy(() => {
      const weights = this.model.getWeights()
      const weightCopies = []
      for (let i = 0; i < weights.length; i++) {
        weightCopies[i] = weights[i].clone()
      }
      modelCopy.setWeights(weightCopies)
    })
    return new NeuralNetwork(modelCopy, this.input_nodes, this.hidden_nodes, this.output_nodes)
  }

  mutate(rate, rng = defaultRandom, gauss = defaultGaussian) {
    tf.tidy(() => {
      const weights = this.model.getWeights()
      const mutatedWeights = []
      for (let i = 0; i < weights.length; i++) {
        const tensor = weights[i]
        const shape = weights[i].shape
        const values = tensor.dataSync().slice()
        for (let j = 0; j < values.length; j++) {
          if (rng() < rate) {
            values[j] = values[j] + gauss()
          }
        }
        mutatedWeights[i] = tf.tensor(values, shape)
      }
      this.model.setWeights(mutatedWeights)
    })
    return this
  }

  dispose() {
    this.model.dispose()
  }

  predict(inputs) {
    return tf.tidy(() => {
      const xs = tf.tensor2d([inputs])
      const ys = this.model.predict(xs)
      return Array.from(ys.dataSync())
    })
  }

  createModel() {
    const model = tf.sequential()
    model.add(
      tf.layers.dense({
        units: this.hidden_nodes,
        inputShape: [this.input_nodes],
        activation: 'sigmoid',
      })
    )
    model.add(
      tf.layers.dense({
        units: this.output_nodes,
        activation: 'sigmoid',
      })
    )
    return model
  }

  getWeightsData() {
    return this.model.getWeights().map((tensor) => ({
      shape: tensor.shape.slice(),
      values: Array.from(tensor.dataSync()),
    }))
  }

  setWeightsData(weights) {
    const tensors = weights.map((layer) => tf.tensor(layer.values, layer.shape))
    this.model.setWeights(tensors)
    tensors.forEach((tensor) => tensor.dispose())
    return this
  }

  fingerprint() {
    return fingerprintWeights(this.getWeightsData())
  }

  toJSON(extra = {}) {
    return {
      version: 1,
      kind: 'sentient-rockets-brain',
      input_nodes: this.input_nodes,
      hidden_nodes: this.hidden_nodes,
      output_nodes: this.output_nodes,
      activation: 'sigmoid',
      weights: this.getWeightsData(),
      ...extra,
    }
  }

  static fromJSON(data) {
    const brain = validateBrainData(data)
    const network = new NeuralNetwork(brain.input_nodes, brain.hidden_nodes, brain.output_nodes)
    network.setWeightsData(brain.weights)
    return network
  }

  async saveModel(name) {
    await this.model.save(`localstorage://model-${name}`)
  }

  static async loadModel(name, inputNodes, hiddenNodes, outputNodes) {
    const model = await tf.loadLayersModel(`localstorage://model-${name}`)
    return new NeuralNetwork(model, inputNodes, hiddenNodes, outputNodes)
  }

  static isModel(value) {
    return (
      value &&
      typeof value.predict === 'function' &&
      typeof value.getWeights === 'function' &&
      typeof value.setWeights === 'function'
    )
  }
}

export { gaussian }
