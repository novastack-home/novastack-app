import React, { Component } from 'react';
import Button from '@material-ui/core/Button';
import Container from './Container';

class ModelMenu extends Component {
  render = () => {
    const modelsList = this.props.models.map((model) => <Button
        key={model.id}
        onClick={() => this.props.onModelChoose(model)}
        variant="outlined"
        color="primary"
      >
        {model.name}
      </Button>);

    return <Container>
      <div className="options-list">
        {modelsList}
      </div>
    </Container>;
  }
}

export default ModelMenu;
