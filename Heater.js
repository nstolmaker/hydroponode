
/* CONTROL THE HEAT! */
export default class Heater {
  switchOff = throttle(function() {
    console.log("🌡♨️ Turning off switch")
    exec("./tplink_smartplug.py -t "+CONSTS.HEATER_IP_ADDRESS+" -c off", (error, stdout, stderr) => {
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
    console.log("🌡❄️ Turning on switch")
    exec("./tplink_smartplug.py -t "+CONSTS.HEATER_IP_ADDRESS+" -c on", (error, stdout, stderr) => {
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
  manageHeat(temperature) {
    const itsTooHot = temperature > CONSTS.GREENHOUSE_TEMP_MAX;
    const itsTooCold = temperature < CONSTS.GREENHOUSE_TEMP_MIN;
    const itsWayTooCold = temperature < (CONSTS.GREENHOUSE_TEMP_MIN - 10);
    const itsWayTooHot = temperature > (CONSTS.GREENHOUSE_TEMP_MAX + 10);

    if (itsTooHot) {
      this.switchOff();
    } else if (itsTooCold) {
      this.switchOn();
    } else if (itsWayTooCold || itsWayTooHot) {
      sendNotification("WARNING! TEMPERATURE IS OUT OF BOUNDS. Currently: "+temperature);
    }
  };
}

