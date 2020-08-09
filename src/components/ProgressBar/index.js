import React from "react";
import PropTypes from "prop-types";
import LinearProgress from "@material-ui/core/LinearProgress";
import Typography from "@material-ui/core/Typography";
import Box from "@material-ui/core/Box";

import { withStyles } from "@material-ui/core/styles";

const styles = () => ({
    progressMessage: {
        fontSize: "12px",
        lineHeight: "16px",
        letterSpacing: "0.29px",
        color: "#ffffff",
    },
});

function ProgressBar(props) {
    const { classes, value } = props;
    return (
        <Box width="100%" display="flex" alignItems="center">
            <Box width="100%" mr={1}>
                <LinearProgress variant="determinate" value={value} />
            </Box>
            <Box minWidth={35}>
                <p className={classes.progressMessage}>{`${Math.round(
                    props.value
                )}%`}</p>
            </Box>
        </Box>
    );
}

export default withStyles(styles)(ProgressBar);
