const { DateTime, Interval } = require("luxon");

let startTime = 9;
let stopTime = 21;
// if stopTime < startTime then they mean that time in the AM *tomorrow*. The luxon library will handle the date math for us, so just add 24 hours.
if (stopTime < startTime) stopTime = stopTime+24;

let startTimeDT = DateTime.local().startOf("day").plus({hours: startTime});
let stopTimeDT = DateTime.local().startOf("day").plus({hours: stopTime});
//const currentDate = currentDateTime.year + '-' + currentDateTime.month +'-'+ currentDateTime.day() +' '+ currentDateTime.hour +":"+ currentDateTime.minutes
// console.log("startTimeDT is :", startTimeDT.toObject());
// console.log("stopTimeDT is :", stopTimeDT.toObject());

const onInterval = Interval.fromDateTimes(startTimeDT, stopTimeDT)
// console.log("onInterval is: ", onInterval);
// console.log("Are we in the interval?: ",onOrOff)


    let shouldBeOff = (pretendHour = null)=> {
      let LOCALTIME = { 
        hours: (new Date()).getHours(),
        aHours: null,
        minutes: (new Date()).getMinutes(),
        aMinutes: null,
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone
      };

      if (pretendHour) {
        LOCALTIME.hours = pretendHour;
      }


      let startOffset = startTime;
      let adjustedStartTime = startTime - startOffset; // should always be 0
      let adjustedStopTime = stopTime - startTime;

      // console.log("adjustedStartTime is: ", adjustedStartTime);
      // console.log("adjustedStopTime is: ", adjustedStopTime);
      let startIt = (LOCALTIME.hours - startOffset) < adjustedStartTime ? false : true;
      let stopIt = (LOCALTIME.hours) > stopTime - startOffset ? true : false;

      let r = "Time is: "+LOCALTIME.hours+": ";

      if (startIt) { 
        r+= "startIt";
      } else {
        if (stopIt) {
          r+= "stopIt";
        } else {
          r+="StartIT I GUESS"
        }
      }

      // if (startIt) {
      //   return r+"Should be off";
      // } else if (stopIt) {
      //   return r+"Should be on";
      // } else {
      //   return r+"donno";
      // }

      return r;
    }

    // [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 0].forEach((hour => {
    //   console.log(shouldBeOff(hour));
    // }));
    console.log(shouldBeOff());