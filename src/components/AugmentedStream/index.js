import React, { Component } from "react";
import AppBar from "@material-ui/core/AppBar";
import Toolbar from "@material-ui/core/Toolbar";
import Typography from "@material-ui/core/Typography";
import Button from "@material-ui/core/Button";
import IconButton from "@material-ui/core/IconButton";
import MenuIcon from "@material-ui/icons/Menu";
import * as THREE from "three";
import { OrbitControls } from "three/examples/jsm/controls/OrbitControls";
import { RGBELoader } from "three/examples/jsm/loaders/RGBELoader.js";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";
import Stats from "stats.js";
import ProgressBar from "../ProgressBar";
import Container from "../Container";

import { modelsConfig } from "../../models-config";

import CommonGltfScene from "../../scenes/CommonGltf";

import { withStyles } from "@material-ui/core/styles";

const styles = () => ({
    loadingOverlay: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingMessage: {
        fontSize: "16px",
        lineHeight: "24px",
        letterSpacing: "0.29px",
        color: "#ffffff",
    },
    loadingOverlay: {
        width: "100%",
        height: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
    },
    loadingMessage: {
        fontSize: "16px",
        lineHeight: "24px",
        letterSpacing: "0.29px",
        color: "#ffffff",
    },
    toolbar: {
        height: "50px",
        backgroundColor: "#29194C",
    },
});

var onProcess, addMarker, finalizeMarkers;

var wasmModule,
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
    gltfLoader;

var requestedFrameId;

// This is virtual canvas element that used for capture video frames
let frameCaptureCanvas = document.getElementById("captureCanvas");
let canvasContext = frameCaptureCanvas.getContext("2d");
// This parameters improve performance
canvasContext.imageSmoothingEnabled = false;
canvasContext.globalCompositeOperation = "copy";

var canvasOutput = document.getElementById("canvasOutput");
var video = document.getElementById("video");

gltfLoader = new GLTFLoader();

// Configure metrics
const statsFPS = new Stats();
statsFPS.dom.style.top = "64px";
statsFPS.showPanel(0);
// document.body.appendChild(statsFPS.dom);

window.Module = {
    onRuntimeInitialized: () => {
        wasmModule = window.Module;
    },
};

function setCamera(par) {
    let k = cameraScale;
    camera.position.set(par[1] * k, par[2] * k, par[3] * k);
    camera.lookAt(par[4], par[5], par[6]);
    camera.up.set(par[7], par[8], par[9]);
}

function addMarkerFromImg(wasmModule, addMarker, markerData, width, height) {
    console.log("Load Marker");
    let bufferSizeMarker = width * height * 4;

    let markerBuf = wasmModule._malloc(bufferSizeMarker);
    wasmModule.HEAPU8.set(markerData.data, markerBuf);

    addMarker(markerBuf, width, height);
    wasmModule._free(markerBuf);
    wasmModule._free(markerData);
}

