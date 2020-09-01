import * as THREE from 'three'
import Scene from './Scene'

class CommonGltfScene extends Scene {
  constructor(modelConfig) {
    super(modelConfig)
  }

  init(gltf, renderer, envMap) {
    this.configureRenderer(renderer);

    let m = this.modelConfig;
    const model = gltf.scene;
    this.object = model;
    model.scale.set(m.scale, m.scale, m.scale);
    model.rotation.set(m.rotation[0], m.rotation[1], m.rotation[2]);
    model.position.set(m.position[0], m.position[1], m.position[2]);

    model.traverse( function ( node ) {
        if (envMap && node.material && ( node.material.isMeshStandardMaterial ||
            ( node.material.isShaderMaterial && node.material.envMap !== undefined ) ) ) {
          node.material.envMap = envMap;
          node.material.envMapIntensity = 1.5; // boombox seems too dark otherwise
        }
    });

    const mixer = new THREE.AnimationMixer(model);
    gltf.animations.forEach((clip) => {mixer.clipAction(clip).play(); });
    this.mixer = mixer;

    const modelScene = new THREE.Scene();
    modelScene.add(model);
    addLights(modelScene);

    // sceneModels.set(m.id, sceneModel);
    // console.log('Created scene for model', m.path);
    this.scene = modelScene
  }

  configureRenderer(renderer) {
    renderer.outputEncoding = THREE.sRGBEncoding;
		renderer.toneMapping = THREE.ACESFilmicToneMapping;
		renderer.toneMappingExposure = 1;
		renderer.physicallyCorrectLights = true;
    renderer.shadowMap.enabled = true;
		renderer.shadowMap.type = THREE.PCFSoftShadowMap;
  }
}

function addLights(scene) {
  var ambient = new THREE.AmbientLight( 0x222222 );
	scene.add( ambient );

	var directionalLight = new THREE.DirectionalLight( 0xdddddd, 4 );
	directionalLight.position.set( 0, 0, 1 ).normalize();
	scene.add( directionalLight );

	var spot1 = new THREE.SpotLight( 0xffffff, 1 );
	spot1.position.set( 5, 10, 5 );
	spot1.angle = 0.50;
	spot1.penumbra = 0.75;
	spot1.intensity = 100;
	spot1.decay = 2;
	spot1.castShadow = true;
	spot1.shadow.bias = 0.0001;
	spot1.shadow.mapSize.width = 2048;
	spot1.shadow.mapSize.height = 2048;

	scene.add( spot1 );
}

function onError(err) { console.error(err); }

export default CommonGltfScene
