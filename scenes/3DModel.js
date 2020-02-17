class Model3DScene {
  constructor() {
    const sceneModel = new THREE.Scene();
    init3Dmodel(sceneModel);
    return sceneModel;
  }
}

function init3Dmodel(scene_model) {
  // Light
  const color = 0xffffff;
  const intens = 1;
  const light = new THREE.DirectionalLight(color, intens);
  const light2 = new THREE.AmbientLight(0xffffff);
  light.position.set(-1, 2, 4);
  scene_model.add(light);
  scene_model.add(light2);

  // Add model with parameters from JSON
  const configJSON = `{
        "models": [
            {"id": 0, "path" : "models/dancing/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [1, -1.0, 0.0], "scale" : 0.4}]
        }`;
  // eslint-disable-next-line max-len
  // {"id": 1, "path" : "models/diorama_low.glb", "position" : [0.1, 0.1, -1.0], "rotation" : [1.57079, 0.0, 0.0], "scale" : 0.15}

  // eslint-disable-next-line max-len
  // Load all model. Models should be 'glb' or 'gltf' - other types are not supported or supported badly.
  let objLoader = new THREE.GLTFLoader();
  const config = JSON.parse(configJSON);
  let models = new Map();

  config.models.forEach((m) => {
    objLoader.load(m.path, (g) => {
      const model = g.scene;
      model.scale.set(m.scale, m.scale, m.scale);
      model.rotation.set(m.rotation[0], m.rotation[1], m.rotation[2]);
      model.position.set(m.position[0], m.position[1], m.position[2]);
      scene_model.add(model);
      models.set(m.id, model);
    }, (e) => {
      console.error('MODEL ERROR e=', e);
    });
  });
}

exports.Model3DScene = Model3DScene;
