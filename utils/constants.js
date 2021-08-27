export default class Consts {

// dotenv support not really needed at the moment. See the package.json script 'waverleigh' for how to set these from CLI
PUMP_IP_ADDRESS = process.env.PUMP_IP_ADDRESS || '192.168.0.41';
HEATER_IP_ADDRESS = process.env.HEATER_IP_ADDRESS || '192.168.0.42';
LIGHTS_IP_ADDRESS = process.env.LIGHTS_IP_ADDRESS || '192.168.0.43';
// console.log({PUMP_IP_ADDRESS}, {HEATER_IP_ADDRESS}, {LIGHTS_IP_ADDRESS});

// used for all the timeouts that we wrap everything with because this is wireless and it'll fail a lot.
INTERVAL_CONST = 500;
TIMEOUT_CONST = 7000; // how long to wait before retrying for: "Peripheral Discovery"
RECONNECT_TIMEOUT_CONST = 11000;  // how long to wait before retrying for: "connect" and "data received".
TIMEOUT = 'Timeout';  // enum
THROTTLE_SWITCH_TIME = 1000 * 30; // only flick switches once per minute

// GREENHOUSE target values
BATTERY_MIN = 20;
GREENHOUSE_TEMP_MIN = 74;
GREENHOUSE_TEMP_MAX = 78; // keep this number pretty low, like 10 degrees less than actual max temp, because the probe is pretty low down in the chamber, the temp at the top is about 10 degrees warmer, and thats where the seedlings live.
GREENHOUSE_MOISTURE_MIN = 43; // after watering the moisture level drops down to about 48 pretty quickly, but it stays in the high fourties for hours. Need to experiment more to see what a good amount of drying out is.
GREENHOUSE_LIGHT_MIN = 50; // if for some reason it's bright in the chamber for another reason, hopefully it won't be more than 50 lumens. It will probably never be less than 5-10 lumens, so 0 isnt a good minimum.
WATERING_DURATION = 6000; // in miliseconds, how long do we run the pump for
LIGHTS_ON_TIME = 9;
LIGHTS_OFF_TIME = 21;

// magic numbers
DESIRED_PERIPHERAL_UUID = '5003a1213f8c46bb963ff9b6136c0bf8';
DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);

}