import { getCast } from '../loadYT'
import App from '../App'

export default class Sender {
  constructor (localControler) {
    this.localControler = localControler;
    getCast();
    window['__onGCastApiAvailable'] = async (isAvailable) => {
      if (!isAvailable) return;

      this.setUp();
    }
  }

  async setUp() {
    // get cast sender framework
    const cast = await getCast();

    // declare receiver application
    cast.framework.CastContext.getInstance().setOptions({
      receiverApplicationId: process.env.REACT_APP_CHROMECAST_APP_ID,
      autoJoinPolicy: window.chrome.cast.AutoJoinPolicy.ORIGIN_SCOPED
    });

    this._remotePlayer = new cast.framework.RemotePlayer();
    this._remotePlayerController = new cast.framework.RemotePlayerController(this._remotePlayer);

    // listen to receiver connection event
    this._remotePlayerController.addEventListener(
      cast.framework.RemotePlayerEventType.IS_CONNECTED_CHANGED,
      async () => {
        let mode = this._remotePlayer.isConnected ? App.CONTROL_MODE : App.NORMAL_MODE;
        this.localControler.setMode(mode);

        if (mode === App.NORMAL_MODE) return;

        // send the schedule to receiver via custom message when connected
        const cast = await getCast();
        this._castSession = cast.framework.CastContext.getInstance().getCurrentSession();
        this._castSession.sendMessage(App.SCHEDULE_CHANNEL, JSON.stringify(this.localControler.schedule.data));
      }
    );

    // listen to volume change
    this._remotePlayerController.addEventListener(
      cast.framework.RemotePlayerEventType.VOLUME_LEVEL_CHANGED,
      async (event) => {
       this.volume = (event.value * 100);
      }
    )

    // listen to mute change
    this._remotePlayerController.addEventListener(
      cast.framework.RemotePlayerEventType.IS_MUTED_CHANGE,
      async (event) => {
       this.muted = event.value;
      }
    )
  }

  setVolume(volume) {
    this.volume = volume;
    this._remotePlayer.volumeLevel = volume/100;
    this._remotePlayerController.setVolumeLevel();
  }

  getVolume() {
    return this.volume;
  }

  mute() {
    this.muted = true
    this._remotePlayer.muted = true;
    this._remotePlayerController.muteOrUnmute();
  }

  unMute() {
    this.muted = false;
    this._remotePlayer.muted = false;
    this._remotePlayerController.muteOrUnmute();
  }

  isMuted() {
    return this.muted;
  }
}