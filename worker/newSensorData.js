require('dotenv').config()
const { child, exec } = require('child_process');
const { Client, logger, Variables } = require('camunda-external-task-client-js');

// set baseUrl to the camunda engine url
const config = { baseUrl: process.env.CAMUNDA_BASE_URL + '/engine-rest' || 'http://localhost:8080/engine-rest', use: logger, asyncResponseTimeout: 10000 };

console.log("Using Camunda Engine @ "+config.baseUrl)
const client = new Client(config);

const SwitchIpFromName = {
  'light': process.env.LIGHT_IP,
  'heater': process.env.HEAT_IP,
  'pump': process.env.WATER_IP,
}

const { light, moisture, temperature, battery } = {
  'moisture': 69,
  'light': 609,
  'temperature': 66,
  'battery': 96
}

client.subscribe('sensor-data', async ({task, taskService}) => {
  console.log(`[${new Date().toLocaleDateString()}] {sensor-data} called! `)
  const processVariables = new Variables();
  processVariables.set("moisture", moisture)
  processVariables.set("light", light)
  processVariables.set("temperature",temperature)
  processVariables.set("battery", battery)

  console.log(`[${new Date().toLocaleDateString()}] {sensor-data} called, so i filled it with this data:  `, { light, moisture, temperature, battery })
  await taskService.complete(task, processVariables)
})