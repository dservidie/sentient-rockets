# Sentient Rockets Sandbox

A p5.js + TensorFlow.js sandbox where rockets learn to fly with a genetic algorithm. Each rocket senses obstacles and is steered by its own neural network.

**Live demo:** https://dservidie.github.io/sentient-rockets/

![Sentient Rockets simulation](docs/sim.png)

This is an improved version of [Smart Rockets](https://codepen.io/daniel-servidie/pen/pogegWL). Rockets no longer follow a fixed list of commands. They sense the environment and react.

## How it works

Each rocket has five range sensors (rays) plus a few flight readings. Those values are the inputs to a small neural network. The network outputs a fly instruction: thrust and steering.

**Inputs (8):**

- Horizontal and vertical velocity
- Current steering acceleration
- Five boolean sensor flags (1 if that ray hits a barrier or the world edge, otherwise 0)

**Network:** 8 inputs → 16 hidden neurons (sigmoid) → 2 outputs (sigmoid)

**Outputs:**

- Thrust (0–1)
- Steering (mapped from 0–1 to left/right)

The first generation starts with random weights. After a generation finishes, the top-performing rockets are copied into the next generation with small random mutations. Over time, useful behaviors can spread through the population.

Use the [scene designer](https://dservidie.github.io/sentient-rockets/scene-designer/) to place barriers, then load that scene in the sim.

![Scene designer](docs/scene-designer.png)

## Rocket controls

Rockets are controlled by thrust and steering.

To try the physics by hand, use this CodePen:
https://codepen.io/daniel-servidie/pen/pogegWL

## Watch the neural network learn in front of your eyes

https://dservidie.github.io/sentient-rockets/
