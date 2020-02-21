(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-undef */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-const */
/* eslint-disable no-use-before-define */
/* eslint-disable no-var */
const { Model3DScene } = require('./scenes/3DModel.js');
const { Scene3JS } = require('./scenes/3JSModel.js');

// Size of video stream
let VIDEO_WIDTH, VIDEO_HEIGHT;

window.Module = {
  onRuntimeInitialized: () => bootstrap(Module),
};

// This is virtual canvas element that used for capture video frames
let frameCaptureCanvas = document.createElement('canvas');
let frameCaptureCanvasCtx2D = frameCaptureCanvas.getContext('2d');

// We should get access to camera and load video metadata before calling init()
function bootstrap(module) {
  // Old getUserMedia based on callbacks and still may work in some browsers
  getDeviceCamera = (navigator.getUserMedia || navigator.webKitGetUserMedia || navigator.moxGetUserMedia || navigator.mozGetUserMedia || navigator.msGetUserMedia);

  // Detect mobile device for request back camera
  const isMobile = navigator.userAgent.match(/Android|BlackBerry|Tablet|Mobile|iPhone|iPad|iPod|Opera Mini|IEMobile/i);

  const constraints = {
    audio: false,
    video: true,
  };

  if (isMobile) {
    constraints.video = { facingMode: { exact: "environment" } };
  }

  if (navigator.mediaDevices.getUserMedia) {
    navigator.mediaDevices.getUserMedia(constraints)
      .then(success)
      .catch(console.error);
  } else if (getDeviceCamera) {
    getDeviceCamera(constraints, success, console.error);
  } else {
    console.error("Can't access getUserMedia");
  }

  function success(stream) {
    const video = document.getElementById('video');
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      VIDEO_WIDTH = video.videoWidth;
      VIDEO_HEIGHT = video.videoHeight;
      frameCaptureCanvas.width = VIDEO_WIDTH;
      frameCaptureCanvas.height = VIDEO_HEIGHT;
      video.play();
      init(module);
    };
  }
}

function init(module) {
  // It's used to capture frame and invisible
  const canvasVideo = frameCaptureCanvas;
  const canvasContext = frameCaptureCanvasCtx2D;

  // Prepare Emscrypten functions
  const onInit = module.cwrap('onInit', null, ['number', 'number', 'number']);
  const addMarker = module.cwrap('addMarker', null, ['number', 'number', 'number']);
  const onProcess = module.cwrap('onProcess', 'number', ['number', 'number', 'number']);
  const finalizeMarkers = module.cwrap('finalizeMarkers', null);


  // Prepare space for initial frame and result image{cv}
  // It will be rewritten everytime - you do not need to free memory in the loop
  const imageWidth = canvasVideo.width;
  const imageHeight = canvasVideo.height;

  canvasContext.drawImage(video, 0, 0, canvasVideo.width, canvasVideo.height);
  let imageData = canvasContext.getImageData(0, 0, canvasVideo.width, canvasVideo.height);
  // console.log(ImageData);

  // Initialize engine in Emscipten code. It get a 'pointer' to the image and works with it
  // After using, we need to delete allocated space, it cannot be done automaically.
  const bufferSize = imageWidth * imageHeight * 4;
  let inputBuf = module._malloc(bufferSize);
  let temp1 = new Uint8ClampedArray(module.HEAPU8.buffer, inputBuf, bufferSize);
  temp1.set(imageData.data, 0);

  onInit(inputBuf, imageWidth, imageHeight);
  module._free(inputBuf);
  module._free(temp1);
  module._free(imageData);

  // Add marker-images that should be detected on the frame
  // When all markers are added, we call 'finalize' function to prepare right id for markers.
  addMarkers(module, addMarker, finalizeMarkers);


  // Now we initialize 3JS components: 'scene', 'camera' and 'render'
  // Scene consists 'light' and 'meshes'(objects with geometry and textures)

  let canvasOutput = document.getElementById('canvasOutput');
  canvasOutput.width = VIDEO_WIDTH;
  canvasOutput.height = VIDEO_HEIGHT;
  const aspectRatio = canvasOutput.width / canvasOutput.height;
  let camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 100);

  let scene = new Scene3JS();
  let scene_model = new Model3DScene();

  let renderer = new THREE.WebGLRenderer({canvas: canvasOutput,
                                          antialias: true,
                                            alpha: true,
                                            powerPreference: "high-performance",
                                            precision: "highp",
                                            logarithmicDepthBuffer: "auto"
                                          });
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.setClearColor(0x000000, 0);

  // Processing of the given frame in the loop:
  // Take frame image -> Send to Emscripten code to detect or track
  // markers on the frame (only 1 marker simultaniously)
  // -> Find position of the camera -> send it with id to JS
  // -> Add parameters to the camera -> Use given id to render right model
  const cam_par = [];
  // eslint-disable-next-line func-names
  const capture = function () {
    // var t0 = Date.now();

    canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);

    imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight).data;
    const inputBuf2 = module._malloc(bufferSize);
    module.HEAPU8.set(imageData, inputBuf2);

    // let t1 = Date.now();

    let result = onProcess(inputBuf2, imageWidth, imageHeight);

    // let t2 = Date.now();
    // console.log('onProcess time is:');
    // console.log(t2 - t1);

    // We return array with C++ float type. So we need to get them in JS by using HEAP and memory
    for (let v = 0; v < 10; v++) {
      cam_par.push(Module.HEAPF32[result / Float32Array.BYTES_PER_ELEMENT + v]);
    }
    // console.log(cam_par);

    // Rendering depends on marker id. If no marker in scene, it clear all.
    // It should be like ' current_3Dmodel = all_3Dmodels[ id ] '
    let id_marker = cam_par[0];
    if (id_marker === 0) {
      camera = set_camera(camera, cam_par);
      renderer.render(scene, camera);
    } else if (id_marker === 1) {
      // console.log('3d Model');
      camera = set_camera(camera, cam_par);
      renderer.render(scene_model, camera);
    } else {
      renderer.clear();
    }


    // Delete object from array and clear C++ memory
    // There is a problem OOM in firefox because of 'imageData'. It does not delete it each time.
    for (let v = 0; v < 10; v++) {
      cam_par.pop();
    }
    module._free(inputBuf2);
    module._free(result);

    // let t4 = Date.now();
    // console.log('Total time is:');
    // console.log(t4 - t0);

    requestAnimationFrame(capture);
  };

  capture();

}

