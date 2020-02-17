/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-undef */
/* eslint-disable no-underscore-dangle */
/* eslint-disable no-console */
/* eslint-disable prefer-const */
/* eslint-disable no-use-before-define */
/* eslint-disable no-var */
const { Model3DScene } = require('./scenes/3DModel.js');
const { Scene3JS } = require('./scenes/3JSModel.js');

window.Module = {
  onRuntimeInitialized: () => init(Module),
};

// This is virtual canvas element that used for capture video frames
let frameCaptureCanvas = document.createElement('canvas');
frameCaptureCanvas.width = 640;
frameCaptureCanvas.height = 480;
let frameCaptureCanvasCtx2D = frameCaptureCanvas.getContext('2d');

function init(module) {
  const constraints = {
    audio: false,
    video: { width: 640, height: 480 },
  };

  navigator.mediaDevices.getUserMedia(constraints)
    .then(success)
    .catch(console.error);

  function success(stream) {
    const video = document.getElementById('video');
    video.srcObject = stream;
    video.onloadedmetadata = () => video.play();

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
    console.log(ImageData);

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
    const aspectRatio = canvasOutput.width / canvasOutput.height;
    let camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 100);

    let scene = new Scene3JS();
    let scene_model = new Model3DScene();

    let renderer = new THREE.WebGLRenderer({
      canvas: canvasOutput,
      antialias: false,
      alpha: true,
    });
    renderer.setClearColor(0x000000, 0);

    // Processing of the given frame in the loop:
    // Take frame image -> Send to Emscripten code to detect or track
    // markers on the frame (only 1 marker simultaniously)
    // -> Find position of the camera -> send it with id to JS
    // -> Add parameters to the camera -> Use given id to render right model
    const cam_par = [];
    // eslint-disable-next-line func-names
    const capture = function () {
      var t0 = Date.now();

      canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);

      imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight).data;
      const inputBuf2 = module._malloc(bufferSize);
      module.HEAPU8.set(imageData, inputBuf2);

      let t1 = Date.now();

      let result = onProcess(inputBuf2, imageWidth, imageHeight);

      let t2 = Date.now();
      console.log('onProcess time is:');
      console.log(t2 - t1);

      // We return array with C++ float type. So we need to get them in JS by using HEAP and memory
      for (let v = 0; v < 10; v++) {
        cam_par.push(Module.HEAPF32[result / Float32Array.BYTES_PER_ELEMENT + v]);
      }
      console.log(cam_par);

      // Rendering depends on marker id. If no marker in scene, it clear all.
      // It should be like ' current_3Dmodel = all_3Dmodels[ id ] '
      let id_marker = cam_par[0];
      if (id_marker === 0) {
        camera = set_camera(camera, cam_par);
        renderer.render(scene, camera);
      } else if (id_marker === 1) {
        console.log('3d Model');
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

      let t4 = Date.now();
      console.log('Total time is:');
      console.log(t4 - t0);

      requestAnimationFrame(capture);
    };

    capture();
  }
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
