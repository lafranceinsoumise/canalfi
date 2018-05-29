import React, { Component } from 'react';
import './App.css';
import Player from './Player';
import yaml from 'js-yaml';

class App extends Component {
  constructor(props) {
    super(props);
    this.state = {};
    // The day start time is midnight
    this.startTime = Math.round(new Date(new Date().setHours(0, 0, 0, 0)).getTime()/1000);
    this.videoLoop = this.videoGenerator();
  }

  async componentDidMount() {
    this.set = yaml.safeLoad(await (await fetch('set.yml')).text());
    this.setState({setLoaded: true});
  }

  // This generator gives an infitite iterator over the set list of video.
  * videoGenerator() {
    while (true) {
      yield* this.set;
    }
  }

  render() {
    if (!this.state.setLoaded) return null;

    let video;
    let startTime = Math.round(new Date().getTime()/1000) - this.startTime;

    // We find at which video and at what time,
    // This depends on the day startTime and the duration of each video
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
