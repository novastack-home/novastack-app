import React, { Component } from 'react'
import AugmentedStream from './AugmentedStream'
import Screensaver from './Screensaver'
import DeviceMenu from './DeviceMenu'
import ModelMenu from './ModelMenu'

import CommonGltfScene from '../scenes/CommonGltf'
import BoomBoxScene from '../scenes/BoomBox'
import BoomBoxNoPBRScene from '../scenes/BoomBoxNoPBR'

const initialState = {
  error: null,
  isWaitingCamera: false,
  isWaitingForDevice: false,
  isWaitingForModel: false,
  isReadyForStreaming: false
}

const models = [
  {id: 0, name: "Whale", path : "models/whale/scene.gltf", position : [0.0, -0.5, 0.0], rotation : [0.0, 0.7, 0.5], scale : 0.25},
  {id: 1, name: "Dancing model", path : "models/dancing/scene.gltf", position : [0.0, -1.0, 0.0], rotation : [0.0, -1.0, 0.0], scale : 1.0},
  {id: 2, name: "Boom Box (With environment maps)", path : "models/BoomBox/glTF/BoomBox.gltf", scene: BoomBoxScene, position : [0.0, 0.0, 0.0], rotation : [0.0, Math.PI, 0.0], scale : 60.0},
  {id: 6, name: "Boom Box", path : "models/BoomBox/glTF/BoomBox.gltf", scene: BoomBoxNoPBRScene, position : [0.0, 0.0, 0.0], rotation : [0.0, Math.PI, 0.0], scale : 60.0},
  {id: 4, name: "Dinosaur", path : "models/walkeri/scene.gltf", position : [0.0, -0.5, 0.0], rotation : [0.0, 0.0, 0.0], scale : 0.05},
  {id: 5, name: "Drone", path : "models/drone/scene.gltf", position : [0.0, 0.0, 0.0], rotation : [0.0, 0.0, 0.0], scale : 0.025}
];

class App extends Component {
  state = {}
  stream = null

  componentDidMount = () => {
    /*
    * Request access to media devices and get device list for allow user choose the device
    */
    this.setState({isWaitingCamera: true})

    navigator.mediaDevices.getUserMedia({ audio: false, video: true })
      .then((stream) => {
        this.stream = stream
        this.setState({...initialState, isWaitingForDevice: true})
      })
      .catch(() => {
        this.setState({
          ...initialState,
          error: "Can't get access to your web-camera, please check its connection and reload this page."
        })
      });
  }

  /*
  * Invokes when user choose camera
  */
  handleDeviceChoose = (deviceId) => {
    navigator.mediaDevices.getUserMedia({ audio: false, video: { deviceId } })
      .then(stream => {
        this.stream = stream
        this.setState({...initialState, isWaitingForModel: true})
      })
      .catch(() => {
        this.setState({
          ...initialState,
          error: "Can't get access to your web-camera, please check its connection and reload this page."
        })
      })
  }

  /*
  * Invokes when user choose model
  */
  handleModelChoose = (choosedModel) => {
    let scene;
    if (choosedModel.scene) {
      scene = new choosedModel.scene(choosedModel)
    } else {
      scene = new CommonGltfScene(choosedModel);
    }
    this.setState({...initialState, isReadyForStreaming: true, scene});
  }

  render = () => {
    const state = this.state

    if (state.isReadyForStreaming) {
      return <AugmentedStream stream={this.stream} modelScene={state.scene} />
    } if (state.isWaitingForModel) {
      return <ModelMenu models={models} onModelChoose={this.handleModelChoose} />;
    } if (state.isWaitingForDevice) {
      return <DeviceMenu onDeviceChoose={this.handleDeviceChoose} stream={this.stream} />
    } if (state.isWaitingCamera) {
      return <Screensaver icon="../icons/camera.svg" message="Please, allow access to your camera." />
    } else if (state.error) {
      return <Screensaver icon="../icons/error.svg" message={state.error} />
    } else {
      return <Screensaver icon="../icons/trolley.svg" message="Loading." />
    }
  }
}

export default App