async function addMarkers(wasmModule, addMarker, finalizeMarkers) {
    const markersFolderPath = "./images/ar_markers/";
    const nmarkers = 6;
    const markersLoading = [];

    // Virtual canvas element for capture image data from img
    const canvasImg = document.createElement("canvas");
    const contextImg = canvasImg.getContext("2d");

    for (let i = 1; i <= nmarkers; i++) {
        let imagePath = `${markersFolderPath}M${i}.png`;
        let img = new Image();
        img.src = imagePath;
        markersLoading.push(
            new Promise((resolve) => {
                img.onload = () => {
                    resolve(img);
                };
            })
        );
    }

    const loadedMarkers = await Promise.all(markersLoading);

    loadedMarkers.forEach((img) => {
        canvasImg.width = img.width;
        canvasImg.height = img.height;
        contextImg.drawImage(img, 0, 0);
        const markerData = contextImg.getImageData(0, 0, img.width, img.height);
        addMarkerFromImg(
            wasmModule,
            addMarker,
            markerData,
            img.width,
            img.height
        );
    });

    finalizeMarkers();
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

async function initEmscriptenFunctions() {
    // Prepare Emscripten functions
    const onInitDef = wasmModule.cwrap("onInitDef", null, [
        "number",
        "number",
        "number",
    ]);
    addMarker = wasmModule.cwrap("addMarker", null, [
        "number",
        "number",
        "number",
    ]);
    onProcess = wasmModule.cwrap("onProcess", "number", [
        "number",
        "number",
        "number",
        "number",
    ]);
    finalizeMarkers = wasmModule.cwrap("finalizeMarkers", null);

    // Prepare space for initial frame and result image{cv}
    // It will be rewritten everytime - you do not need to free memory in the loop
    imageWidth = frameCaptureCanvas.width;
    imageHeight = frameCaptureCanvas.height;

    canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);
    let imageData = canvasContext.getImageData(0, 0, imageWidth, imageHeight);
    // console.log(ImageData);

    // Initialize engine in Emscipten code. It get a 'pointer' to the image and works with it
    // After using, we need to delete allocated space, it cannot be done automaically.
    bufferSize = imageWidth * imageHeight * 4;
    let inputBuf = wasmModule._malloc(bufferSize);
    let temp1 = new Uint8ClampedArray(
        wasmModule.HEAPU8.buffer,
        inputBuf,
        bufferSize
    );
    temp1.set(imageData.data, 0);

    onInitDef(inputBuf, imageWidth, imageHeight);
    wasmModule._free(inputBuf);
    wasmModule._free(temp1);
    wasmModule._free(imageData);

    // Add marker-images that should be detected on the frame
    // When all markers are added, we call 'finalize' function to prepare right id for markers.
    await addMarkers(wasmModule, addMarker, finalizeMarkers);
}

async function loadEnvironmentTexture() {
    return new Promise((resolve, reject) => {
        let rgbeLoader = new RGBELoader()
            .setDataType(THREE.UnsignedByteType)
            .setPath("../../textures/equirectangular/");

        rgbeLoader.load(
            "venice_sunset_1k.hdr",
            (texture) => {
                envTexture = pmremGenerator.fromEquirectangular(texture)
                    .texture;
                resolve(envTexture);
            },
            () => {},
            reject
        );
    });
}

function handleWindowResize() {
    try {
        renderer.setSize(
            canvasOutput.offsetWidth,
            canvasOutput.offsetHeight,
            false
        );
        camera.aspect = canvasOutput.offsetWidth / canvasOutput.offsetHeight;
        camera.updateProjectionMatrix();
        calculateCameraScale();
    } catch (e) {
        console.error(e);
    }
}

// Capture variables
let imageData,
    inputBuf2,
    cam_par = [],
    result;

// Prepare THREE.js renderer and scene
const aspectRatio = canvasOutput.offsetWidth / canvasOutput.offsetHeight;
camera = new THREE.PerspectiveCamera(45, aspectRatio, 0.1, 100);

renderer = new THREE.WebGLRenderer({
    canvas: canvasOutput,
    antialias: true,
    alpha: true,
    powerPreference: "high-performance",
    precision: "highp",
    logarithmicDepthBuffer: "auto",
});
renderer.physicallyCorrectLights = true;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap; // default THREE.PCFShadowMap
renderer.setClearColor(0x000000, 0);
renderer.setSize(canvasOutput.offsetWidth, canvasOutput.offsetHeight, false);

pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();

window.addEventListener("resize", handleWindowResize);

cameraControls = new OrbitControls(camera, renderer.domElement);
cameraControls.enableDamping = true;
cameraControls.dampingFactor = 0.05;
cameraControls.rotateSpeed = 0.87;

clock = new THREE.Clock();

class AugmentedStream extends Component {
    state = {
        isModelLoading: true,
        isExploring: false,
        isStreaming: false,
    };

    init = async () => {
        if (!onProcess && !addMarker) {
            await initEmscriptenFunctions();
        }

        calculateCameraScale();

        if (!envTexture) {
            await loadEnvironmentTexture();
        }

        pmremGenerator.dispose();

        modelScene.onModelLoading = this.handleModelLoading;
        modelScene.onReady = this.handleModelReady;
        modelScene.init(gltfLoader, renderer, envTexture);
    };

