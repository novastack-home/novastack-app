/* eslint-disable quote-props */
/* eslint-disable object-curly-newline */
// position (hor:vert:depth) ?
// rotation (hor:vert:2D) ?

const boomBoxBoy = {
  id: 6,
  name: 'Model 4',
  path: 'models/m4/scene.gltf',
  position: [0.0, -0.7, 0.0],
  rotation: [0.0, 0.5, 0.0],
  scale: 0.85,
  objectClickHandlers: {
    'Cloud': () => {
      window.location.href = 'https://google.com';
    },
  },
};

const modelsConfig = [
  { id: 0, name: 'Model 1', path: 'models/m1/scene.gltf', position: [-1.4, -0.5, -1.0], rotation: [0.0, 0.0, 0.0], scale: 0.2 },
  { id: 1, name: 'Model 2', path: 'models/m2/scene.gltf', position: [0.0, -0.1, 0.0], rotation: [0.0, -2.0, 0.0], scale: 0.001 },
  { id: 2, name: 'Model 3', path: 'models/m3/scene.gltf', position: [-1.8, -1.4, -0.5], rotation: [0.0, -1.5, 0.0], scale: 0.14 },
  boomBoxBoy,
  { id: 4, name: 'Model 5', path: 'models/m5/scene.gltf', position: [0.0, -0.5, 0.0], rotation: [0.0, 0.0, 2.0], scale: 0.05 },
  { id: 5, name: 'Model 6', path: 'models/m6/scene.gltf', position: [0.0, 0.0, 0.0], rotation: [0.0, 0.7, 0.0], scale: 0.28 },
];

export default modelsConfig;
