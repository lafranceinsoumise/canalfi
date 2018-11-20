import React, { Component } from 'react';
import './App.css';
import Player from './Player';
import {from} from 'rxjs';
import {setObservableConfig} from 'recompose';

import '@fortawesome/fontawesome-free/css/all.css';
import 'react-rangeslider/umd/rangeslider.css';

setObservableConfig({
  fromESObservable: from,
  toESObservable: a => a
});

class App extends Component {
  static RECEIVER_MODE = 'RECEIVER';
  static NORMAL_MODE = 'NORMAL';
  static CONTROL_MODE = 'CONTROL';
  static SCHEDULE_CHANNEL = 'urn:x-cast:com.canal.cast.schedule';
  static COMMAND_CHANNEL = 'urn:x-cast:com.canal.cast.command';

  constructor(props) {
    super(props);
    this.chromecastReceiver = window.location.pathname.includes('chromecast');
  }

  render() {
    return (
      <div>
        <Player startingMode={this.chromecastReceiver ? App.RECEIVER_MODE : App.NORMAL_MODE}/>
      </div>
    );
  }
}

export default App;