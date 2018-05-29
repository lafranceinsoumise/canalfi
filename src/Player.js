import React, { Component } from 'react';
import './Player.css';

class Player extends Component {
  constructor(props) {
    super(props)
    this.state = {videoId: props.videoId, start: props.start};
    this.getNextVideo = props.getNextVideo;
  }

  loadPlayer() {
    this.player = new window.YT.Player('ytplayer', {
      videoId: this.state.videoId,
      playerVars: {
        rel: 0,
        modestbranding: 1,
        showinfo: 0,
        controls: 1,
        start: this.state.start,
        autoplay: 1,
      },
      events: {
        onStateChange: event => {
          if (event.data === window.YT.PlayerState.ENDED) {
            this.player.loadVideoById(this.getNextVideo());
          }
        }
      }
    });
  }

  componentDidMount() {
    this.loadPlayer();
  }

  render() {
    return (
      <div className="video-container">
        <div id="ytplayer"></div>
      </div>
    );
  }
}

export default Player;
