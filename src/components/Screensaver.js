import React from "react";
import Container from "./Container";

import { withStyles } from "@material-ui/core/styles";

const styles = () => ({
    icon: {
        maxWidth: "300px",
        maxHeight: "300px",
        display: "block",
        margin: "0 auto",
        marginBottom: "16px",
    },

    message: {
        textAlign: "center",
        color: "#ffffff",
    },
});

function Screensaver(props) {
    const { classes } = props;
    return (
        <Container>
            <img className={classes.icon} src={props.icon} />
            <p className={classes.message}>{props.message}</p>
        </Container>
    );
}

export default withStyles(styles)(Screensaver);
