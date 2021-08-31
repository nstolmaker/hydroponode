
// const throttle = require('lodash/throttle');

// import noblePgk from '@abandonware/noble'
// const noble = require('@abandonware/noble');
import noble from '@abandonware/noble'
import Consts from './utils/constants.js'

import { Lights } from './services/Lights.js'
import { Heater } from './services/Heater.js'
import { Notifier } from './services/Notifier.js'
import { Pump } from './services/Pump.js'
import { Broadcast } from './services/Broadcast.js'


class sensorReader {
  constructor() {
    this.uuid = '';
    this.address = '';
    this.name = ''
    this.characteristics = {} // a map with key service-UUID, stores the array of characteristics
    this.services = []; // stores an array of GATT service data objects
    this.service; // we basically only care about one service, so lets keep that one here for convenience and ditch that array soon
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
        fertility: fertility,
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
    if (sensor && sensor.characteristics && sensor.characteristics[Consts.DATA_CHARACTERISTIC_UUID]) {
      sensor.characteristics[Consts.DATA_CHARACTERISTIC_UUID].subscribe();
    } else {
      console.warn("sensor.requestData was called, but sensor?.characteristics[Consts.DATA_CHARACTERISTIC_UUID] did not return truthy. Something is wrong. Hopefully we'll recover. If you keep seeing data then it's probably fine.");
    }
  }
  async receiveData(data) {
    // console.log("receiveData called with data", data);
    if (data) {
      var res = this.parse_data(data);
      Object.assign(this.device.measure, res, {time: Date.now()});
      // console.log("📥 Got back data:");
      console.log("🌡 "+this.device.measure.temperature+"; 💦 "+ this.device.measure.moisture+"; 💡 "+ this.device.measure.lux );

      // do stuff like turn lights on and off based on the time
      this.controller.lights.manageLights(this.device.measure.lux);
      // control based on temperature
      //this.controller.heater.manageHeat(this.device.measure.temperature);
      // control based on moisture
      this.controller.pump.manageWater(this.device.measure.moisture);

      // WORKFLOW INTEGRATION!
      const sensorData = {
        temperature: this.device.measure.temperature, 
        moisture: this.device.measure.moisture,
        light: this.device.measure.lux,
        battery: this.device.measure.battery_level
      }
      const broadcastResult = await this.controller.broadcast.broadcastToWorkflowEngine(sensorData)
    } else {
      console.log("receiveData called with no data arg. ignoring it.");
    }
	console.log("received some data, managed lights and heat. Die. "); 
	await sensor.controller.noble.stopScanning();
	await sensor.peripheral.disconnectAsync();
	console.log("[End Time is: " + new Date().toLocaleString()+"] stoppedScanning and disconnected. Calling process.exit(1).");
  let that = this;
  async function dontDieWhileWatering() {
    if (that.controller.pump.watering || notifier.mailing || broadcastResult.) {
	    console.log("Waiting for watering to finish or mailing to complete", that.controller.pump.watering, notifier.mailing);
      setTimeout(dontDieWhileWatering, 1000)
    } else {
      process.exit(1);
    }
  }
  dontDieWhileWatering();

    // console.log("receivedData, calling autoRescan. I think this might actually be where the bug is.");
    // mySensorController.autoRescan();
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
    this.notifier;
  }
  autoRescan() {
    if (this.waiters) {
      clearTimeout(this.waiters);
    }
    this.waiters = setTimeout(() => {
      this.connectToDevice(this.sensor.peripheral);
    }, Consts.RECONNECT_TIMEOUT_CONST);
  }

  // this function just runs itself every INTERVAL_CONST, and then after TIMEOUT_CONST time, it'll reject.
  watchForPeripheralFound() {
    return new Promise((resolve, reject) => {
      const startTime = new Date().getTime();
      const pollInterval = setInterval(() => {
        if (this.sensor.peripheral) {
          clearInterval(pollInterval);
          resolve(this.sensor.peripheral);
          return true;
        } else if ((new Date().getTime() - startTime) > Consts.TIMEOUT_CONST) {
          console.log("\n⌛️ Peripheral Discovery Timeout. Restarting...");
          clearInterval(pollInterval);
          reject(Consts.TIMEOUT);
          return false;
        } else {
          // process.stdout.write('#');
        }
      }, Consts.INTERVAL_CONST);
    })
  };

