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
      let currentTimeDT = DateTime.local();
      // console.log({currentTimeDT})

      if (pretendHour) {
        // currentTimeDT.hours = pretendHour;
        // console.log("currentTimeDT before:", currentTimeDT.hour);
        currentTimeDT = currentTimeDT.set({hour: pretendHour});
        // console.log("currentTimeDT after:", currentTimeDT.hour);
      }

      const onOrOff = onInterval.contains(currentTimeDT);
      return "Should the lights be on at "+pretendHour+"?: "+onOrOff;
    }

    [1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20, 21, 23, 24, 0].forEach((hour => {
      console.log(shouldBeOff(hour));
    }));
    console.log("Right now it should be: ",shouldBeOff(25));