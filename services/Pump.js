import lodash from 'lodash'
const { throttle } = lodash

import Consts from '../utils/constants.js'
import { exec  } from 'child_process'
import { Broadcast } from './Broadcast.js'

/* CONTROL THE Pump! */
export class Pump {
  watering = false;
  hydrate = throttle( async function() {
    console.log("🌧 Starting Watering @ "+new Date().toLocaleString()+".")
    const broadcast = new Broadcast();
    const actionData = {
      system: 'pump',
      action: 'on',
      message: 'going to attempt to turn ON pump because moisture is low'
    }
    await broadcast.recordActionHistoryInDb(actionData);
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
    setTimeout( async ()=> {
      // now wait 6 seconds and then turn it off
      console.log("🌤 Stopping Watering @ "+new Date().toLocaleString()+".")
      const actionData = {
        system: 'pump',
        action: 'pff',
        message: 'going to attempt to turn OFF pump, watering should be done'
      }
      await broadcast.recordActionHistoryInDb(actionData);
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
