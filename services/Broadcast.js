import _ from 'lodash'
import qs from 'qs';
import Consts from '../utils/constants.js'
import axios from 'axios'
import 'dotenv/config.js';

/* Tell Camunda about the new sensor data! */
export class Broadcast {
  constructor() {
    this.workflowEngineAddress = Consts.CAMUNDA_BASE_URL
    this.sensorData = {}
  }
  async broadcastToWorkflowEngine(sensorData) {
    console.log("Broadcasting to workflow engine, sending sensorData: ", sensorData);
    const taskResponseData = await this.fetchAndLockOneTask();
    console.log("taskUnit returned from server is below. look for an id and pass it into the completed function", taskResponseData);
	  const { id: taskId } = taskResponseData.pop();
	  console.log("TaskId is: ", taskId);
    await this.sendSensorData(taskId, sensorData)
  }
  /**
   * Before we can do anything to a task in camunda, we have to take ownership of it and give it a temporary lock.
   * 
   */
  async fetchAndLockOneTask() {
    // payload
    const bodyPayload = {
      "workerId":"some-random-id",
      "maxTasks":1,
      "usePriority":true,
      "topics":[
         {
            "topicName":"sensor-data",
            "lockDuration":10000
         }
      ]
    }

    // request
    const response = await axios({
      url: `${this.workflowEngineAddress}/engine-rest/external-task/fetchAndLock`,
      data: bodyPayload,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }  
    }).catch((reason)=>{
      console.log("AXIOS ERROR! Reason: ", reason)
    })

    // response
    if (response && response.status === 200) {
      console.log("Fetched and locked one in! Go ahead and send in the data now.")
      return response.data
    } else {
      console.log("Fetched and locked but unrecognized status: ", response)
      return false
    }
  }

  /**
   * @param {moisture, light, temperature, battery_level} sensorData 
   * @description closes the workflow external task that's waiting, by sending it actual sensor data
   */
  async sendSensorData(taskId, sensorData) {
    // payload
    const bodyPayload = {
      "workerId": "some-random-id",
      "variables": {
        "moisture": {
          "value": sensorData.moisture,
          "type": "Integer"
        },
        "light": {
          "value": sensorData.light,
          "type": "Integer"
        },
        "temperature": {
          "value": sensorData.temperature,
          "type": "Integer"
        },
        "battery": {
          "value": sensorData.battery_level,
          "type": "Integer"
        }
      },
    }

    const endpointPath = `${this.workflowEngineAddress}/engine-rest/external-task/${taskId}/complete`
	  console.log("About to send sensor data to endpoint: ", endpointPath);
	  console.log("Payload is: ", bodyPayload);
    const response = await axios({
      url: endpointPath,
      data: bodyPayload,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }  
    }).catch((reason)=>{
      console.log("AXIOS ERROR! Reason: ", reason)
	    console.log("Response data: ", response.data)
    })

    // response
    if (response.status === 200) {
      console.log("Sensor Data sent!")
      return true
    } else {
      console.log("Sensor Data sent but unrecognized status: ", response)
      return false
    }
  }
}

export default Broadcast
