const throttle = require('lodash/throttle');
const { exec } = require("child_process");
const noble = require('@abandonware/noble');
const fs = require('fs');

// dotenv support not really needed at the moment. See the package.json script 'waverleigh' for how to set these from CLI
const PUMP_IP_ADDRESS = process.env.PUMP_IP_ADDRESS || '192.168.0.41';
const HEATER_IP_ADDRESS = process.env.HEATER_IP_ADDRESS || '192.168.0.42';
const LIGHTS_IP_ADDRESS = process.env.LIGHTS_IP_ADDRESS || '192.168.0.43';
// console.log({PUMP_IP_ADDRESS}, {HEATER_IP_ADDRESS}, {LIGHTS_IP_ADDRESS});

// used for all the timeouts that we wrap everything with because this is wireless and it'll fail a lot.
const INTERVAL_CONST = 500;
const TIMEOUT_CONST = 5000; // how long to wait before retrying for: "Peripheral Discovery"
const RECONNECT_TIMEOUT_CONST = 11000;  // how long to wait before retrying for: "connect" and "data received".
const TIMEOUT = 'Timeout';  // enum
const THROTTLE_SWITCH_TIME = 1000 * 10; // only flick switches once per minute

// GREENHOUSE target values
const GREENHOUSE_TEMP_MIN = 70;
const GREENHOUSE_TEMP_MAX = 82;
const GREENHOUSE_MOISTURE_MIN = 30;
const GREENHOUSE_LIGHT_MIN = 250;
const LIGHTS_ON_TIME = 6;
const LIGHTS_OFF_TIME = 24;

// magic numbers
const DESIRED_PERIPHERAL_UUID = '5003a1213f8c46bb963ff9b6136c0bf8';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);

class sensorReader {
  constructor() {
    this.uuid = '';
    this.address = '';
    this.name = ''
    this.characteristics = {} // a map with key service-UUID, stores the array of characteristics
    this.services = []; // stores an array of GATT service data objects
    this.peripheral;
    this.controller;
    this.device = {
      device_id: undefined,
      name: undefined,
      measure : {
          time: null
      }
    };
  }
  parse_data(data) {
    let temperature = (data.readUInt16LE(0) / 10) * 9 / 5 + 32;
    let lux = data.readUInt32LE(3);
    let moisture = data.readUInt16BE(6);
    let fertility = data.readUInt16LE(8);
    return {
        temperature: temperature,
        lux: lux,
        moisture: moisture,
        fertility: fertility
    };
  }

  requestData() {
    // this.waitAndThen(2500, () => {
      // if (this.characteristics !== {} || !!this.characteristics[DATA_CHARACTERISTIC_UUID]) {
        // console.log("No operation because this.characteristics[DATA_CHARACTERISTIC_UUID] is false, but requestData was calledd somehow");
      // } else {
        // this.characteristics[DATA_CHARACTERISTIC_UUID].subscribe(this.receiveData);
      // }
      // then, loop again
      // this.requestData();
    // });
    // sensor.characteristics[DATA_CHARACTERISTIC_UUID].read();
    sensor.characteristics[DATA_CHARACTERISTIC_UUID].subscribe();
  }
  receiveData(data) {
    // console.log("receiveData called with data", data);
    if (data) {
      var res = this.parse_data(data);
      Object.assign(this.device.measure, res, {time: Date.now()});
      // console.log("📥 Got back data:");
      console.log("🌡 "+this.device.measure.temperature+"; 💦 "+ this.device.measure.moisture+"; 💡 "+ this.device.measure.lux );
      // do stuff like turn lights on and off based on the time
      this.controller.lights.manageLights(this.device.measure.lux);
      // control based on temperature
      this.controller.heater.manageHeat(this.device.measure.temperature);
    } else {
      console.log("receiveData called with no data arg. ignoring it.");
    }
    mySensorController.autoRescan();
  }
  parse_firmware(data) {
    return {
        battery_level: parseInt(data.toString('hex', 0, 1), 16),
        firmware_version: data.toString('ascii', 2, data.length)
    };
  }
}

class sensorController {
  constructor(sensor) {
    this.peripheralPromise;
    this.peripheralFound = false;
    this.sensor = sensor;
    this.waiters;
    this.noble = noble;
    this.lights;
    this.heater;
    this.register();
  }
  autoRescan() {
    if (this.waiters) {
      clearTimeout(this.waiters);
    }
    this.waiters = setTimeout(() => {
      this.connectToDevice(this.sensor.peripheral);
    }, RECONNECT_TIMEOUT_CONST);
  }