    capture = () => {
        statsFPS.begin();

        const { isExploring, isStreaming } = this.state;

        // Get new image data if user is not exploring model or image data not initialized
        // Else pass saved image data
        if (!isExploring || !imageData) {
            canvasContext.drawImage(video, 0, 0, imageWidth, imageHeight);
            imageData = canvasContext.getImageData(
                0,
                0,
                imageWidth,
                imageHeight
            ).data;
        }

        if (isStreaming) {
            inputBuf2 = wasmModule._malloc(bufferSize);
            wasmModule.HEAPU8.set(imageData, inputBuf2);
            result = onProcess(inputBuf2, imageWidth, imageHeight, 1); // Last parameter is frameNum
            cam_par = [];
            // We return array with C++ float type. So we need to get them in JS by using HEAP and memory
            for (let v = 0; v < 10; v++) {
                cam_par.push(
                    Module.HEAPF32[result / Float32Array.BYTES_PER_ELEMENT + v]
                );
            }
        }

        if (modelScene && modelScene.scene && cam_par[0] >= 0) {
            !isExploring && setCamera(cam_par);
            renderer.render(modelScene.scene, camera);
        } else {
            renderer.clear();
        }

        if (modelScene && isStreaming) {
            modelScene.animate(clock.getDelta());
        }

        wasmModule._free(inputBuf2);
        wasmModule._free(result);

        cameraControls.update();

        statsFPS.end();

        requestAnimationFrame(this.capture);
    };

    handleModelLoading = (xhr) => {
        let newState = { isModelLoading: true };
        if (xhr.lengthComputable) {
            var percentComplete = (xhr.loaded / xhr.total) * 100;
            newState.modelLoadingProgress = Math.round(percentComplete);
        }
        this.setState(newState);
    };

    handleModelReady = () => {
        this.setState({
            isModelLoading: false,
        });
    };

    componentDidMount = () => {
        const choosedModelConfig = modelsConfig
            .filter((m) => m.id === this.props.choosedModelId)
            .shift();
        modelScene = new CommonGltfScene(choosedModelConfig);

        video.srcObject = this.props.stream;
        video.onloadedmetadata = () => {
            frameCaptureCanvas.width = video.videoWidth;
            frameCaptureCanvas.height = video.videoHeight;

            video.play();
            this.init();
        };
    };

    dispose = () => {
        this.setState(
            (state) => Object.assign(state, { isStreaming: false }),
            () => {
                cancelAnimationFrame(requestedFrameId);
                modelScene.dispose();
                this.props.onDispose();
                renderer.renderLists.dispose();
                renderer.dispose();
                modelScene = null;
                cam_par = [];
                canvasContext.clearRect(
                    0,
                    0,
                    frameCaptureCanvas.width,
                    frameCaptureCanvas.height
                );
            }
        );
    };

    explore = () => {
        this.setState((state) =>
            Object.assign(state, { isExploring: !state.isExploring })
        );
    };

    scanOrPause = () => {
        if (this.state.isStreaming) {
            this.setState((state) =>
                Object.assign(state, { isStreaming: false })
            );
        } else {
            this.setState(
                (state) => Object.assign(state, { isStreaming: true }),
                () => this.capture()
            );
        }
    };

    render() {
        const { classes } = this.props;
        return (
            <div>
                {this.state.isModelLoading ? (
                    <div className={classes.loadingOverlay}>
                        <Container>
                            <p className={classes.loadingMessage}>
                                Loading model ...
                            </p>
                            {this.state.modelLoadingProgress && (
                                <ProgressBar
                                    value={this.state.modelLoadingProgress}
                                />
                            )}
                        </Container>
                    </div>
                ) : (
                    <React.Fragment>
                        <AppBar position="fixed">
                            <Toolbar className={classes.toolbar}>
                                <IconButton
                                    edge="start"
                                    color="inherit"
                                    aria-label="menu"
                                >
                                    <MenuIcon />
                                </IconButton>
                                <Button onClick={this.dispose} color="inherit">
                                    Dispose
                                </Button>
                                <Button
                                    onClick={this.explore}
                                    color={
                                        this.state.isExploring
                                            ? "secondary"
                                            : "inherit"
                                    }
                                >
                                    Explore
                                </Button>
                                <Button
                                    onClick={this.scanOrPause}
                                    color="inherit"
                                >
                                    {this.state.isStreaming ? "Pause" : "Scan"}
                                </Button>
                            </Toolbar>
                        </AppBar>
                    </React.Fragment>
                )}
            </div>
        );
    }
}

export default withStyles(styles)(AugmentedStream);
