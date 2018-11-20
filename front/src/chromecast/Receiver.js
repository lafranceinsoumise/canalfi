import { getCastReceiver } from '../loadYT'
import App from '../App'

export default class Receiver {
  constructor (controler) {
    this.controler = controler;
  }

  load() { return new Promise(async (resolve, reject) => {
    // get cast receiver framework
    const cast = await getCastReceiver();
    const context = cast.framework.CastReceiverContext.getInstance();

    const options = new cast.framework.CastReceiverOptions();
    if (process.env.NODE_ENV !== 'production') options.maxInactivity = 3600;
    options.supportedCommands = cast.framework.messages.Command.ALL_BASIC_MEDIA;
    options.disableIdleTimeout = true; // because we don't have media element our app is always in IDLE state

    // listen to message from the sender containing the schedule
    context.addCustomMessageListener(App.SCHEDULE_CHANNEL, (event) => {
      resolve(event.data);
    });

    // start the receiver
    context.start(options);
  });}
}