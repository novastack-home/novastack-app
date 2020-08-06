import React, { Component } from 'react'
import Container from './Container'
import Button from '@material-ui/core/Button'

class DeviceMenu extends Component {
  state = {
    devices: []
  }

  componentDidMount() {
    navigator.mediaDevices.enumerateDevices()
    .then((devices) => {
      devices = devices.filter(d => d.kind === 'videoinput');
      devices = devices.map((device) => {
        return <Button
          variant="outlined"
          color="primary"
          key={device.deviceId}
          onClick={() => this.props.onDeviceChoose(device.deviceId)}
        >
          {device.label}
        </Button>
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
      <Container>
        <div className="options-list">{this.state.devices}</div>
      </Container>
    )
  }
}

export default DeviceMenu