  // this function just runs itself every INTERVAL_CONST, and then after TIMEOUT_CONST time, it'll reject.
  watchForPeripheralFound = () => {
    return new Promise((resolve, reject) => {
      const startTime = new Date().getTime();
      const pollInterval = setInterval(() => {
        if (this.sensor.peripheral) {
          clearInterval(pollInterval);
          resolve(this.sensor.peripheral);
          return true;
        } else if ((new Date().getTime() - startTime) > TIMEOUT_CONST) {
          console.log("\n⌛️ Peripheral Discovery Timeout. Restarting...");
          clearInterval(pollInterval);
          reject(TIMEOUT);
          return false;
        } else {
          // process.stdout.write('#');
        }
      }, INTERVAL_CONST);
    })
  };

  register() {
    this.noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        const findPeripheral = () => {
          return new Promise((resolve, reject) => {
            console.log("🔮 Scanning for device with UUID: " + DESIRED_PERIPHERAL_UUID+"...");
            process.stdout.write('🔎 ');

            // start scanning for devices
            this.noble.startScanning();
      
            // instantiate the timeout watcher, which will either return true or false. 
            // if true, we have a peripheral! if false, then we need to start over.
            this.watchForPeripheralFound().then((foundVal) => {
              // This block runs if we found a peripheral
              // this.sensor.peripheral
            }).catch((reason) => {
              if (reason === TIMEOUT) {
                this.noble.stopScanning();
                findPeripheral();
              } else {
                console.log("Failed to discover peripheral, because: "+reason);
              }
            });
          });
        };
        findPeripheral();
      } else {
        this.noble.stopScanning();
      }
    });

    this.noble.on('discover',  (peripheral) => {
      process.stdout.write('.');
      // TODO: this way works on the raspberry pi, but my mac wasnt resolving localname so i did the lookup by UUID. Make it smart and detect.
      // if (peripheral.advertisement.localName === 'Flower care') {
      if (peripheral.uuid === DESIRED_PERIPHERAL_UUID) {
        process.stdout.write(`\r✅ Found ${DESIRED_PERIPHERAL_UUID}!`);
        
        process.stdout.write(`\n⚡️ Connecting to device with address ${peripheral.address}...`);
        if (!this.sensor) {
          console.log("Sensor is undefined at this point. probably this is just a fluke. restarting...")
          this.noble.stopScanning();
          this.findPeripheral();
        } else {
          this.sensor.peripheral = peripheral;
          this.connectToDevice();
        }
      }
    });
  }


  connectToDevice() {
    /* 
      waitForConnection is a function that creates a new promise, and then issues a connect command on the peripheral
      it resolves on success. on failure it rejects with an error message that wont be seen.
    */
    const waitForConnection = () => new Promise((resolve, reject) => {
      try {
        this.sensor.peripheral.connect((error) => {
          if (error) {
            console.log(`☢️ Connect error: ${error}`);
            noble.startScanning([], true);
            reject('error connecting: '+error);
            return;
          }
          process.stdout.write('\r🔗 Connected!\n');
          resolve(true);
        });
      } catch(err) {
        console.log("waitForConnection threw an error: ", err);
        reject('Unknown Error in waitForConnection'+err);
      }
    });
    
    /* 
      connection makes use of promiseWithTimeout which is just Promise.race() under the hood.
      it waits for either waitForConnection, or a timer of length RECONNECT_TIMEOUT_CONST to resolve.
      promiseWithTimeout will reject if the timer wins the race. So if that happens then we 
      restart the connection request from the top. Otherwise, we have a connection, so findServices()!
    */
    const openConnection = () => {
      return promiseWithTimeout(RECONNECT_TIMEOUT_CONST, waitForConnection, TIMEOUT)
      .then((resolveVal) => {
        this.findServices();
      }).catch((reason)=>{
        if (reason === TIMEOUT) {
          console.log("\n⌛️ Connection request timed out. Restarting...");
          openConnection();
          return false;
        } else {
          console.log("Error connecting: ", reason);
          return false;
        }
      });
    };

    try {
      // BLE cannot scan and connect in parallel, so we stop scanning here:
        this.noble.stopScanning();
        const connectionResponse = openConnection();
        connectionResponse.catch((reason) => console.log("Unexpected error in stopStanning or openConnection: ", reason));
      } catch(err) {
        console.warn("Unknown error in connectToDevice: ", err);
      }
    
  };


  findServices() {
    const {peripheral} = this.sensor;
    sensor.uuid = peripheral.uuid;
    sensor.address = peripheral.address;
    sensor.name = peripheral.advertisement.localName; // not needed but nice to have
    sensor.characteristics = {};
    sensor.peripheral = peripheral;
    sensor.device.name = peripheral.advertisement.localName;
    sensor.device.device_id = peripheral.id;

    sensor.peripheral.discoverServices([], (error, services) => {
      // we found the list of services, now trigger characteristics lookup for each of them:
      for (let i = 0; i < services.length; i++) {
        const service = services[i];
        if (service.uuid === DATA_SERVICE_UUID) {

          service.discoverCharacteristics([], function (error, characteristics) {
            characteristics.forEach(function (characteristic) {
              switch (characteristic.uuid) {
                  case DATA_CHARACTERISTIC_UUID:
                      // console.log("🌍DISCOVERY🌍 DATA_CHARACTERISTIC_UUID HIT!:"+DATA_CHARACTERISTIC_UUID);
                      sensor.characteristics[characteristic.uuid] = characteristic;
                      sensor.characteristics[characteristic.uuid].on('data', (data, isNotification) => {
                        sensor.receiveData(data);
                      });
                      sensor.requestData();
                      break;
                  case FIRMWARE_CHARACTERISTIC_UUID:
                    // console.log("FIRMWARE_CHARACTERISTIC_UUID HIT!:"+FIRMWARE_CHARACTERISTIC_UUID);
                      sensor.characteristics[characteristic.uuid] = characteristic;
                      sensor.characteristics[characteristic.uuid].read(function (error, data) {
                          const res = sensor.parse_firmware(data);
                          Object.assign(sensor.device, res);
                          process.stdout.write("🔋 "+res.battery_level+"% | 𝒱 Firmware version: "+res.firmware_version+"\n");
                      });
                      break;
                  case REALTIME_CHARACTERISTIC_UUID:
                      console.log(`⛏ Found a realtime endpoint. Enabling realtime on ${peripheral.id}.`);
                      sensor.characteristics[characteristic.uuid] = characteristic;
                      sensor.characteristics[characteristic.uuid].write(REALTIME_META_VALUE, false);
                      // sensor.characteristic.notify(true);
                      // sensor.characteristic.subscribe(sensor.receiveData);
                      break;
                  default:
                      // console.log('Found characteristic uuid %s but not matched the criteria', characteristic.uuid);
              }
          });
        });
        
      }
      }
    });
  };
}


