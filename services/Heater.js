import _ from 'lodash'
import Consts from '../utils/constants.js'
const {throttle} = _

/* CONTROL THE HEAT! */
export class Heater {
  switchOff = throttle(function() {
    console.log("🌡♨️ Turning off switch")
    exec("./tplink_smartplug.py -t "+Consts.HEATER_IP_ADDRESS+" -c off", (error, stdout, stderr) => {
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
    console.log("🌡❄️ Turning on switch")
    exec("./tplink_smartplug.py -t "+Consts.HEATER_IP_ADDRESS+" -c on", (error, stdout, stderr) => {
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
  manageHeat(temperature) {
    const itsTooHot = temperature > Consts.GREENHOUSE_TEMP_MAX;
    const itsTooCold = temperature < Consts.GREENHOUSE_TEMP_MIN;
    const itsWayTooCold = temperature < (Consts.GREENHOUSE_TEMP_MIN - 10);
    const itsWayTooHot = temperature > (Consts.GREENHOUSE_TEMP_MAX + 10);

    if (itsTooHot) {
      this.switchOff();
      //sendNotification("Turning off heat switch: "+temperature);
    } else if (itsTooCold) {
      //sendNotification("Turning ON heat switch: "+temperature);
      this.switchOn();
    }

    if (itsWayTooCold || itsWayTooHot) {
      notifier.sendNotification("WARNING! TEMPERATURE IS OUT OF BOUNDS. Currently: "+temperature);
    }
  };
}

export default Heater