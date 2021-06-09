/* eslint-disable handle-callback-err */
/** discover a device (here, the first one where the name was resolved),
 * for the first device discover all services and characteristics,
 * store the collected GATT information into a meta-data object and write to disk.
 * Finds a temperature characteristic and registers for data.
 * Prints timing information from discovered to connected to reading states.
 */

const noble = require('@abandonware/noble');
const fs = require('fs');

// the sensor value to scan for, number of bits and factor for displaying it
const CHANNEL = 'fe95'; //process.env.CHANNEL ? process.env.CHANNEL : 'Temperature';
const SERVICE_UUID = '0000120600001000800000805f9b34fb';
const CHARACTERISTIC_UUID = '00001a1000001000800000805f9b34fb';
const BITS = process.env.BITS ? 1 * process.env.BITS : 16;
const FACTOR = process.env.FACTOR ? 1.0 * process.env.FACTOR : 0.1;

// BEGIN NEW
const DEFAULT_DEVICE_NAME = 'Flower care';
const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);
// END NEW

const EXT = '.dump';

noble.on('stateChange', function (state) {
  if (state === 'poweredOn') {
    noble.startScanning();
  } else {
    noble.stopScanning();
  }
});

let tDisco = 0; // time when device was discovered
let tConn = 0; // time when connection to device was established
let tRead = 0; // time when reading data starts.

// collect device meta-data into this object:
let meta = {
  services: [], // stores an array of GATT service data objects
  characteristics: {} // a map with key service-UUID, stores the array of characteristics
};

noble.on('discover', function (peripheral) {
  // console.log(`peripheral discovered (${peripheral.id} with address <${peripheral.address}, ${peripheral.addressType}>, connectable ${peripheral.connectable}, RSSI ${peripheral.rssi}:`);
  // console.log('\thello my local name is:');
  // console.log(`\t\t${peripheral.advertisement.localName}`);
  // console.log();

  // connect to the first device with a valid name
  if (peripheral.uuid === '5003a1213f8c46bb963ff9b6136c0bf8') {
    console.log(`Connecting to  ${peripheral.address} ${peripheral.advertisement.localName}`);

    tDisco = Date.now();

    connectToDevice(peripheral);
  }
});

const connectToDevice = function (peripheral) {
  // BLE cannot scan and connect in parallel, so we stop scanning here:
  noble.stopScanning();

  peripheral.connect((error) => {
    // noble.startScanning([], true)
    if (error) {
      console.log(`Connect error: ${error}`);
      noble.startScanning([], true);
      return;
    }
    tConn = Date.now();
    console.log('Connected!');

    findServices(noble, peripheral);
  });
};

let servicesToRead = 0;

const findServices = function (noble, peripheral) {
  meta.uuid = peripheral.uuid;
  meta.address = peripheral.address;
  meta.name = peripheral.advertisement.localName; // not needed but nice to have

  meta.characteristics = {};

  // callback triggers with GATT-relevant data
  peripheral.on('servicesDiscovered', (peripheral, services) => {
    console.log(`servicesDiscovered: Found ${services.length} services! `);
    meta.services = services;
    for (const i in services) {
      const service = services[i];
      console.log(`\tservice ${i} : ${JSON.stringify(service)}`);
      // meta.services[ service.uuid ] = service
    }
  });

  peripheral.discoverServices([], (error, services) => {
    let sensorCharacteristic;

    servicesToRead = services.length;
    console.log("Service has "+servicesToRead+" services"); //, services);
    // we found the list of services, now trigger characteristics lookup for each of them:

    for (let i = 0; i < services.length; i++) {
      const service = services[i];

      service.on('characteristicsDiscovered', (characteristics) => {
        // store the list of characteristics per service
        meta.characteristics[service.uuid] = characteristics;

        console.log(`SRV\t${service.uuid} characteristic GATT data: `);
        for (let i = 0; i < characteristics.length; i++) {
          console.log(`\t${service.uuid} chara.\t  ${i} ${JSON.stringify(characteristics[i])}`);
        }
      });

      service.discoverCharacteristics([], function (error, characteristics) {
        // START NEW
        var device = {
          device_id: peripheral.id,
          name: peripheral.advertisement.localName,
          measure : {
              time: null
          }
        };
        characteristics.forEach(function (characteristic) {
          var time = {time: Date.now()};
          switch (characteristic.uuid) {
              case DATA_CHARACTERISTIC_UUID:
                  debug("DATA_CHARACTERISTIC_UUID HIT!:"+DATA_CHARACTERISTIC_UUID);
                  characteristic.read(function (error, data) {
                      var res = _parse_data(peripheral, data);
                      Object.assign(device.measure, res, time);
                      console.log("Got back data: ", device);

                  });
                  break;
              case FIRMWARE_CHARACTERISTIC_UUID:
                debug("FIRMWARE_CHARACTERISTIC_UUID HIT!:"+FIRMWARE_CHARACTERISTIC_UUID);
                  characteristic.read(function (error, data) {
                      var res = _parse_firmware(peripheral, data);
                      Object.assign(device, res);
                  });
                  break;
              case REALTIME_CHARACTERISTIC_UUID:
                  debug('Enabling realtime on %s', peripheral.id);
                  characteristic.write(REALTIME_META_VALUE, false);
                  break;
              default:
                  // debug('Found characteristic uuid %s but not matched the criteria', characteristic.uuid);
          }
      });

      // custom
      

      // END NEW
      //   console.log(`SRV\t${service.uuid} characteristic decoded data: `);
      //   for (let j = 0; j < characteristics.length; j++) {
      //     const ch = characteristics[j];
      //     console.log(`\t${service.uuid} chara.\t  ${j} ${ch}`);
      //     if (ch._serviceUuid == SERVICE_UUID && ch.uuid == CHARACTERISTIC_UUID) {
      //       console.log(`found ${CHARACTERISTIC_UUID} characteristic!`);
      //       sensorCharacteristic = ch;
      //     } else {
      //       // console.log("Foudn a channel but it's name is: ", ch.name, "which didn't match "+CHANNEL);
      //     }
      //   }

      //   servicesToRead--;
      //   if (!servicesToRead) {
      //     console.log('----------------- FINISHED');
      //     console.log(JSON.stringify(meta, null, 4));
      //     // write to file
      //     fs.writeFile(meta.uuid + EXT, JSON.stringify(meta, null, 2), function (err) {
      //       if (err) {
      //         return console.log(err);
      //       }
      //       console.log('The data was saved to ', meta.uuid + EXT);
      //     });

      //     if (sensorCharacteristic) {
      //       console.log('Listening for temperature data...');

      //       tRead = Date.now();

      //       sensorCharacteristic.on('data', (data) => {
      //         console.log("Got sensor characteristic data: ", data);
      //         if (BITS === 16) {
      //           console.log(` new ${CHARACTERISTIC_UUID} ${data.readUInt16LE() * FACTOR}`);
      //         } else if (BITS === 32) {
      //           console.log(` new ${CHARACTERISTIC_UUID} ${data.readUInt32LE() * FACTOR}`);
      //         } else {
      //           console.log(` Cannot cope with BITS value ${BITS}`);
      //         }
      //       });
      //       sensorCharacteristic.read();
      //     }

      //     console.log(`Timespan from discovery to connected: ${tConn - tDisco} ms`);
      //     console.log(`Timespan from connected to reading  : ${tRead - tConn} ms`);
      //   }
      });
    }
  });
};


function _parse_data(peripheral, data) {
  let temperature = data.readUInt16LE(0) / 10;
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

function debug(...lines) {
  lines.forEach((item) => {console.log("DEBUG:" ,item)})
}