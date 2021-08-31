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
    this.sensorData = sensorData
   fetchAndLockOneTask()
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
    } else {
      console.log("Fetched and locked but unrecognized status: ", response.status, response.statusText)
    }
  }
}

export default Broadcast