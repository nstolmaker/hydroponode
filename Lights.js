import { DateTime, Interval } from 'luxon'


/* CONTROL THE LIGHTS! */
export default class Lights {
  constructor() {
    // if stopTime < startTime then they mean that time in the AM *tomorrow*. The luxon library will handle the date math for us, so just add 24 hours.
    if (CONSTS.LIGHTS_OFF_TIME < CONSTS.LIGHTS_ON_TIME) CONSTS.LIGHTS_OFF_TIME +=24;
  }
  switchOff = throttle(function() {
    console.log("💡⬇️ Turning off switch")
    exec("./tplink_smartplug.py -t "+CONSTS.LIGHTS_IP_ADDRESS+" -c off", (error, stdout, stderr) => {
      if (error) {
          console.log(`error: ${error.message}`);
          return;
      }
      if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
      }
      // console.log(`stdout: ${stdout}`);
    });    
  }, THROTTLE_SWITCH_TIME);
  switchOn = throttle(function() {
    console.log("💡⬆️ Turning on switch")
    exec("./tplink_smartplug.py -t "+CONSTS.LIGHTS_IP_ADDRESS+" -c on", (error, stdout, stderr) => {
      if (error) {
          console.log(`error: ${error.message}`);
          return;
      }
      if (stderr) {
          console.log(`stderr: ${stderr}`);
          return;
      }
      // console.log(`stdout: ${stdout}`);
    });    
  }, THROTTLE_SWITCH_TIME);
  manageLights(lux) {
    const startTimeDT = DateTime.local().startOf("day").plus({hours: CONSTS.LIGHTS_ON_TIME});
    const stopTimeDT = DateTime.local().startOf("day").plus({hours: CONSTS.LIGHTS_OFF_TIME});
    const onInterval = Interval.fromDateTimes(startTimeDT, stopTimeDT);
    const currentTimeDT = DateTime.local();
    const onOrOff = onInterval.contains(currentTimeDT);

    if (onOrOff) {
      // console.log("Lights should be on");
      this.switchOn();
    } else {
      // console.log("lights should be off")
      this.switchOff();
    }
  };
}
