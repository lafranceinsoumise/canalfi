import React, {Component} from 'react';
import {createEventHandler} from 'recompose';

import getYT from './loadYT';
import Controls from './Controls';
import './Player.css';


function fullScreen(id) {
  const e = document.getElementById(id);
  if (e.requestFullscreen) {
    e.requestFullscreen();
  } else if (e.webkitRequestFullscreen) {
    e.webkitRequestFullscreen();
  } else if (e.mozRequestFullScreen) {
    e.mozRequestFullScreen();
  } else if (e.msRequestFullscreen) {
    e.msRequestFullscreen();
  }
}


class PlayerController {
  constructor(id, schedule) {
    this.id = id;
    let signalReady;
    const {handler: stateHandler, stream: state$} = createEventHandler();

    this.ready = new Promise(resolve => signalReady = resolve);
    this.schedule = schedule;
    this._YTplayer = null;

    this.state$ = state$;
    this.load(signalReady, stateHandler);

    const boundMethods = [
      'playVideo', 'pauseVideo', 'seekTo', 'setVolume', 'mute', 'unMute', 'isMuted', 'getCurrentTime', 'getDuration',
      'getVolume', 'setFullscreen',
    ];

    for (let prop of boundMethods) {
      this[prop] = this[prop].bind(this);
    }

    state$.subscribe(
      s => {
        if (s === 0) {
          this.playNextVideo();
        }
      }
    );
  }

  playNextVideo() {
    this.currentProgram = this.schedule.getNextProgramIndex(this.currentProgram);
    this._YTplayer.loadVideoById(this.schedule.getYTId(this.currentProgram));
  }

  setFullscreen() {
    fullScreen(this.id);
  }

  async load(signalReady, stateHandler) {
    const YT = await getYT();

    const {programIndex, start} = this.schedule.getStartingProgram();

    this.currentProgram = programIndex;

    const videoId = this.schedule.getYTId(programIndex);

    window.YTPlayer = this._YTplayer = new YT.Player(this.id, {
      videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        showinfo: 0,
        controls: 0,
        autoplay: 1
      },
      events: {
        onReady: signalReady,
        onStateChange: e => stateHandler(e.data)
      }
    });

    this.ready.then(() => {
      this._YTplayer.seekTo(start);
    });
  }

  playVideo() {
    this._YTplayer.playVideo();
  }

  pauseVideo() {
    this._YTplayer.pauseVideo();
  }

  seekTo(position, allowSeekAhead) {
    this._YTplayer.seekTo(position, allowSeekAhead);
  }

  setVolume(volume) {
    this._YTplayer.setVolume(volume);
  }

  mute() {
    this._YTplayer.mute();
  }

  unMute() {
    this._YTplayer.unMute();
  }

  isMuted() {
    return this._YTplayer.isMuted();
  }

  getCurrentTime() {
    return this._YTplayer.getCurrentTime();
  }

  getDuration() {
    return this._YTplayer.getDuration();
  }

  getVolume() {
    return this._YTplayer.getVolume();
  }
}

class PlayerComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {player: null};
  }

  async componentDidMount() {
    const player = new PlayerController('ytplayer', this.props.schedule);
    this.setState({player});
    await player.ready;
  }

  render() {
    return (
      <div className="video-container">
        <div id="ytplayer"/>
        <Controls player={this.state.player}/>
      </div>
    );
  }
}


export default PlayerComponent;
