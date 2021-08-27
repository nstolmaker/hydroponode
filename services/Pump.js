import lodash from 'lodash'
const { throttle } = lodash

import Consts from '../utils/constants.js'
import { exec  } from 'child_process'

/* CONTROL THE Pump! */
export class Pump {
  watering = false;
  hydrate = throttle(function() {
    console.log("🌧 Starting Watering @ "+new Date().toLocaleString()+".")
    exec("./tplink_smartplug.py -t "+Consts.PUMP_IP_ADDRESS+" -c on", (error, stdout, stderr) => {
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

   this.watering = true;
   let that = this;
    setTimeout(()=> {
      // now wait 6 seconds and then turn it off
      console.log("🌤 Stopping Watering @ "+new Date().toLocaleString()+".")
      exec("./tplink_smartplug.py -t "+Consts.PUMP_IP_ADDRESS+" -c off", (error, stdout, stderr) => {
        if (error) {
            console.log(`error: ${error.message}`);
            return;
        }
        if (stderr) {
            console.log(`stderr: ${stderr}`);
            return;
        }
        console.log("Done watering. Setting watering to false.");
        // console.log(`stdout: ${stdout}`);
        that.watering = false;
      });
    }, Consts.WATERING_DURATION)  
  }, Consts.THROTTLE_SWITCH_TIME);
  
  manageWater(moisture) {
    const itsTooDry = moisture < Consts.GREENHOUSE_MOISTURE_MIN;
    const itsWayTooDry = moisture < (Consts.GREENHOUSE_MOISTURE_MIN - 10);

    if (itsTooDry) {
      this.hydrate();
      notifier.sendNotification("Moisture level too dry: "+moisture+"%. Watering now.");
    } else {
      console.log("💧✅ Moisture is at an acceptable level. ");
    }

    if (itsWayTooDry) {
      notifier.sendNotification("WARNING! MOISTURE IS OUT OF BOUNDS. Currently: "+moisture);
    }
  };
}