const promiseWithTimeout = (timeoutMs, promise, failureMessage) => {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(failureMessage);
    }, timeoutMs);
  });

  return Promise.race([ 
    promise(), 
    timeoutPromise, 
  ]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  }); 
}

/* CONTROL THE LIGHTS! */
class Lights {
  switchOff = throttle(function() {
    console.log("💡⬇️ Turning off switch")
    exec("./tplink_smartplug.py -t "+LIGHTS_IP_ADDRESS+" -c off", (error, stdout, stderr) => {
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
    exec("./tplink_smartplug.py -t "+LIGHTS_IP_ADDRESS+" -c on", (error, stdout, stderr) => {
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
    let LOCALTIME = { 
      hour: (new Date()).getHours(),
      minutes: (new Date()).getMinutes(),
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
    };

    const lightsShouldBeOn = ((LOCALTIME.hour > LIGHTS_ON_TIME) || (LOCALTIME.hour < LIGHTS_OFF_TIME));
    const lightsShouldBeOff = ((LOCALTIME.hour > LIGHTS_OFF_TIME) || (LOCALTIME.hour < LIGHTS_ON_TIME));
    if (lightsShouldBeOn) {
      // console.log("Lights should be on");
      this.switchOn();
    } else if (lightsShouldBeOff) {
      this.switchOff();
    }
  };
}


/* CONTROL THE HEAT! */
class Heater {
  switchOff = throttle(function() {
    console.log("🌡♨️ Turning off switch")
    exec("./tplink_smartplug.py -t "+HEATER_IP_ADDRESS+" -c off", (error, stdout, stderr) => {
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
    exec("./tplink_smartplug.py -t "+HEATER_IP_ADDRESS+" -c on", (error, stdout, stderr) => {
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
    const itsTooHot = temperature > GREENHOUSE_TEMP_MAX;
    const itsTooCold = temperature < GREENHOUSE_TEMP_MIN;
    const itsWayTooCold = temperature < (GREENHOUSE_TEMP_MIN - 10);
    const itsWayTooHot = temperature > (GREENHOUSE_TEMP_MIN + 10);

    if (itsTooHot) {
      this.switchOff();
    } else if (itsTooCold) {
      this.switchOn();
    } else if (itsWayTooCold || itsWayTooHot) {
      sendNotification("WARNING! TEMPERATURE IS OUT OF BOUNDS. Currently: "+temperature);
    }
  };
}


let sensor = new sensorReader();
let lights = new Lights;
let heater = new Heater;
let mySensorController = new sensorController(sensor);
mySensorController.sensor.controller = mySensorController;
mySensorController.lights = lights;
mySensorController.heater = heater;

const sendNotification = (message) => {
  console.warn("🚨 "+message);
}