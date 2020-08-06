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

        if (node.material && node.material.envMap && node.material.envMap.dispose) {
          node.material.envMap.dispose();
        }
      });
    }

    if (this.texture) {
      this.texture.dispose();
    }

    if (this.scene) {
      this.scene.children.forEach(obj => {
        this.scene.remove(obj)
      })
    }

    this.mixer.stopAllAction();
    this.mixer.uncacheAction();

    this.scene.dispose();
    this.scene = null
    this.object = null
    this.texture = null
    this.mixer = null;
  }

  animate(delta) {
    if (this.mixer !== null) {
      this.mixer.update(delta);
    }
  }
}

export default Scene
