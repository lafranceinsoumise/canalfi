import React, {Component} from 'react';
import {createEventHandler} from 'recompose';

import { getYT } from './loadYT';
import Controls from './Controls';
import './Player.css';
import App from './App';
import Schedule from './Schedule';
import Receiver from './chromecast/Receiver'
import Sender from './chromecast/Sender';


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
  constructor(ytElemId, elemId, mode) {
    this.mode = mode;
    this.ytElemId = ytElemId;
    this.elemId = elemId;
    let signalReady;
    const {handler: stateHandler, stream: state$} = createEventHandler();
    this.stateHandler = stateHandler;

    this.ready = new Promise(resolve => signalReady = resolve);
    this._YTplayer = null;

    this.state$ = state$;
    this.load(signalReady);

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

  async load(signalReady) {
    if (this.mode === App.RECEIVER_MODE) {
      this.chromecastReceiver = new Receiver(this);
      this.schedule = new Schedule(await this.chromecastReceiver.load());
    } else {
      this.schedule = new Schedule(JSON.parse(await (await fetch(process.env.REACT_APP_SCHEDULE_URL)).text()));
    }
    const YT = await getYT();

    let videoId;
    let {programIndex, start} = this.schedule.getStartingProgram();
    this.currentProgram = programIndex;
    if (this.schedule.live && this.schedule.live.id) {
      videoId = this.schedule.live.id;
      this.isLive = true;
    } else {
      videoId = this.schedule.getYTId(programIndex);
    }

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
        onStateChange: e => this.stateHandler(e.data)
      }
    });

    this.ready.then(() => {
      this.playerInterface = this._YTplayer;

      if (this.mode !== App.RECEIVER_MODE) {
        this._YTplayer.setVolume(0);
        this.chromecastSender = new Sender(this);
      }

      if (!this.isLive) {
        this._YTplayer.seekTo(start);
      }
      return this._YTplayer.playVideo();
    });

    setInterval(this.updateSchedule.bind(this), 5000);
  }

  async updateSchedule() {
    let previousSchedule = this.schedule;
    this.schedule = new Schedule(JSON.parse(await (await fetch(process.env.REACT_APP_SCHEDULE_URL)).text()));

    if (!previousSchedule.live && this.schedule.live && this.schedule.live.id) {
      this.playLive();
    }

    if (this.isLive && !(previousSchedule.live && previousSchedule.live.id)) {
      this.playNextVideo();
    }
  }

  setFullscreen() {
    fullScreen(this.elemId);
  }

  playNextVideo() {
    if (this.isLive) {
      this.isLive = false;
      let {index, start} = this.schedule.getStartingProgram();
      this.currentProgram = index;
      this._YTplayer.loadVideoById(this.schedule.getYTId(index));
      this._YTplayer.seekTo(start);

      return;
    }

    this._YTplayer.loadVideoById(this.schedule.getYTId(this.currentProgram));
  }

  playLive() {
    if (this.schedule.live && this.schedule.live.id) {
      this.isLive = true;
      this._YTplayer.loadVideoById(this.schedule.live.id);
    }
  }

  playVideo(index) {
    if (typeof index === 'undefined') {
      return this._YTplayer.playVideo();
    }

    this.isLive = false;
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
    this.playerInterface.setVolume(volume);
  }

  setMode(mode) {
    this.mode = mode;

    if (mode === App.CONTROL_MODE) {
      this._YTplayer.pauseVideo();
      this.playerInterface = this.chromecastSender;
    }
  }

  mute() {
    this.playerInterface.mute();
  }

  unMute() {
    this.playerInterface.unMute();
  }

  isMuted() {
    return this.playerInterface.isMuted();
  }

  getCurrentTime() {
    if (this.isLive) {
      return 0;
    }

    return this._YTplayer.getCurrentTime();
  }

  getDuration() {
    if (this.isLive) {
      return 0;
    }

    return this._YTplayer.getDuration();
  }

  getVolume() {
    return this.playerInterface.getVolume();
  }

  getMode() {
    return this.mode;
  }
}

class PlayerComponent extends Component {
  constructor(props) {
    super(props);
    this.state = {controler: null};
  }

  async componentDidMount() {
    const controler = new YTAPIController('ytplayer', 'player', this.props.startingMode);
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
