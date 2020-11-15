import React, { Component } from "react";
import Container from "./Container";
import ButtonBase from "@material-ui/core/ButtonBase";

import { withStyles } from "@material-ui/core/styles";

const styles = () => ({
    container: {
        backgroundColor: "#DCE0E5",
    },
    list: {
        display: "flex",
        overflow: "hidden",
        height: "100%",
        alignItems: "flex-end",
        margin: "0px auto",
    },
    listInner: {
        display: "flex",
        overflow: "auto",
    },
    listHeader: {
        display: "flex",
        justifyContent: "center",
        marginBottom: "16px",
    },
    btn: {
        marginRight: "8px",
        color: "#ffffff",
        height: "95px",
        width: "109px",
    },
    icon: {
        marginRight: "16px",
    },
    message: {
        textAlign: "center",
        color: "#ffffff",
    },
    innerContainer: {
        position: "absolute",
        top: "36px",
        height: "294px",
        marginRight: "24px",
        boxShadow:
            "0px 0px 2px rgba(0, 0, 0, 0.1), 0px 0px 8px rgba(0, 1, 3, 0.1)",
        background: "#FFFFFF",
        padding: "8px 32px 0px 96px",
    },
    scanIcon: {
        position: "absolute",
        zIndex: 2,
        top: "30px",
        left: "8px",
    },
    placeholderIcon: {
        marginTop: "24px",
    },
    title: {
        color: "#5B15FF",
        fontWeight: "bold",
        margin: 0,
    },
    description: {
        marginTop: "8px",
    },
});

class ModelMenu extends Component {
    render = () => {
        const { classes } = this.props;
        const modelsList = this.props.models.map((model) => {
            return (
                <ButtonBase
                    focusRipple
                    className={classes.btn}
                    key={model.id}
                    onClick={() => this.props.onModelChoose(model.id)}
                >
                    <img src={model.thumbnail} />
                </ButtonBase>
            );
        });

        return (
            <Container customClass={classes.container} noTitle>
                <div className={classes.list}>
                    <img className={classes.scanIcon} src="icons/scan.svg" />
                    <div className={classes.innerContainer}>
                        <p className={classes.title}>Novastack App</p>
                        <p className={classes.description}>
                            Choose an image to scan and activate
                        </p>
                        <img
                            className={classes.placeholderIcon}
                            src="icons/placeholder.svg"
                        />
                    </div>
                    <div className={classes.listInner}>{modelsList}</div>
                </div>
            </Container>
        );
    };
}

export default withStyles(styles)(ModelMenu);
