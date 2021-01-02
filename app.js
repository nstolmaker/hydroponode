
class sensorReader {
  constructor() {
    this.waiters;
  }
  waitAndThen(waitTime, callback) {
    if (this.waiters) {
      clearTimeout(this.waiters);
    }
    this.waiters = setTimeout(callback, waitAndThen);
  }
}


const noble = require('@abandonware/noble');
const fs = require('fs');

const DESIRED_PERIPHERAL_UUID = '5003a1213f8c46bb963ff9b6136c0bf8';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);
const EXT = '.dump';

const sensor = new sensorReader();
// collect device meta-data into this object:
let meta = {
  services: [], // stores an array of GATT service data objects
  characteristics: {} // a map with key service-UUID, stores the array of characteristics
};
sensor.meta = meta;
console.log("Sensor: ", sensor);

noble.on('stateChange', function (state) {
  if (state === 'poweredOn') {
    console.log("🔮 Scanning for device with UUID: " + DESIRED_PERIPHERAL_UUID+"...");
    process.stdout.write('🔎 ');
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

noble.on('discover', function (peripheral) {
  process.stdout.write('.');
  if (peripheral.uuid === DESIRED_PERIPHERAL_UUID) {
    process.stdout.write(`\r✅ Found ${DESIRED_PERIPHERAL_UUID}!`);
    process.stdout.write(`\n⚡️ Connecting to device with address ${peripheral.address}...`);
    connectToDevice(peripheral);
  }
});

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
  meta.uuid = peripheral.uuid;
  meta.address = peripheral.address;
  meta.name = peripheral.advertisement.localName; // not needed but nice to have
  meta.characteristics = {};

  peripheral.discoverServices([], (error, services) => {
    // let servicesToRead = services.length;
    // console.log("Service has "+servicesToRead+" services"); 

    // we found the list of services, now trigger characteristics lookup for each of them:
    for (let i = 0; i < services.length; i++) {
      const service = services[i];
      if (service.uuid === DATA_SERVICE_UUID) {

        // service.on('characteristicsDiscovered', (characteristics) => {
        //   // store the list of characteristics per service
        //   meta.characteristics[service.uuid] = characteristics;

        //   console.log(`SRV\t${service.uuid} characteristic GATT data: `);
        //   for (let i = 0; i < characteristics.length; i++) {
        //     console.log(`\t${service.uuid} chara.\t  ${i} ${JSON.stringify(characteristics[i])}`);
        //   }
        // });

        service.discoverCharacteristics([], function (error, characteristics) {
          // an object to keep all our data together 
          let device = {
            device_id: peripheral.id,
            name: peripheral.advertisement.localName,
            measure : {
                time: null
            }
          };
          characteristics.forEach(function (characteristic) {
            let time = {time: Date.now()};
            switch (characteristic.uuid) {
                case DATA_CHARACTERISTIC_UUID:
                    // console.log("DATA_CHARACTERISTIC_UUID HIT!:"+DATA_CHARACTERISTIC_UUID);
                    characteristic.read(function (error, data) {
                        var res = _parse_data(peripheral, data);
                        Object.assign(device.measure, res, time);
                        console.log("📥 Got back data:");
                        console.log("🌡 "+device.measure.temperature+"; 💦 "+ device.measure.moisture+"; 💡 "+ device.measure.lux );
                    });
                    break;
                case FIRMWARE_CHARACTERISTIC_UUID:
                  // console.log("FIRMWARE_CHARACTERISTIC_UUID HIT!:"+FIRMWARE_CHARACTERISTIC_UUID);
                    characteristic.read(function (error, data) {
                        var res = _parse_firmware(peripheral, data);
                        Object.assign(device, res);
                        process.stdout.write("🔋 "+res.battery_level+"% | 𝒱 Firmware version: "+res.firmware_version+"\n");
                    });
                    break;
                case REALTIME_CHARACTERISTIC_UUID:
                    console.log('⛏ Found a realtime endpoint. Enabling realtime on peripheral.id.');
                    characteristic.write(REALTIME_META_VALUE, false);
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

function requestData() {
  console.log("Waiting and then requesting data...");

}

function _parse_data(peripheral, data) {
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

function _parse_firmware(peripheral, data) {
  return {
      battery_level: parseInt(data.toString('hex', 0, 1), 16),
      firmware_version: data.toString('ascii', 2, data.length)
  };
}

