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
    pluck('controler'),
    distinctUntilChanged(),
    filter(p => p !== null),
    switchMap(p => from(p.ready).pipe(mapTo({controler: p}))),
  ),
);

const withCurrentState = addPropsStream(
  props$ => props$.pipe(
    switchMap(props => props.controler.state$),
    map(state => ({state}))
  ),
);

const withTiming = (samplingPeriod = 500) => addPropsStream(props$ =>
  props$.pipe(
    sample(
      props => ({currentTime: props.controler.getCurrentTime(), duration: props.controler.getDuration()}), samplingPeriod
    )
  ),
);

const withVolume = (samplingPeriod = 1000) => addPropsStream(
  props$ => merge(
    props$.pipe(
      sample(props => ({volume: props.controler.getVolume(), muted: props.controler.isMuted()}), samplingPeriod),
    ),
  )
);


const withMouseActivity = addPropsStream(
  props$ => {
    const {handler: setMouseStatus, stream: mouseOverControls$} = createEventHandler();

    const mouseMovedRecently$ = merge(
      fromEvent(document, 'mousemove'),
      fromEvent(document, 'pointerdown'),
      fromEvent(document, 'touchstart'),
    ).pipe(
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

const ProgramList = ({controler}) => {
  return <div className="controls__programlist">
    <button
      className="controls__programlist__leftScroll"
      onClick={() => document.querySelector('.controls__programlist').scrollLeft -= 400}
    ><i className="fa fa-arrow-left"></i></button>
    <button
      className="controls__programlist__rightScroll"
      onClick={() => document.querySelector('.controls__programlist').scrollLeft += 400}
    ><i className="fa fa-arrow-right"></i></button>
    {controler.schedule.programs.map((p, i) =>
      <div key={i} className={"controls__programlist__program" + (i === controler.currentProgram ? ' current' : '')}>
        <img
          src={p.thumbnail}
          className="thumbnail"
          onClick={() => controler.playVideo(i)}
          alt=""
        />
        <div className={"controls__programlist__program__info"} onClick={() => controler.playVideo(i)}>
          <p>
            {p.title}
          </p>
        </div>
        {(i === controler.currentProgram ? <i className="fa fa-play"></i> : '')}
      </div>
    )}
  </div>
};


function ControlBar({controler, state, volume, muted, currentTime, duration, shown, onMouseEnter, onMouseLeave}) {
  return <div className={`controls ${shown ? 'shown': 'hidden'} ${[1, 3].includes(state) ? 'transparent' : 'opaque'}`}
              onMouseEnter={onMouseEnter} onMouseLeave={onMouseLeave}>
    <ProgramList controler={controler} />
    {currentTime && duration && <PositionBar currentTime={currentTime} duration={duration} seekTo={controler.seekTo} />}
    <div className="controls__buttons">
      <PlayPauseButton playing={[1, 3].includes(state)} playVideo={() => controler.playVideo()} pauseVideo={controler.pauseVideo} />
      <VolumeControl volume={volume} muted={muted} mute={controler.mute} unMute={controler.unMute} setVolume={controler.setVolume} />
      {currentTime && duration && <Timer currentTime={currentTime} duration={duration}/>}
      <button type="button" id="full-screen" onClick={controler.setFullscreen}>
        <i className="fas fa-expand" />
      </button>
    </div>
  </div>;
}

ControlBar.propTypes = {
  controler: PropTypes.object,
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
