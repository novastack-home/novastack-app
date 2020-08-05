import React, { Component } from 'react'
import Container from './Container'
import { Button } from '@material-ui/core'

class ModelMenu extends Component {
  render = () => {
    const modelsList = this.props.models.map(model => {
      return <Button
        key={model.id}
        onClick={() => this.props.onModelChoose(model.id)}
        variant="outlined"
        color="primary"
      >
        {model.name}
      </Button>
    });

    return <Container>
      <div className="options-list">
        {modelsList}
      </div>
    </Container>
  }
}

export default ModelMenu
