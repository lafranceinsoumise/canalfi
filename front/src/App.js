import React, { Component } from 'react';
import './App.css';
import Player from './Player';
import Schedule from './Schedule';
import {from} from 'rxjs';
import {setObservableConfig} from 'recompose';

import '@fortawesome/fontawesome-free/css/all.css';
import 'react-rangeslider/umd/rangeslider.css';


setObservableConfig({
  fromESObservable: from,
  toESObservable: a => a
});



class App extends Component {
  constructor(props) {
    super(props);
    this.state = {schedule: null};
  }

  async componentDidMount() {
    const schedule = new Schedule(JSON.parse(await (await fetch(process.env.REACT_APP_SCHEDULE_URL)).text()));
    this.setState({schedule});
  }

  render() {
    if (!this.state.schedule) return null;

    return (
      <div>
        <Player schedule={this.state.schedule} />
      </div>
    );
  }
}

export default App;
