import React, { Component } from 'react'

class ModelMenu extends Component {
  render = () => {
    const modelsList = this.props.models.map(model => {
      return <li key={model.id} onClick={() => this.props.onModelChoose(model)}>{model.name}</li>
    });

    return <ul className="models-list">
      {modelsList}
    </ul>
  }
}

export default ModelMenu
