// import { Broadcast } from '../services/Broadcast.js'
// import { assert } from 'chai'
// var assert = require('chai').assert
// let Broadcast = require('../services/Broadcast.js')
import { Broadcast } from '../services/Broadcast'

  describe('Database connectivity', () => {

    it('should be able to save a sensor reading without throwing an error', async () => {
      const sensorData = {
        moisture: 'testMoist',
        light: 'testLight',
        temperature: 'testTemp',
        battery: 'testBattery'
      };

      const broadcast = new Broadcast();
      const prismaResponse = await broadcast.recordSensorDataInDb(sensorData);
      expect(prismaResponse).toBeTruthy();
    })


    it('should be able to save an action to history without throwing an error', async () => {
      const actionData = {
        system: 'hydroponode-jest',
        action: 'testSave',
        message: 'testing saving action to history with jest via hydroponode package'
      };

      const broadcast = new Broadcast();
      const prismaResponse = await broadcast.recordActionHistoryInDb(actionData);
      expect(prismaResponse).toBeTruthy();
    })
  })