import React, { Component } from 'react'
import AppBar from '@material-ui/core/AppBar';
import Toolbar from '@material-ui/core/Toolbar';
import Typography from '@material-ui/core/Typography';
import Button from '@material-ui/core/Button';
import IconButton from '@material-ui/core/IconButton';
import MenuIcon from '@material-ui/icons/Menu';
import * as THREE from 'three'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls'
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js'
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js'
import Stats from 'stats.js'
import ProgressBar from './ProgressBar'
import Container from './Container'
import Scene from '../Scene'

var onProcess,
    wasmModule,
    modelScene,
    camera,
    cameraControls,
    cameraScale, 
    renderer, 
    envTexture,
    imageWidth, 
    imageHeight, 
    bufferSize, 
    onProcess, 
    clock, 
    pmremGenerator, 
    gltfLoader,
    requestedFrameId,
    animationMixer;

// This is virtual canvas element that used for capture video frames
let frameCaptureCanvas = document.getElementById('captureCanvas');
let canvasContext = frameCaptureCanvas.getContext('2d');
// This parameters improve performance
canvasContext.imageSmoothingEnabled = false;
canvasContext.globalCompositeOperation = 'copy';

var canvasOutput = document.getElementById('canvasOutput');
var video = document.getElementById('video');

gltfLoader = new GLTFLoader();

// Configure metrics
const statsFPS = new Stats();
statsFPS.dom.style.top = '64px'
statsFPS.showPanel(0);
// document.body.appendChild(statsFPS.dom);

window.Module = {
  onRuntimeInitialized: () => {
    wasmModule = window.Module
  },
};

function setCamera(par) {
  let k = cameraScale;
  camera.position.set(par[1]*k, par[2]*k, par[3]*k);
  camera.lookAt(par[4], par[5], par[6]);
  camera.up.set(par[7], par[8], par[9]);
}

function calculateCameraScale() {
  let videoAspectRatio = video.videoWidth / video.videoHeight;
  let videoPixelHeight = canvasOutput.offsetWidth / videoAspectRatio;
  // let videoPixelWidth = window.innerHeight * videoAspectRatio;
  if (videoPixelHeight < canvasOutput.offsetHeight) {
    cameraScale = canvasOutput.offsetHeight / videoPixelHeight;
  } else {
    cameraScale = 1;
  }
}

function initEmscriptenFunctions() {
  // Prepare Emscripten functions
  const onInitDef = wasmModule.cwrap('onInitDef', null, ['number', 'number', 'number']);
  const addMarker = wasmModule.cwrap('addMarker', null, ['number', 'number', 'number']);
  const finalizeMarkers = wasmModule.cwrap('finalizeMarkers', null);
  onProcess = wasmModule.cwrap('onProcess', 'number', ['number', 'number', 'number', 'number']);

  // Prepare space for initial frame and result image{cv}
  // It will be rewritten everytime - you do not need to free memory in the loop
  imageWidth = frameCaptureCanvas.width;
  imageHeight = frameCaptureCanvas.height;

  canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);
  let imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight);

  // Initialize engine in Emscipten code. It get a 'pointer' to the image and works with it
  // After using, we need to delete allocated space, it cannot be done automaically.
  bufferSize = imageWidth * imageHeight * 4;
  let inputBuf = wasmModule._malloc(bufferSize);
  let temp1 = new Uint8ClampedArray(wasmModule.HEAPU8.buffer, inputBuf, bufferSize);
  temp1.set(imageData.data, 0);

  onInitDef(inputBuf, imageWidth, imageHeight);
  wasmModule._free(inputBuf);
  wasmModule._free(temp1);
  wasmModule._free(imageData);

  // Add marker-images that should be detected on the frame
  // When all markers are added, we call 'finalizeMarkers' function to prepare right id for markers.
  let canvasImg = document.createElement('canvas');
  let contextImg = canvasImg.getContext('2d');
  let markers = document.querySelectorAll('img[id*="img"]');

  for (let i = 0; i < markers.length; i++) {
    const img = markers[i];
    canvasImg.width = img.width;
    canvasImg.height = img.height;
    contextImg.drawImage(img, 0, 0);
    const markerData = contextImg.getImageData(0, 0, img.width, img.height);
    let bufferSizeMarker = img.width * img.height * 4;
    let markerBuf = wasmModule._malloc(bufferSizeMarker);
    wasmModule.HEAPU8.set(markerData.data, markerBuf);
    addMarker(markerBuf, img.width, img.height);
    wasmModule._free(markerBuf);
    wasmModule._free(markerData);
  }
  finalizeMarkers();
  canvasImg = undefined;
}

async function loadEnvironmentTexture() {
  return new Promise((resolve, reject) => {
    let rgbeLoader = new RGBELoader()
      .setDataType( THREE.UnsignedByteType )
      .setPath( '../../textures/' )

    rgbeLoader.load( 'venice_sunset_1k.hdr', texture => {
      envTexture = pmremGenerator.fromEquirectangular( texture ).texture;
      resolve(envTexture);
    }, () => {}, reject)
  })
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

// Capture variables
let imageData, inputBuf2, cam_par = [], result;

// Prepare THREE.js renderer and camera
const aspectRatio = canvasOutput.offsetWidth / canvasOutput.offsetHeight;
camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 100);

