class NeuralNetwork {
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
    return new NeuralNetwork(
      modelCopy,
      this.input_nodes,
      this.hidden_nodes,
      this.output_nodes
    )
  }

  mutate(rate) {
    tf.tidy(() => {
      const weights = this.model.getWeights()
      const mutatedWeights = []
      for (let i = 0; i < weights.length; i++) {
        let tensor = weights[i]
        let shape = weights[i].shape
        let values = tensor.dataSync().slice()
        for (let j = 0; j < values.length; j++) {
          if (random(1) < rate) {
            let w = values[j]
            values[j] = w + randomGaussian()
          }
        }
        let newTensor = tf.tensor(values, shape)
        mutatedWeights[i] = newTensor
      }
      this.model.setWeights(mutatedWeights)
    })
  }

  dispose() {
    this.model.dispose()
  }

  predict(inputs) {
    return tf.tidy(() => {
      const xs = tf.tensor2d([inputs])
      const ys = this.model.predict(xs)
      const outputs = ys.dataSync()
      // console.log(outputs);
      return outputs
    })
  }

  createModel() {
    const model = tf.sequential()
    const hidden = tf.layers.dense({
      units: this.hidden_nodes,
      inputShape: [this.input_nodes],
      activation: 'sigmoid',
    })
    model.add(hidden)
    const output = tf.layers.dense({
      units: this.output_nodes,
      activation: 'sigmoid',
    })
    model.add(output)
    return model
  }

  async saveModel(name) {
    await this.model.save(`localstorage://model-${name}`)
  }

  static async loadModel(name, inputNodes, hiddenNodes, outputNodes) {
    const model = await tf.loadLayersModel(`localstorage://model-${name}`)
    console.log('loadModel/model: ', model)
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
