/* CONTROL THE LIGHTS! */

import { DateTime, Interval } from "luxon";
import _ from 'lodash'
import Consts from '../utils/constants.js'
const {throttle} = _

export class Lights {
  constructor() {
    // if stopTime < startTime then they mean that time in the AM *tomorrow*. The luxon library will handle the date math for us, so just add 24 hours.
    if (Consts.LIGHTS_OFF_TIME < Consts.LIGHTS_ON_TIME) Consts.LIGHTS_OFF_TIME +=24;
  }
  switchOff = throttle(function() {
    console.log("💡⬇️ Turning off switch")
    exec("./tplink_smartplug.py -t "+Consts.LIGHTS_IP_ADDRESS+" -c off", (error, stdout, stderr) => {
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
  }, Consts.THROTTLE_SWITCH_TIME);
  switchOn = throttle(function() {
    console.log("💡⬆️ Turning on switch")
    exec("./tplink_smartplug.py -t "+Consts.LIGHTS_IP_ADDRESS+" -c on", (error, stdout, stderr) => {
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
  }, Consts.THROTTLE_SWITCH_TIME);
  manageLights(lux) {
    const startTimeDT = DateTime.local().startOf("day").plus({hours: Consts.LIGHTS_ON_TIME});
    const stopTimeDT = DateTime.local().startOf("day").plus({hours: Consts.LIGHTS_OFF_TIME});
    const onInterval = Interval.fromDateTimes(startTimeDT, stopTimeDT);
    const currentTimeDT = DateTime.local();
    const onOrOff = onInterval.contains(currentTimeDT);

    if (onOrOff) {
      // console.log("Lights should be on");
      if (lux < Consts.GREENHOUSE_LIGHT_MIN) {
          this.switchOn();
      }
    } else {
      // console.log("lights should be off")
      this.switchOff();
    }
  };
}

export default Lights