renderer = new THREE.WebGLRenderer({
  canvas: canvasOutput,
  antialias: true,
  alpha: true,
  powerPreference: "high-performance",
  precision: "highp",
  logarithmicDepthBuffer: "auto"
});
renderer.setClearColor(0x000000, 0);
renderer.setSize(canvasOutput.offsetWidth, canvasOutput.offsetHeight, false);
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1;
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;

pmremGenerator = new THREE.PMREMGenerator( renderer );
pmremGenerator.compileEquirectangularShader();

window.addEventListener('resize', handleWindowResize);

cameraControls = new OrbitControls( camera, renderer.domElement );
cameraControls.enableDamping = true;
cameraControls.dampingFactor = 0.05;
cameraControls.rotateSpeed = 0.87;

clock = new THREE.Clock();

class AugmentedStream extends Component {
  state = {
    isModelLoading: true,
    isExploring: false,
    isStreaming: false
  }

  loadModel = async () => {
    const { choosedModelConfig } = this.props;

    return new Promise((resolve, reject) => {
      gltfLoader.load(choosedModelConfig.path, gltf => {
        this.setState({
          isModelLoading: false
        });
        resolve(gltf);
      }, this.handleModelLoading, reject);
    });
  }

  init = async () => {
    const gltfModel = await this.loadModel();

    if (!onProcess) {
      initEmscriptenFunctions();
    }

    calculateCameraScale();

    if (!envTexture) {
      await loadEnvironmentTexture();
    }

    pmremGenerator.dispose();

    // If model has animations create animation mixer to play them
    animationMixer = new THREE.AnimationMixer(gltfModel.scene);
    gltfModel.animations.forEach((clip) => animationMixer.clipAction(clip).play());

    modelScene = new Scene(this.props.choosedModelConfig);
    modelScene.init(gltfModel, envTexture);
  }

  capture = () => {
    statsFPS.begin()

    const {isExploring, isStreaming} = this.state;

    // Get new image data if user is not exploring model or image data not initialized
    // Else pass saved image data
    if (!isExploring || !imageData) {
        canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);
        imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight).data;
    }

    if (isStreaming) {
      inputBuf2 = wasmModule._malloc(bufferSize);
      wasmModule.HEAPU8.set(imageData, inputBuf2);
      result = onProcess(inputBuf2, imageWidth, imageHeight, 1); // Last parameter is frameNum
      cam_par = []
      // We return array with C++ float type. So we need to get them in JS by using HEAP and memory
      for (let v = 0; v < 10; v++) {
        cam_par.push(Module.HEAPF32[result / Float32Array.BYTES_PER_ELEMENT + v]);
      }
    }

    if (modelScene && modelScene.scene && cam_par[0] >= 0) {
      !isExploring && setCamera(cam_par);
      renderer.render(modelScene.scene, camera);
    } else {
      renderer.clear();
    }

    if (modelScene && isStreaming) {
      animationMixer.update(clock.getDelta());
    }

    wasmModule._free(inputBuf2);
    wasmModule._free(result);

    cameraControls.update();

    statsFPS.end()

    requestAnimationFrame(this.capture);
  }

  handleModelLoading = (xhr) => {
    let newState = { isModelLoading: true }
    if ( xhr.lengthComputable ) {
  		var percentComplete = xhr.loaded / xhr.total * 100;
      newState.modelLoadingProgress = Math.round(percentComplete)
  	}
    this.setState(newState)
  }

  componentDidMount = () => {
    video.srcObject = this.props.stream;
    video.onloadedmetadata = () => {
      frameCaptureCanvas.width = video.videoWidth;
      frameCaptureCanvas.height = video.videoHeight;

      video.play();
      this.init();
    };
  }

  dispose = () => {
    this.setState(
      state => Object.assign(state, {isStreaming: false}),
      () => {
        cancelAnimationFrame(requestedFrameId);
        modelScene.dispose();
        this.props.onDispose();
        renderer.renderLists.dispose();
        renderer.dispose();
        modelScene = null;
        cam_par = [];
        canvasContext.clearRect(0, 0, frameCaptureCanvas.width, frameCaptureCanvas.height);
      }
    );
  }

  explore = () => {
    this.setState(state => Object.assign(state, {isExploring: !state.isExploring}))
  }

  scanOrPause = () => {
      if (this.state.isStreaming) {
        this.setState(state => Object.assign(state, {isStreaming: false}))
      } else {
        this.setState(
          state => Object.assign(state, {isStreaming: true}),
          () => this.capture()
        )
      }
  }

  render = () => {
    return <div>
      {this.state.isModelLoading
        ? <LoadingProgressOverlay progress={this.state.modelLoadingProgress} />
        : <React.Fragment>
          <AppBar position="fixed">
            <Toolbar>
              <IconButton edge="start" color="inherit" aria-label="menu">
                <MenuIcon />
              </IconButton>
              <Button onClick={this.dispose} color="inherit">Dispose</Button>
              <Button onClick={this.explore} color={this.state.isExploring ? "secondary" : "inherit"}>Explore</Button>
              <Button onClick={this.scanOrPause} color="inherit">{this.state.isStreaming ? 'Pause' : 'Scan'}</Button>
            </Toolbar>
          </AppBar>
        </React.Fragment>
      }
    </div>
  }
}

const LoadingProgressOverlay = (props) => (
  <div className="loading-progress-overlay">
    <Container>
      <Typography variant="h5">Loading</Typography>
      {props.progress && <ProgressBar value={props.progress} />}
    </Container>
  </div>
)

export default AugmentedStream
