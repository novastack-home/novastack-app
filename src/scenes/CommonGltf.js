import * as THREE from 'three'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'

class CommonGltfScene {
  constructor(modelConfig) {
    this.modelConfig = modelConfig
  }

  init(onLoading, onReady) {
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

      const sceneModel = new THREE.Scene();
      sceneModel.add(model);
      addLight(sceneModel);

      // sceneModels.set(m.id, sceneModel);
      // console.log('Created scene for model', m.path);
      onReady(sceneModel)
    },
    xhr => {
      if ( xhr.lengthComputable ) {
    		var percentComplete = xhr.loaded / xhr.total * 100;
        onLoading(Math.round( percentComplete))
    	}
    },
    onError);
  }
}


function addLight(scene){
  // Light
  const color = 0xffffff;
  const intens = 1;
  const light = new THREE.DirectionalLight(color, intens);
  const light2 = new THREE.DirectionalLight(color, intens);
  const light3 = new THREE.DirectionalLight(color, intens);
  const light4 = new THREE.AmbientLight(0xffffff);
  light.castShadow = true;
  light2.castShadow = true;
  light3.castShadow = true;
  light.position.set(0., 1., 1.);
  light2.position.set(0., 0., 1.);
  light3.position.set(0., 1., 0.);

  scene.add(light);
  scene.add(light2);
  scene.add(light3);
  scene.add(light4);
}

function onProgress( xhr ) {
	if ( xhr.lengthComputable ) {
		var percentComplete = xhr.loaded / xhr.total * 100;
		console.log( Math.round( percentComplete, 2 ) + '% downloaded' );
	}
};


function onError(err) { console.error(err); }


export default CommonGltfScene
