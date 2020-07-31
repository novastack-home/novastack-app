(function(){function r(e,n,t){function o(i,f){if(!n[i]){if(!e[i]){var c="function"==typeof require&&require;if(!f&&c)return c(i,!0);if(u)return u(i,!0);var a=new Error("Cannot find module '"+i+"'");throw a.code="MODULE_NOT_FOUND",a}var p=n[i]={exports:{}};e[i][0].call(p.exports,function(r){var n=e[i][1][r];return o(n||r)},p,p.exports,r,e,n,t)}return n[i].exports}for(var u="function"==typeof require&&require,i=0;i<t.length;i++)o(t[i]);return o}return r})()({1:[function(require,module,exports){
/* eslint-disable no-plusplus */
/* eslint-disable camelcase */
/* eslint-disable no-undef */
/* eslint-disable no-underscore-dangle */
/* eslint-disable prefer-const */
/* eslint-disable no-use-before-define */
/* eslint-disable no-var */
const Stats = require('stats.js');

const { Model3DScene } = require('./scenes/3DModel.js');
const { Scene3JS } = require('./scenes/3JSModel.js');

// Size of video stream
let VIDEO_WIDTH, VIDEO_HEIGHT;

// Output canvas where threejs renders scene
let canvasOutput = document.getElementById('canvasOutput');

// Scale value for make corrections for aspect ratio
let cameraScale;

let renderer;
let camera;

// Store scenes and animation mixers for them
let modelScenes = new Map();
let animationMixers = new Map();

window.Module = {
  onRuntimeInitialized: () => bootstrap(Module),
};

// This is virtual canvas element that used for capture video frames
let frameCaptureCanvas = document.createElement('canvas');
let frameCaptureCanvasCtx2D = frameCaptureCanvas.getContext('2d');

window.addEventListener('resize', handleWindowResize);

// Init Stats.js. It shows performance graphs. https://github.com/mrdoob/stats.js
let stats = new Stats();
let statsImgCapt = new Stats();
let statsProcess = new Stats();

stats.showPanel( 0 ); // 0: fps, 1: ms, 2: mb, 3+: customstatsImgCapt.showPanel( 1 );
stats.domElement.style.cssText = 'position:absolute;top:40px;left:0px;';

statsImgCapt.showPanel( 1 );
statsImgCapt.domElement.style.cssText = 'position:absolute;top:88px;left:0px;';

statsProcess.showPanel( 1 );
statsProcess.domElement.style.cssText = 'position:absolute;top:136px;left:0px;';

document.body.appendChild( stats.dom );
document.body.appendChild( statsImgCapt.dom );
document.body.appendChild( statsProcess.dom );

// We should get access to camera and load video metadata before calling init()
function bootstrap(module) {
  requestMediaDevice()
    .then(success)
    .catch(cameraError);

  // Load models and create a scenes for them
  if (navigator.mediaDevices.getUserMedia) {
    modelScenes = new Model3DScene(animationMixers);
  }

  function success(stream) {
    updateSaver();
    const video = document.getElementById('video');
    video.srcObject = stream;
    video.onloadedmetadata = () => {
      VIDEO_WIDTH = video.videoWidth;
      VIDEO_HEIGHT = video.videoHeight;
      calculateCameraScale();

      frameCaptureCanvas.width = VIDEO_WIDTH;
      frameCaptureCanvas.height = VIDEO_HEIGHT;
      video.play();
      init(module);
    };
  }

  function cameraError(err) {
    console.error(err);
    updateSaver("cameraError");
  }
}

function init(module) {
  // It's used to capture frame and invisible
  const canvasVideo = frameCaptureCanvas;
  const canvasContext = frameCaptureCanvasCtx2D;
  // This parameters improve performance
  canvasContext.imageSmoothingEnabled = false;
  canvasContext.globalCompositeOperation = 'copy';

  // Prepare Emscrypten functions
	const onInitDef = module.cwrap('onInitDef', null, ['number', 'number', 'number']);
	const addMarker = module.cwrap('addMarker', null, ['number', 'number', 'number']);
	const onProcess = module.cwrap('onProcess', 'number', ['number', 'number', 'number', 'number']);
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

  onInitDef(inputBuf, imageWidth, imageHeight);
  module._free(inputBuf);
  module._free(temp1);
  module._free(imageData);

  // Add marker-images that should be detected on the frame
  // When all markers are added, we call 'finalize' function to prepare right id for markers.
  addMarkers(module, addMarker, finalizeMarkers);


  // Now we initialize 3JS components: 'scene', 'camera' and 'render'
  // Scene consists 'light' and 'meshes'(objects with geometry and textures)

  const aspectRatio = canvasOutput.offsetWidth / canvasOutput.offsetHeight;
  camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 100);

  // Prepare handmade square model
  let sceneSquare = new Scene3JS();

  var clock = new THREE.Clock();

  renderer = new THREE.WebGLRenderer({
    canvas: canvasOutput,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    precision: "highp",
    logarithmicDepthBuffer: "auto"
  });
  renderer.physicallyCorrectLights = true;
  renderer.shadowMap.enabled = true;
  renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
  renderer.setClearColor(0x000000, 0);
  renderer.setSize(canvasOutput.offsetWidth, canvasOutput.offsetHeight, false);

  // Processing of the given frame in the loop:
  // Take frame image -> Send to Emscripten code to detect or track
  // markers on the frame (only 1 marker simultaniously)
  // -> Find position of the camera -> send it with id to JS
  // -> Add parameters to the camera -> Use given id to render right model
  const cam_par = [];
  // eslint-disable-next-line func-names
  const capture = function () {
    stats.begin();
    // var t0 = Date.now();

    statsImgCapt.begin();
    canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);
    imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight).data;
    statsImgCapt.end();
    statsImgCapt.update();

    const inputBuf2 = module._malloc(bufferSize);
    module.HEAPU8.set(imageData, inputBuf2);

    // Frame counter for statistics (Disabled now)
    let frameNum = 1; 
    statsProcess.begin();
		let result = onProcess(inputBuf2, imageWidth, imageHeight, frameNum);
    statsProcess.end();
    statsProcess.update();

    // We return array with C++ float type. So we need to get them in JS by using HEAP and memory
    for (let v = 0; v < 10; v++) {
      cam_par.push(Module.HEAPF32[result / Float32Array.BYTES_PER_ELEMENT + v]);
    }

    // Rendering depends on marker id. If no marker in scene, it clear all.
    // It should be like ' current_3Dmodel = all_3Dmodels[ id ] '
    let id_marker = cam_par[0];

    let mixer = animationMixers.get(id_marker);
    if (mixer) {
      var delta = clock.getDelta();
      mixer.update( delta );
    }
     if (id_marker === 3){
      camera = set_camera(camera, cam_par);
      renderer.render(sceneSquare, camera);
     } else if (id_marker >= 0 ) {
      let scene3D = modelScenes.get(id_marker);
      // console.log('3d Model');
      if (scene3D) {
        camera = set_camera(camera, cam_par);
        renderer.render(scene3D, camera);
      } else {
        console.warn('No scene available for marker id', id_marker);
      }
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

    stats.end();
    requestAnimationFrame(capture);
  };

  capture();

}

function set_camera(camera, par) {
  let k = cameraScale;
  camera.position.set(par[1]*k, par[2]*k, par[3]*k);
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
  //console.log(ImageData);
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
  const markersFolderPath = './images/ar_markers/';
  const nmarkers = 6;

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

// This function handles saver's state
const updateSaver = (status) => {
  const saverContent = document.querySelector('.saver-content');
  let message, iconSrc;
  if (status == "camera") {
    message = "Please, allow access to your camera.";
    iconSrc = "./icons/camera.svg";
  } else if (status == "error") {
    message = "Ooops! Something went wrong.";
    iconSrc = "./icons/error.svg";
  } else if (status == "mediaError") {
    iconSrc = "./icons/browser.svg";
    message = "Cant't get access to device camera. Disable ad blocker or try to update your browser.";
  } else if (status == "cameraError") {
    iconSrc = "./icons/error.svg";
    message = "Can't get access to your web-camera, please check its connection and reload this page.";
  } else if (status == 'choose') {
    message = "Choose your device camera:";
    iconSrc = "./icons/camera.svg";
  } else if (status == "loading") {
    message = "Loading...";
    iconSrc = "./icons/trolley.svg"
  }

  if (message && iconSrc) {
    saverContent.innerHTML = `
      <img src=${iconSrc} />
      <p>${message}</p>
    `;
  } else {
    document.querySelector('.saver').style.display = "none";
  }
}

function calculateCameraScale() {
  let videoAspectRatio = VIDEO_WIDTH / VIDEO_HEIGHT;
  let videoPixelHeight = canvasOutput.offsetWidth / videoAspectRatio;
  // let videoPixelWidth = window.innerHeight * videoAspectRatio;
  if (videoPixelHeight < canvasOutput.offsetHeight) {
    cameraScale = canvasOutput.offsetHeight / videoPixelHeight;
  } else {
    cameraScale = 1;
  }
}

function handleWindowResize() {
  try {
    renderer.setSize(canvasOutput.offsetWidth, canvasOutput.offsetHeight, false);
    camera.aspect = canvasOutput.offsetWidth / canvasOutput.offsetHeight;
    camera.updateProjectionMatrix();
    calculateCameraScale();
  } catch (e) {
    console.error(e);
  }
}

function requestMediaDevice() {
  return new Promise(function(resolve, reject) {
    updateSaver('camera');
    if (navigator.mediaDevices.getUserMedia) {
      // To get deviceId's and labels we should request access first
      navigator.mediaDevices.getUserMedia({ audio: false, video: true })
        .then(success)
        .catch(reject);
    } else {
      console.error(err);
      updateSaver("mediaError");
    }

    function success(stream) {
      updateSaver('choose');
      navigator.mediaDevices.enumerateDevices()
        .then((devices) => {
          devices = devices.filter(d => d.kind === 'videoinput');

          let deviceList = document.createElement('ul');
          deviceList.classList.add('device-list');
          devices.forEach((device) => {
            let listItem = document.createElement('li');
            listItem.addEventListener('click', () => {
              updateSaver("loading");
              let deviceId = device.deviceId;
              navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId } })
                .then(resolve)
                .catch(reject)
            });
            listItem.innerHTML = device.label;
            deviceList.appendChild(listItem);
          });
          document.querySelector('.saver-content').appendChild(deviceList);
      })
      .then(() => {
        stream.getTracks().forEach(t => t.stop());
      })
    }
  });
}

},{"./scenes/3DModel.js":2,"./scenes/3JSModel.js":3,"stats.js":4}],2:[function(require,module,exports){
// Sync
class Model3DScene {
  constructor(animationMixers){
    let sceneModels = new Map();
    init3Dmodel(sceneModels, animationMixers);
    return sceneModels;
  }
}

function init3Dmodel(sceneModels, animationMixers) {// Add model with parameters from JSON
  const configJSON = `{
  "models": [
    {"id": 0, "path" : "models/whale/scene.gltf", "position" : [0.0, -0.5, 0.0], "rotation" : [0.0, 0.7, 0.5], "scale" : 0.25},
    {"id": 1, "path" : "models/dancing/scene.gltf", "position" : [0.0, -1.0, 0.0], "rotation" : [0.0, -1.0, 0.0], "scale" : 1.0},
    {"id": 2, "path" : "models/tokyo/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [0.0, 0.0, 0.0], "scale" : 0.004},
    {"id": 4, "path" : "models/walkeri/scene.gltf", "position" : [0.0, -0.5, 0.0], "rotation" : [0.0, 0.0, 0.0], "scale" : 0.05},
    {"id": 5, "path" : "models/drone/scene.gltf", "position" : [0.0, 0.0, 0.0], "rotation" : [0.0, 0.0, 0.0], "scale" : 0.025}
  ]}`;
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
      console.log('Created scene for model', m.path);
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

},{}],4:[function(require,module,exports){
// stats.js - http://github.com/mrdoob/stats.js
(function(f,e){"object"===typeof exports&&"undefined"!==typeof module?module.exports=e():"function"===typeof define&&define.amd?define(e):f.Stats=e()})(this,function(){var f=function(){function e(a){c.appendChild(a.dom);return a}function u(a){for(var d=0;d<c.children.length;d++)c.children[d].style.display=d===a?"block":"none";l=a}var l=0,c=document.createElement("div");c.style.cssText="position:fixed;top:0;left:0;cursor:pointer;opacity:0.9;z-index:10000";c.addEventListener("click",function(a){a.preventDefault();
u(++l%c.children.length)},!1);var k=(performance||Date).now(),g=k,a=0,r=e(new f.Panel("FPS","#0ff","#002")),h=e(new f.Panel("MS","#0f0","#020"));if(self.performance&&self.performance.memory)var t=e(new f.Panel("MB","#f08","#201"));u(0);return{REVISION:16,dom:c,addPanel:e,showPanel:u,begin:function(){k=(performance||Date).now()},end:function(){a++;var c=(performance||Date).now();h.update(c-k,200);if(c>g+1E3&&(r.update(1E3*a/(c-g),100),g=c,a=0,t)){var d=performance.memory;t.update(d.usedJSHeapSize/
1048576,d.jsHeapSizeLimit/1048576)}return c},update:function(){k=this.end()},domElement:c,setMode:u}};f.Panel=function(e,f,l){var c=Infinity,k=0,g=Math.round,a=g(window.devicePixelRatio||1),r=80*a,h=48*a,t=3*a,v=2*a,d=3*a,m=15*a,n=74*a,p=30*a,q=document.createElement("canvas");q.width=r;q.height=h;q.style.cssText="width:80px;height:48px";var b=q.getContext("2d");b.font="bold "+9*a+"px Helvetica,Arial,sans-serif";b.textBaseline="top";b.fillStyle=l;b.fillRect(0,0,r,h);b.fillStyle=f;b.fillText(e,t,v);
b.fillRect(d,m,n,p);b.fillStyle=l;b.globalAlpha=.9;b.fillRect(d,m,n,p);return{dom:q,update:function(h,w){c=Math.min(c,h);k=Math.max(k,h);b.fillStyle=l;b.globalAlpha=1;b.fillRect(0,0,r,m);b.fillStyle=f;b.fillText(g(h)+" "+e+" ("+g(c)+"-"+g(k)+")",t,v);b.drawImage(q,d+a,m,n-a,p,d,m,n-a,p);b.fillRect(d+n-a,m,a,p);b.fillStyle=l;b.globalAlpha=.9;b.fillRect(d+n-a,m,a,g((1-h/w)*p))}}};return f});

},{}]},{},[1]);
