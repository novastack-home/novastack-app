class Model3DScene {
  constructor(animationMixers) {
    let sceneModels = new Map();
    init3Dmodel(sceneModels, animationMixers);
    return sceneModels;
  }
}

function init3Dmodel(sceneModels, animationMixers) {


  // Add model with parameters from JSON
  const configJSON = `{
  "models": [
    {"id": 1, "path" : "models/whale/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [0.0, 0.7, 0.5], "scale" : 0.25},
    {"id": 2, "path" : "models/dancing/scene.gltf", "position" : [0.0, -1.0, 0.0], "rotation" : [0.0, -1.0, 0.0], "scale" : 1.0},
    {"id": 3, "path" : "models/drone/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [0.0, 0.0, 0.0], "scale" : 0.025},
    {"id": 4, "path" : "models/rainer/scene.gltf", "position" : [0.0, -0.4, 0.0], "rotation" : [0.0, 0.0, 0.0], "scale" : 0.0015},
    {"id": 5, "path" : "models/tokyo/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [0.0, 0.0, 0.0], "scale" : 0.005},
    {"id": 0, "path" : "models/walkeri/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [0.0, 0.0, 0.0], "scale" : 0.05}
  ]}`;
  // eslint-disable-next-line max-len
  // {"id": 2, "path" : "models/bonsai-tree.glb", "position" : [0.0, 0.0, 0.5], "rotation" : [0.0, 0.0, 0.0], "scale" : 5.0}
  // {"id": 1, "path" : "models/diorama_low.glb", "position" : [0.1, -0.1, 0.0], "rotation" : [1.57079, 0.0, 0.0], "scale" : 0.06}
  // {"id": 1, "path" : "models/diorama_low.glb", "position" : [0.1, 0.1, -1.0], "rotation" : [1.57079, 0.0, 0.0], "scale" : 0.15}
  // {"id": 0, "path" : "models/dancing/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [1.57, -1.0, 0.0], "scale" : 0.4}]
  // eslint-disable-next-line max-len
  // Load all model. Models should be 'glb' or 'gltf' - other types are not supported or supported badly.
  let objLoader = new THREE.GLTFLoader();
  const config = JSON.parse(configJSON);
  config.models.forEach((m) => {
    objLoader.load(m.path, (g) => {
      const model = g.scene;
      model.scale.set(m.scale, m.scale, m.scale);
      model.rotation.set(m.rotation[0], m.rotation[1], m.rotation[2]);
      model.position.set(m.position[0], m.position[1], m.position[2]);

      let mixer = new THREE.AnimationMixer(g.scene);
      g.animations.forEach((clip) => {mixer.clipAction(clip).play(); });
      animationMixers.set(m.id, mixer);

      const sceneModel = new THREE.Scene();
      sceneModel.add(model);
      addLight(sceneModel);

      sceneModels.set(m.id, sceneModel);
    }, onProgress, onError);
  });
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

exports.Model3DScene = Model3DScene;
