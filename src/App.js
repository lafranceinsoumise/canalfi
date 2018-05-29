import React, { Component } from 'react';
import './App.css';
import Player from './Player';
import yaml from 'js-yaml';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    this.startTime = Math.round(new Date(new Date().setHours(0, 0, 0, 0)).getTime()/1000);
    this.videoLoop = this.videoGenerator();
  }

  async componentDidMount() {
    this.set = yaml.safeLoad(await (await fetch('set.yml')).text());
    this.setState({setLoaded: true});
  }

  * videoGenerator() {
    while (true) {
      yield* this.set;
    }
  }

  render() {
    if (!this.state.setLoaded) return null;

    let video;
    let startTime = Math.round(new Date().getTime()/1000) - this.startTime;

    do {
      if (video) startTime = startTime - video.duration; // previous video

      video = this.videoLoop.next().value;
    } while ((startTime - video.duration) > 0);

    return (
      <div>
        <Player videoId={video.id} start={startTime} getNextVideo={() => this.videoLoop.next().value.id}/>
      </div>
    );
  }
}

export default App;
