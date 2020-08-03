class Scene {
  constructor(modelConfig) {
    this.modelConfig = modelConfig
    this.scene = null
    this.object = null
    this.texture = null
    this.mixer = null
  }

  init() {

  }

  configureRenderer() {

  }

  dispose() {
    if (this.object) {
      this.object.traverse(node => {
        if (node.geometry) {
          node.geometry.dispose()
        }
        if (node.material) {
          if (node.material.length) {
            for (let i = 0; i < node.material.length; ++i) {
              node.material[i].dispose()
            }
          } else {
            node.material.dispose()
          }
        }
      });
    }

    if (this.texture) {
      this.texture.dispose();
    }

    this.scene = null
    this.object = null
    this.texture = null
  }

  animate(delta) {
    if (this.mixer !== null) {
      this.mixer.update(delta);
    }
  }
}

export default Scene
