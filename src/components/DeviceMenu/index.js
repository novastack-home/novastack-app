import React, { Component } from "react";
import Container from "../Container";
import ButtonBase from "@material-ui/core/ButtonBase";

import { withStyles } from "@material-ui/core/styles";

const styles = () => ({
    list: {
        width: "100%",
        overflow: "hidden",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
    },
    listHeader: {
        display: "flex",
        justifyContent: "center",
        marginBottom: "16px",
    },
    btn: {
        backgroundColor: "#342060",
        color: "#ffffff",
        height: "95px",
        width: "235px",
    },
    icon: {
        marginRight: "16px",
    },
    message: {
        textAlign: "center",
        color: "#ffffff",
    },
});

class DeviceMenu extends Component {
    state = {
        devices: [],
    };

    componentDidMount() {
        const { classes } = this.props;
        navigator.mediaDevices
            .enumerateDevices()
            .then((devices) => {
                devices = devices.filter((d) => d.kind === "videoinput");
                devices = devices.map((device) => {
                    return (
                        <ButtonBase
                            focusRipple
                            className={classes.btn}
                            key={device.deviceId}
                            onClick={() =>
                                this.props.onDeviceChoose(device.deviceId)
                            }
                        >
                            {device.label}
                        </ButtonBase>
                    );
                });
                this.setState({ devices });
            })
            .then(() => {
                // Stop streaming after getting device id's
                this.props.stream.getTracks().forEach((t) => t.stop());
            });
    }

    render() {
        const { classes } = this.props;
        return (
            <Container>
                <div className={classes.list}>
                    <div className={classes.listHeader}>
                        <img
                            className={classes.icon}
                            src="../../icons/camera.svg"
                        />
                        <p className={classes.message}>Choose Camera</p>
                    </div>
                    {this.state.devices}
                </div>
            </Container>
        );
    }
}

export default withStyles(styles)(DeviceMenu);
