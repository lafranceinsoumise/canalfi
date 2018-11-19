import React, {Component} from 'react';
import {createEventHandler} from 'recompose';

import {getYT, getCast} from './loadYT';
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


class YTAPIController {
  constructor(ytElemId, elemId, schedule) {
    this.ytElemId = ytElemId;
    this.elemId = elemId;
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
    this.isLive = false;
    this.currentProgram = this.schedule.getNextProgramIndex(this.currentProgram);
    this._YTplayer.loadVideoById(this.schedule.getYTId(this.currentProgram));
  }

  setFullscreen() {
    fullScreen(this.elemId);
  }

  async load(signalReady, stateHandler) {
    const YT = await getYT();
    getCast();

    const {programIndex, start} = this.schedule.getStartingProgram();

    this.currentProgram = programIndex;

    const videoId = (this.schedule.live && this.schedule.live.id) || this.schedule.getYTId(programIndex);

    window.YTPlayer = this._YTplayer = new YT.Player(this.ytElemId, {
      videoId,
      playerVars: {
        rel: 0,
        showinfo: 0,
        modestbranding: 1,
        controls: 0,
        autoplay: 1,
        iv_load_policy: 3,
        playsinline: 1,
        hl: 'fr_FR'
      },
      events: {
        onReady: signalReady,
        onStateChange: e => stateHandler(e.data)
      }
    });

    this.ready.then(() => {
      this._YTplayer.setVolume(0);
      if (!this.schedule.live) {
        this._YTplayer.seekTo(start);
      } else {
        this.isLive = true;
      }
      return this._YTplayer.playVideo();
    });

    window['__onGCastApiAvailable'] = async (isAvailable) => {
      if (isAvailable) {
        const cast = await getCast();
        cast.framework.CastContext.getInstance().setOptions({
          receiverApplicationId: process.env.REACT_APP_CHROMECAST_APP_ID
        });
      }
    };
  }

  playVideo(index) {
    if (!index) {
      return this._YTplayer.playVideo();
    }

    this.currentProgram = index;
    this._YTplayer.loadVideoById(this.schedule.getYTId(this.currentProgram));
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
    if (this.isLive) {
      return false;
    }

    return this._YTplayer.getCurrentTime();
  }

  getDuration() {
    if (this.isLive) {
      return false;
    }

    return this._YTplayer.getDuration();
  }

  getVolume() {
    return this._YTplayer.getVolume();
  }
}

class PlayerComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {controler: null};
  }

  async componentDidMount() {
    const controler = new YTAPIController('ytplayer', 'player', this.props.schedule);
    this.setState({controler});
  }

  render() {
    return (
      <div className="video-container" id="player">
        <div id="ytplayer"/>
        <Controls controler={this.state.controler}/>
      </div>
    );
  }
}


export default PlayerComponent;
