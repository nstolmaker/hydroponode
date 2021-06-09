
export const promiseWithTimeout = (timeoutMs, promise, failureMessage) => {
  let timeoutHandle;
  const timeoutPromise = new Promise((resolve, reject) => {
    timeoutHandle = setTimeout(() => {
      reject(failureMessage);
    }, timeoutMs);
  });

  return Promise.race([ 
    promise(), 
    timeoutPromise, 
  ]).then((result) => {
    clearTimeout(timeoutHandle);
    return result;
  }); 
}

export const sendNotification = (message) => {
  console.warn("🚨 "+message);
}
