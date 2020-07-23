import * as THREE from 'three'

function addLights (scene) {
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

export { addLights }
