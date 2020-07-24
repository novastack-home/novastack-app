import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import { addLights } from '../utils.js'

class CommonGltfScene {
  constructor(modelConfig) {
    this.modelConfig = modelConfig
    this.scene = null
  }

  init(renderer) {
    let loader = new GLTFLoader();
    let m = this.modelConfig;

    loader.load(m.path, (g) => {
      const model = g.scene;
      model.scale.set(m.scale, m.scale, m.scale);
      model.rotation.set(m.rotation[0], m.rotation[1], m.rotation[2]);
      model.position.set(m.position[0], m.position[1], m.position[2]);

      // let mixer = new THREE.AnimationMixer(g.scene);
      // g.animations.forEach((clip) => {mixer.clipAction(clip).play(); });
      // animationMixers.set(m.id, mixer);

      const modelScene = new THREE.Scene();
      modelScene.add(model);
      addLights(modelScene);

      // sceneModels.set(m.id, sceneModel);
      // console.log('Created scene for model', m.path);
      this.scene = modelScene
      this.onReady()
    }, this.onModelLoading, onError);
  }
}

function onError(err) { console.error(err); }

export default CommonGltfScene
