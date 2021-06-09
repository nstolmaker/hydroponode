
// dotenv support not really needed at the moment. See the package.json script 'waverleigh' for how to set these from CLI
export const PUMP_IP_ADDRESS = process.env.PUMP_IP_ADDRESS || '192.168.0.41';
export const HEATER_IP_ADDRESS = process.env.HEATER_IP_ADDRESS || '192.168.0.42';
export const LIGHTS_IP_ADDRESS = process.env.LIGHTS_IP_ADDRESS || '192.168.0.43';
// console.log({PUMP_IP_ADDRESS}, {HEATER_IP_ADDRESS}, {LIGHTS_IP_ADDRESS});

// used for all the timeouts that we wrap everything with because this is wireless and it'll fail a lot.
export const INTERVAL_CONST = 500;
export const TIMEOUT_CONST = 7000; // how long to wait before retrying for: "Peripheral Discovery"
export const RECONNECT_TIMEOUT_CONST = 11000;  // how long to wait before retrying for: "connect" and "data received".
export const TIMEOUT = 'Timeout';  // enum
export const THROTTLE_SWITCH_TIME = 1000 * 30; // only flick switches once per minute

// GREENHOUSE target values
export const GREENHOUSE_TEMP_MIN = 70;
export const GREENHOUSE_TEMP_MAX = 82;
export const GREENHOUSE_MOISTURE_MIN = 30;
export const GREENHOUSE_LIGHT_MIN = 250;
export let LIGHTS_ON_TIME = 9;
export let LIGHTS_OFF_TIME = 21;

// magic numbers
export const DESIRED_PERIPHERAL_UUID = '5003a1213f8c46bb963ff9b6136c0bf8';
export const DATA_SERVICE_UUID = '0000120400001000800000805f9b34fb';
export const DATA_CHARACTERISTIC_UUID = '00001a0100001000800000805f9b34fb';
export const FIRMWARE_CHARACTERISTIC_UUID = '00001a0200001000800000805f9b34fb';
export const REALTIME_CHARACTERISTIC_UUID = '00001a0000001000800000805f9b34fb';
export const REALTIME_META_VALUE = Buffer.from([0xA0, 0x1F]);
const purpose = 'constants'
export default purpose