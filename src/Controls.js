import React from 'react';
import PropTypes from 'prop-types';
import {createEventHandler, mapPropsStream, compose, componentFromStream} from 'recompose';
import {from, interval, merge, combineLatest, fromEvent, timer} from 'rxjs';
import {distinctUntilChanged, startWith, pluck, filter, map, mapTo, switchMap} from 'rxjs/operators';
import Slider from 'react-rangeslider';
import moment from 'moment';

import './Controls.css';

const LOCALE = 'fr-FR';


function displayDuration(d, showHours) {
  let res = '';
  if (showHours) {
    res = d.hours().toLocaleString(LOCALE, {minimumIntegerDigits: 2}) + ':';
  }

  res += d.minutes().toLocaleString(LOCALE, {minimumIntegerDigits: 2}) + ':' +
    d.seconds().toLocaleString(LOCALE, {minimumIntegerDigits: 2});

  return res;
}


function displayPosition(current, videoDuration) {
  current = moment.duration(current * 1000);
  videoDuration = moment.duration(videoDuration * 1000);

  return displayDuration(current, videoDuration.hours()) + ' / ' + displayDuration(videoDuration, videoDuration.hours());
}

function sample(getter, period) {
  return observable => observable.pipe(
    switchMap(value => interval(period).pipe(
      startWith(null),
      map(() => getter(value))
    ))
  );
}

function addPropsStream(transform, combiner) {
  if (!combiner) {
    combiner = (props, newProps) => ({...props, ...newProps});
  }

  return mapPropsStream(
    props$ => combineLatest(
      props$,
      transform(props$)
    ).pipe(
      map(([props, newValue]) => combiner(props, newValue))
    )
  );
}

const withLoadedPlayer = addPropsStream(
  props$ => props$.pipe(
    pluck('player'),
    distinctUntilChanged(),
    filter(p => p !== null),
    switchMap(p => from(p.ready).pipe(mapTo({player: p}))),
  ),
);

const withCurrentState = addPropsStream(
  props$ => props$.pipe(
    switchMap(props => props.player.state$),
    map(state => ({state}))
  ),
);

const withTiming = (samplingPeriod = 500) => addPropsStream(props$ =>
  props$.pipe(
    sample(
      props => ({currentTime: props.player.getCurrentTime(), duration: props.player.getDuration()}), samplingPeriod
    )
  ),
);

const withVolume = (samplingPeriod = 1000) => addPropsStream(
  props$ => merge(
    props$.pipe(
      sample(props => ({volume: props.player.getVolume(), muted: props.player.isMuted()}), samplingPeriod),
    ),
  )
);


const withMouseActivity = addPropsStream(
  props$ => {
    const {handler: setMouseStatus, stream: mouseOverControls$} = createEventHandler();

    const mouseMovedRecently$ = fromEvent(document, 'mousemove').pipe(
      switchMap(
        () => timer(1500).pipe(mapTo(false), startWith(true))
      ),
      startWith(false),
      distinctUntilChanged()
    );

    return combineLatest(mouseMovedRecently$, mouseOverControls$.pipe(startWith(false))).pipe(
      map(([mouseMovedRecently, mouseOverControls]) => ({
        shown: mouseMovedRecently || mouseOverControls,
        onMouseEnter: () => setMouseStatus(true),
        onMouseLeave: () => setMouseStatus(false),
      }))
    );
  }
);


const PlayPauseButton = ({playing, playVideo, pauseVideo}) => (
  <button type="button" id="play-pause" onClick={playing ? pauseVideo : playVideo}>
    <i className={['fas', playing ? 'fa-pause' : 'fa-play'].join(' ')}/>
  </button>
);
PlayPauseButton.propTypes = {
  playing: PropTypes.bool,
  playVideo: PropTypes.func,
  pauseVideo: PropTypes.func
};


