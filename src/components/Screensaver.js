import React from 'react';
import Container from './Container';

function Screensaver(props) {
  return (
    <Container>
      <div className="screensaver">
        <p className="app-title">Novastack App</p>
        <img className="screensaver-icon" src={props.icon} />
        <div className="screensaver-message">{props.message}</div>
      </div>
    </Container>
  );
}

export default Screensaver;
