/* eslint-disable no-param-reassign */
/* eslint-disable arrow-body-style */
import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import Container from './Container';

class DeviceMenu extends Component {
  state = {
    devices: [],
  }

  componentDidMount() {
    navigator.mediaDevices.enumerateDevices()
      .then((devices) => {
        devices = devices.filter((d) => d.kind === 'videoinput');
        devices = devices.map((device) => {
          return <Button
          variant="outlined"
          color="primary"
          key={device.deviceId}
          onClick={() => this.props.onDeviceChoose(device.deviceId)}
        >
          {device.label}
        </Button>;
        });
        this.setState({ devices });
      });
  }

  render() {
    return (
      <Container>
        <div className="options-list">{this.state.devices}</div>
      </Container>
    );
  }
}

export default DeviceMenu;
