const { exec } = require("child_process");
const noble = require('@abandonware/noble');
const fs = require('fs');


// move to config file or arguments
const LIGHTSWITCH_IP_ADDRESS = '192.168.0.20';
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
    this.device = {
      device_id: undefined,
      name: undefined,
      measure : {
          time: null
      }
    };
    this.outlet = {
      ip_address: LIGHTSWITCH_IP_ADDRESS
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
    console.log("receiveData called with data", data);
    if (data) {
      var res = this.parse_data(data);
      Object.assign(this.device.measure, res, {time: Date.now()});
      console.log("📥 Got back data:");
      console.log("🌡 "+this.device.measure.temperature+"; 💦 "+ this.device.measure.moisture+"; 💡 "+ this.device.measure.lux );
      if (this.device.measure.lux > 300) {
        this.switchLightOff();
      } else {
        this.switchLightOn();
      }
    } else {
      console.log("receiveData called with no data arg. ignoring it.");
    }
    mySensorController.autoRescan();
  }
  switchLightOff() {
    console.log("💡 Turning off switch")
    exec("./tplink_smartplug.py -t "+this.outlet.ip_address+" -c off", (error, stdout, stderr) => {
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
  }
  switchLightOn() {
    console.log("💡 Turning on switch")
    exec("./tplink_smartplug.py -t "+this.outlet.ip_address+" -c on", (error, stdout, stderr) => {
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
  }
}

class sensorController {
  constructor(sensor) {
    this.sensor = sensor;
    this.waiters;
    this.noble = noble;
    this.register();
  }
  waitAndThen(waitTime, callback) {
    if (this.waiters) {
      // console.log('clearing timeout clock');
      clearTimeout(this.waiters);
    }
    this.waiters = setTimeout(callback, waitTime);
  }
  autoRescan() {
    this.waitAndThen(4000, () => {
      connectToDevice(this.sensor.peripheral);
    });
  }
  register() {
    this.noble.on('stateChange', (state) => {
      if (state === 'poweredOn') {
        console.log("🔮 Scanning for device with UUID: " + DESIRED_PERIPHERAL_UUID+"...");
        process.stdout.write('🔎 ');
        this.noble.startScanning();
      } else {
        this.noble.stopScanning();
      }
    });

    this.noble.on('discover',  (peripheral) => {
      process.stdout.write('.');
      if (peripheral.uuid === DESIRED_PERIPHERAL_UUID) {
        process.stdout.write(`\r✅ Found ${DESIRED_PERIPHERAL_UUID}!`);
        process.stdout.write(`\n⚡️ Connecting to device with address ${peripheral.address}...`);
        if (!this.sensor) {
          console.log("Sensor is undefined at this point. probably this is just a fluke. restarting...")
          init();
        } else {
          this.sensor.peripheral = peripheral;
          connectToDevice(this.sensor.peripheral);
        }
      }
    });
  }
}

let sensor = new sensorReader();
let mySensorController = new sensorController(sensor);

const init = () => {
  sensor = new sensorReader();
  mySensorController = new sensorController(sensor);
}

const connectToDevice = function (peripheral) {
  // BLE cannot scan and connect in parallel, so we stop scanning here:
  noble.stopScanning();

  peripheral.connect((error) => {
    if (error) {
      console.log(`☢️ Connect error: ${error}`);
      noble.startScanning([], true);
      return;
    }
    process.stdout.write('\r🔗 Connected!\n');

    findServices(noble, peripheral);
  });
};

const findServices = function (noble, peripheral) {
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
                    console.log("🌍DISCOVERY🌍 DATA_CHARACTERISTIC_UUID HIT!:"+DATA_CHARACTERISTIC_UUID);
                    sensor.characteristics[characteristic.uuid] = characteristic;
                    sensor.characteristics[characteristic.uuid].on('data', (data, isNotification) => {
                      sensor.receiveData(data);
                    });
                    sensor.requestData();
                    break;
                case FIRMWARE_CHARACTERISTIC_UUID:
                  console.log("FIRMWARE_CHARACTERISTIC_UUID HIT!:"+FIRMWARE_CHARACTERISTIC_UUID);
                    sensor.characteristics[characteristic.uuid] = characteristic;
                    sensor.characteristics[characteristic.uuid].read(function (error, data) {
                        var res = _parse_firmware(peripheral, data);
                        Object.assign(sensor.device, res);
                        process.stdout.write("🔋 "+res.battery_level+"% | 𝒱 Firmware version: "+res.firmware_version+"\n");
                    });
                    break;
                case REALTIME_CHARACTERISTIC_UUID:
                    console.log('⛏ Found a realtime endpoint. Enabling realtime on peripheral.id.');
                    sensor.characteristics[characteristic.uuid] = characteristic;
                    sensor.characteristics[characteristic.uuid].write(REALTIME_META_VALUE, false);
                    // sensor.characteristic.notify(true);
                    // sensor.characteristic.subscribe(sensor.receiveData);
                    break;
                default:
                    // console.log('Found characteristic uuid %s but not matched the criteria', characteristic.uuid);
            }
        });
        // save characteristics
        // console.log("chars before: ", sensor.characteristics)
        // sensor.characteristics = characteristics;
        // console.log("chars after: ", sensor.characteristics)
      });
      
    }
    }
  });
};





function _parse_firmware(peripheral, data) {
  return {
      battery_level: parseInt(data.toString('hex', 0, 1), 16),
      firmware_version: data.toString('ascii', 2, data.length)
  };
}

