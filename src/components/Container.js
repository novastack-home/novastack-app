import React from "react";

import { withStyles } from "@material-ui/core/styles";

const styles = () => ({
    container: {
        width: "100vw",
        height: "100vh",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        alignItems: "center",
        padding: "40px 24px",
        margin: "auto",
        overflowY: "auto",
        backgroundColor: "#29194C",
    },
    title: {
        position: "absolute",
        top: "40px",
        fontWeight: "bold",
        fontSize: "16px",
        lineHeight: "24px",
        letterSpacing: "0.285714px",
        color: "#ffffff",
    },
});

function Container(props) {
    const { classes, noTitle, customClass } = props;
    return (
        <div className={`${classes.container} ${customClass && customClass}`}>
            {!noTitle && <p className={classes.title}>Novastack App</p>}
            {props.children}
        </div>
    );
}

export default withStyles(styles)(Container);