function set_camera(camera, par) {
  camera.position.set(par[1], par[2], par[3]);
  camera.lookAt(par[4], par[5], par[6]);
  camera.up.set(par[7], par[8], par[9]);

  return camera;
}

// eslint-disable-next-line no-unused-vars
const getImageData = () => {
  console.log('[getImageData]');
  const canvas = frameCaptureCanvas;
  const ctx = frameCaptureCanvasCtx2D;
  const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);
  console.log(ImageData);
  return imageData;
};


const addMarkerFromImg = (module, addMarker, markerData, width, height) => {
  console.log('Load Marker');
  bufferSizeMarker = width * height * 4;

  markerBuf = module._malloc(bufferSizeMarker);
  module.HEAPU8.set(markerData.data, markerBuf);

  addMarker(markerBuf, width, height);
  module._free(markerBuf);
  module._free(markerData);
};


const addMarkers = (module, addMarker, finalizeMarkers) => {
  const markersFolderPath = './images/';
  const nmarkers = 2;

  // Virtual canvas element for capture image data from img
  const canvasImg = document.createElement('canvas');
  const contextImg = canvasImg.getContext('2d');

  for (let i = 1; i <= nmarkers; i++) {
    let imagePath = `${markersFolderPath}M${i}.png`;
    let img = new Image();
    img.src = imagePath;
    // console.log(img.width, img.height);
    canvasImg.width = img.width;
    canvasImg.height = img.height;

    contextImg.drawImage(img, 0, 0);
    const markerData = contextImg.getImageData(0, 0, img.width, img.height);

    addMarkerFromImg(module, addMarker, markerData, img.width, img.height);
  }

  finalizeMarkers();
};

},{"./scenes/3DModel.js":2,"./scenes/3JSModel.js":3}],2:[function(require,module,exports){
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
          {"id": 2, "path" : "models/bonsai-tree.glb", "position" : [0.0, 0.0, 0.5], "rotation" : [0.0, 0.0, 0.0], "scale" : 5.0}]
        }`;
  // eslint-disable-next-line max-len
  // {"id": 1, "path" : "models/diorama_low.glb", "position" : [0.1, -0.1, 0.0], "rotation" : [1.57079, 0.0, 0.0], "scale" : 0.06}
  // {"id": 1, "path" : "models/diorama_low.glb", "position" : [0.1, 0.1, -1.0], "rotation" : [1.57079, 0.0, 0.0], "scale" : 0.15}
  // {"id": 0, "path" : "models/dancing/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [1, -1.0, 0.0], "scale" : 0.4}]
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

},{}],3:[function(require,module,exports){
class Scene3JS {
  constructor() {
    const scene = new THREE.Scene();
    initScene3JS(scene);
    return scene;
  }
}

function initScene3JS(scene) {
  // Light
  const color = 0xffffff;
  const intens = 1;
  const light = new THREE.DirectionalLight(color, intens);
  light.position.set(-1, 2, 4);
  scene.add(light);

  // Meshes
  const geometry = new THREE.CylinderGeometry(0.03, 0.03, 1.02, 32);

  // eslint-disable-next-line no-shadow
  function makeInstance(geometry, color) {
    const material = new THREE.MeshPhongMaterial({ color });
    const cube = new THREE.Mesh(geometry, material);
    scene.add(cube);
    return cube;
  }
  // 4 cylinders
  const c1 = makeInstance(geometry, 0x2194ce);
  c1.position.set(-0.5, 0, 0);

  const c2 = makeInstance(geometry, 0x2194ce);
  c2.position.set(0.5, 0, 0);

  const c3 = makeInstance(geometry, 0x2194ce);
  c3.rotation.z = Math.PI / 2;
  c3.position.set(0, 0.5, 0);

  const c4 = makeInstance(geometry, 0x2194ce);
  c4.rotation.z = Math.PI / 2;
  c4.position.set(0, -0.5, 0);
}

exports.Scene3JS = Scene3JS;

},{}]},{},[1]);
