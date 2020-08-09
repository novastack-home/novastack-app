import React, { Component } from "react";
import Container from "../Container";
import ButtonBase from "@material-ui/core/ButtonBase";

import { withStyles } from "@material-ui/core/styles";
import { FormHelperText } from "@material-ui/core";

const styles = () => ({
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
        backgroundColor: "#342060",
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
});

class ModelMenu extends Component {
    render = () => {
        const { classes } = this.props;
        const modelsList = this.props.models.map((model) => {
            console.log(model);
            return (
                <ButtonBase
                    focusRipple
                    className={classes.btn}
                    key={model.id}
                    onClick={() => this.props.onModelChoose(model.id)}
                >
                    {model.name}
                </ButtonBase>
            );
        });

        return (
            <Container>
                <div className={classes.list}>
                    <div className={classes.listInner}>{modelsList}</div>
                </div>
            </Container>
        );
    };
}

export default withStyles(styles)(ModelMenu);
