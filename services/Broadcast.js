import _ from 'lodash'
import Consts from '../utils/constants.js'
const {throttle} = _
import { exec  } from 'child_process'

/* Tell Camunda about the new sensor data! */
export class Broadcast {
  constructor() {
    this.workflowEngineAddress = Consts.CAMUNDA_BASE_URL
    this.sensorData = {}
  }
  broadcastToWorkflowEngine(sensorData) {
    console.log("Broadcasting to workflow engine, sending sensorData: ", sensorData)
    // this.sensorData = sensorData
    const taskUnit = fetchAndLockOneTask()
    console.log("taskUnit returned from server is below. look for an id and pass it into the completed function", taskUnit)
    const taskId = taskUnit.id
    this.sendSensorData(taskId, sensorData)
  }
  /**
   * Before we can do anything to a task in camunda, we have to take ownership of it and give it a temporary lock.
   * 
   */
  async fetchAndLockOneTask() {
    // payload
    const bodyPayload = {
      "workerId":"tuesdayWorker",
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
    const response = await fetch(`${this.workflowEngineAddress}/engine-rest/external-task/fetchAndLock`, {
      body: JSON.stringify(bodyPayload),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }  
    })

    // response
    if (response.status === '204') {
      console.log("Fetched and locked one in! Go ahead and send in the data now.")
      console.log("Server response looks like this: ",response)
      return response.body
    } else {
      console.log("Fetched and locked but unrecognized status: ", response.status, response.statusText)
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
      "workerId": "tuesdayWorker",
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
    

    // request
    const response = await fetch(endpointPath, {
      body: JSON.stringify(bodyPayload),
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      }  
    })

    // response
    if (response.status === '204') {
      console.log("Sensor Data sent!")
      return true
    } else {
      console.log("Sensor Data sent but unrecognized status: ", response.status, response.statusText)
      return false
    }
  }
}

export default Broadcast