const PositionBar = componentFromStream(props$ => {
  const {stream: sliderState$, handler: setSliderState} = createEventHandler();
  const {stream: signalledValue$, handler: changeValue} = createEventHandler();

  const formatTooltip = duration => value => {
    const currentTime = moment.duration(value * duration * 10);  // * 1000 / 100
    return displayDuration(currentTime, moment.duration(duration * 1000).hours());
  };

  const sliderToTiming = (v, duration) => v * duration / 100;
  const timingToSlider = (v, duration) => Math.round(v / duration * 100);

  const shownValue$ = sliderState$.pipe(
    startWith(false),
    distinctUntilChanged(),
    switchMap(state => state ?
      signalledValue$ : // show only the signaled value when user is draging the handle
      merge(
        props$.pipe(map(props => timingToSlider(props.currentTime, props.duration))),
        signalledValue$
      )
    )
  );

  return combineLatest(props$, shownValue$).pipe(
    map(([props, shownValue]) => <div className="progress-bar">
      <Slider
        onChangeStart={() => setSliderState(true)}
        onChangeComplete={() => {
          setSliderState(false);
          props.seekTo(sliderToTiming(shownValue, props.duration), true);
        }}
        onChange={(v) => {
          setSliderState(true);
          changeValue(v);
          props.seekTo(sliderToTiming(v, props.duration), false);
        }}
        value={shownValue}
        format={formatTooltip(props.duration)}
      />
    </div>)
  );
});
PositionBar.propTypes = {
  currentTime: PropTypes.number,
  duration: PropTypes.number,
  seekTo: PropTypes.func,
};


const Timer = ({currentTime, duration}) => (
  <span>{displayPosition(currentTime, duration)}</span>
);
Timer.propTypes = {
  currentTime: PropTypes.number,
  duration: PropTypes.number,
};


const VolumeSlider = componentFromStream(props$ => {
  const {stream: selectedVolume$, handler: signalVolumeChange} = createEventHandler();

  const shownVolume$ = merge(
    props$.pipe(pluck('volume')),
    selectedVolume$
  );

  return combineLatest(props$, shownVolume$).pipe(map(([props, shownVolume]) =>
    <Slider
      {...props}
      value={shownVolume} onChange={(v) => {props.setVolume(v); signalVolumeChange(v);}}
    />
  ));
});


class VolumeControl extends React.Component {
  constructor() {
    super();
    this.state = {shown: false};
  }

  render() {
    const {mute, unMute, muted, setVolume, volume} = this.props;

    const iconType = muted ?
      'fa-volume-off' :
      volume <= 5 ? 'fa-volume-down' : 'fa-volume-up';

    return <div
      className="volume-control"
      onMouseEnter={() => this.setState({shown: true})}
      onMouseLeave={() => this.setState({shown: false})}
    >
      <button type="button" id="mute" onClick={muted ? unMute : mute}>
        <i
          className={['fas', iconType].join(' ')}
        />
      </button>
      <VolumeSlider
        className={`volume-slider ${this.state.shown ? 'on' : 'off'}`}
        volume={volume} setVolume={setVolume} orientation="horizontal"
      />
    </div>;
  }
}

VolumeControl.propTypes = {
  mute: PropTypes.func,
  unMute: PropTypes.func,
  muted: PropTypes.bool,
  setVolume: PropTypes.func,
  volume: PropTypes.number
};


function ControlBar({player, state, volume, muted, currentTime, duration, shown, onMouseEnter, onMouseLeave}) {
  return <div className={`controls ${shown ? 'shown': 'hidden'}`} onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
    <PositionBar currentTime={currentTime} duration={duration} seekTo={player.seekTo}/>
    <div className="controls__buttons">
      <PlayPauseButton playing={[1, 3].includes(state)} playVideo={player.playVideo} pauseVideo={player.pauseVideo}/>
      <VolumeControl volume={volume} muted={muted} mute={player.mute} unMute={player.unMute} setVolume={player.setVolume}/>
      <Timer currentTime={currentTime} duration={duration}/>
      <button type="button" id="full-screen" onClick={player.setFullscreen}>
        <i className="fas fa-expand" />
      </button>
    </div>
  </div>;
}

ControlBar.propTypes = {
  player: PropTypes.object,
  state: PropTypes.number,
  volume: PropTypes.number,
  muted: PropTypes.bool,
  currentTime: PropTypes.number,
  duration: PropTypes.number,
  shown: PropTypes.bool,
};


export default compose(
  withLoadedPlayer, withCurrentState, withTiming(500), withVolume(1000), withMouseActivity
)(ControlBar);