  register() {
    // this.noble.removeAllListeners('stateChange');
    this.noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        const findPeripheral = () => {
          return new Promise((resolve, reject) => {
            console.log("🔮 Scanning for device with UUID: " + Consts.DESIRED_PERIPHERAL_UUID+"...");
            process.stdout.write('🔎 ');

            // start scanning for devices
            this.noble.startScanning();
      
            // instantiate the timeout watcher, which will either return true or false. 
            // if true, we have a peripheral! if false, then we need to start over.
            this.watchForPeripheralFound().then((foundVal) => {
              // This block runs if we found a peripheral
              // this.sensor.peripheral
            }).catch((reason) => {
              if (reason === Consts.TIMEOUT) {
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

    this.noble.removeAllListeners('discover');
    this.noble.on('discover',  (peripheral) => {
      process.stdout.write('.');
      // TODO: this way works on the raspberry pi, but my mac wasnt resolving localname so i did the lookup by UUID. Make it smart and detect.
      // if (peripheral.advertisement.localName === 'Flower care') {
      if ((peripheral.uuid === Consts.DESIRED_PERIPHERAL_UUID) || peripheral.advertisement.localName === 'Flower care') {
        process.stdout.write(`\r✅ Found ${Consts.DESIRED_PERIPHERAL_UUID}!`);
        
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
        if (this.sensor.peripheral.state === 'connected') {
          console.log({'Seems to be already connected: ':this.sensor.peripheral.state});
          console.log({noble});
          this.sensor.peripheral.disconnect();
        }
        this.sensor.peripheral.connect((error) => {
          if (error) {
            console.log(`☢️ Connect error: ${error}`);
            noble.startScanning([], true);
            reject('error connecting: '+error);
            return;
          } else {
            process.stdout.write('\r🔗 Connected!\n');
            resolve(true);
          }
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
      return promiseWithTimeout(Consts.RECONNECT_TIMEOUT_CONST, waitForConnection, Consts.TIMEOUT)
      .then((resolveVal) => {
        this.findServices();
      }).catch((reason)=>{
        if (reason === Consts.TIMEOUT) {
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
    
  }


  findServices() {
    console.log("findServices called");
    const myPeripheral = this.sensor.peripheral;
    sensor.uuid = myPeripheral.uuid;
    sensor.address = myPeripheral.address;
    sensor.name = myPeripheral.advertisement.localName; // not needed but nice to have
    sensor.characteristics = {};
    sensor.peripheral = myPeripheral;
    sensor.device.name = myPeripheral.advertisement.localName;
    sensor.device.device_id = myPeripheral.id;
  
    const waitForServices = () => new Promise((resolve, reject) => {
        sensor.peripheral.discoverServices([], (error, services) => {
          console.log("🚚 Services discovered");
          let foundTheServiceWeWereLookingFor = false;
          if (error) console.log("There was an error in discoverServices: ", error);
          // we found the list of services, now trigger characteristics lookup for each of them:
          for (let i = 0; i < services.length; i++) {
            const service = services[i];
            if (service.uuid === Consts.DATA_SERVICE_UUID) {
              foundTheServiceWeWereLookingFor = true;
              // console.log("FOUND THE RIGHT SERVICE! UUID: ", service.uuid);
              sensor.service = service;
              resolve(service);
            }
          }
          if (!foundTheServiceWeWereLookingFor) {
            console.log('Rejecting inside waitForServices because foundTheServiceWeWereLookingFor returned false');
            reject(Consts.TIMEOUT);
          }
        });
      // } catch(err) {
      //   console.log("waitForServices threw an error: ", err);
      //   reject('Unknown Error in waitForServices'+err);
      // }
    });

    const openServices = () => {
      return promiseWithTimeout(Consts.RECONNECT_TIMEOUT_CONST, waitForServices, Consts.TIMEOUT)
      .then((resolveVal) => {
        console.log("Found Services by now. Calling findCharacteristics...")
        this.findCharacteristics();
      }).catch((reason)=>{
        if (reason === Consts.TIMEOUT) {
          console.log("\n⌛️ WaitForServices request timed out. Calling connectToDevice() again...");
          this.autoRescan();
          return false;
        } else {
          console.log("Error connecting: ", reason);
          return false;
        }
      });
    };


    try {
        const servicesResponse = openServices();
        servicesResponse.catch((reason) => console.log("Unexpected error in openServices: ", reason));
      } catch(err) {
        console.warn("Unknown error in openServices: ", err);
      }
    
  };
  // static async 
  async findCharacteristics() {
    let service = sensor.service;
    let foundSubscribableDataCharacteristic = 0;
    const waitForCharacteristics = async ()=> {
      // return new Promise((resolve, reject) => {
      console.log("waitForCharacteristics: calling service.discoverCharacteristics() on service.");
      const characteristicsPromise = service.discoverCharacteristicsAsync();
      await characteristicsPromise.then((characteristics)=>{
        console.log("discoverCharacteristicsAsync returned"); //  with val ", characteristics);
      // service.discoverCharacteristics([], (error, characteristics) => {
        characteristics.forEach((characteristic) => {
          switch (characteristic.uuid) {
            case Consts.DATA_CHARACTERISTIC_UUID:
                // console.log("🌍DISCOVERY🌍 DATA_CHARACTERISTIC_UUID HIT!:"+Consts.DATA_CHARACTERISTIC_UUID);
                sensor.characteristics[characteristic.uuid] = characteristic;
                foundSubscribableDataCharacteristic++;
                // clear listeners previously created, otherwise we end up with one for every time we call this function
                sensor.characteristics[characteristic.uuid].removeAllListeners('data');
                sensor.characteristics[characteristic.uuid].on('data', (data, isNotification) => {
                  // console.log('received data: ', data);
                  sensor.receiveData(data);
                });
                sensor.requestData();
                break;
            case Consts.FIRMWARE_CHARACTERISTIC_UUID:
              // console.log("FIRMWARE_CHARACTERISTIC_UUID HIT!:"+Consts.FIRMWARE_CHARACTERISTIC_UUID);
                sensor.characteristics[characteristic.uuid] = characteristic;
                sensor.characteristics[characteristic.uuid].read(function (error, data) {
                    const res = sensor.parse_firmware(data);
                    Object.assign(sensor.device, res);
                    process.stdout.write("🔋 "+res.battery_level+"% | 𝒱 Firmware version: "+res.firmware_version+"\n");
                    sensor.device.measure.battery_level = res.battery_level
		    if (res.battery_level <= Consts.BATTERY_MIN) {
      			notifier.sendNotification("WARNING! Batter Level low! "+ res.battery_level);
		    }
                });
                break;
            case Consts.REALTIME_CHARACTERISTIC_UUID:
                console.log(`⛏ Found a realtime endpoint. Enabling realtime on ${characteristic.uuid}.`);
                sensor.characteristics[characteristic.uuid] = characteristic;
                sensor.characteristics[characteristic.uuid].write(Consts.REALTIME_META_VALUE, false);
                foundSubscribableDataCharacteristic++;
                // resolve(true);
                // sensor.characteristic.notify(true);
                // sensor.characteristic.subscribe(sensor.receiveData);
                break;
            default:
                console.log('Found characteristic uuid %s but not matched the criteria', characteristic.uuid);
          }
        });
	      console.log("foundSubscribableDataCharacteristic is: ", foundSubscribableDataCharacteristic);
        if (foundSubscribableDataCharacteristic < 2) {
          console.log("Critical Failure in waitForCharacteristics. Didn't find a subscribable data characteristics. Probably should start over. Gonna try just calling findCharacteristics() again:");
            console.log("the state of the service right now is probably disconnected");
            if (sensor && sensor.peripheral.state === 'connected') {
              console.log('Seems to be already connected. Running this.findCharacteristics. State of peripheral is:: ',sensor.peripheral);
              sensor.peripheral.disconnect().then(()=> {
                this.autoRescan();
              })
            } else {
              console.log("not connected. state is: ", sensor ? sensor.peripheral.state : 'sensor undefined', ". Reconnecting to device");
              this.connectToDevice();
            }
        }
      }).catch((errorReason)=>{
        console.log("discoverCharacteristicsAsync threw an unknown error: ", errorReason);
      });
    // });
    return sensor.characteristics;
    }
    const openCharacteristics = async ()=> {
      return promiseWithTimeout(Consts.RECONNECT_TIMEOUT_CONST, waitForCharacteristics, Consts.TIMEOUT)
      .then(async (characteristics) => {
        //console.log("waitForCharacteristics returned successfully. characteristics:", characteristics);
      }).catch((reason)=>{
        if (reason === Consts.TIMEOUT) {
          console.log("\n⌛️ waitForCharacteristics request timed out. Calling openCharacteristics again...");
          openCharacteristics();
          return false;
        } else {
          console.log("Error connecting: ", reason);
          return false;
        }
      });
    }

    try {
      // const characteristicsResponse = 
      console.log("Got to teh return statement part here");
      const characteristicsResponse = await openCharacteristics();
      return characteristicsResponse;
      // characteristicsResponse.catch((reason) => console.log("Unexpected error in characteristicsResponse: ", reason));
    } catch(err) {
      console.warn("Unknown error in characteristicsResponse: ", err);
    }
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





let sensor = new sensorReader();
let lights = new Lights;
let heater = new Heater;
let pump = new Pump;
let notifier = new Notifier;
let broadcast = new Broadcast;
let mySensorController = new sensorController(sensor);
mySensorController.sensor.controller = mySensorController;
mySensorController.lights = lights;
mySensorController.heater = heater;
mySensorController.pump = pump;
mySensorController.notifier = notifier;
mySensorController.broadcast = broadcast

console.log("[Start Time is: " + new Date().toLocaleString()+"]");
export default mySensorController
