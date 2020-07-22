import React, { Component } from 'react'

class DeviceMenu extends Component {
  state = {
    devices: []
  }

  componentDidMount() {
    navigator.mediaDevices.enumerateDevices()
    .then((devices) => {
      devices = devices.filter(d => d.kind === 'videoinput');
      devices = devices.map((device) => {
        return <li
          key={device.deviceId}
          onClick={() => this.props.onDeviceChoose(device.deviceId)}
        >
          {device.label}
        </li>
      });
      this.setState({devices})
    })
    .then(() => {
      // Stop streaming after getting device id's
      this.props.stream.getTracks().forEach(t => t.stop());
    })
  }

  render() {
    return (
      <ul className="device-list">{this.state.devices}</ul>
    )
  }
}

export default DeviceMenu
