const delay = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
exports.delay = delay;

// NOTE:- You must pass options object as second argument it could be empty to take default values but it must be there.
// func passed to this shuold not call any other function, if it does then may or may not have some bugs.
// func passed to this must not have try-catch block.
exports.robustPolling = async (func, options = {}, ...args) => {
  const {
    maxAttempts = 30,
    delayMs = 1000,
    timeoutMs = 30000,
    retryCondition = () => true,
  } = options;
  return new Promise(async (resolve, reject) => {
    let errMSG,
      attempts = 0;
    const startTime = Date.now();
    while (attempts < maxAttempts && Date.now() - startTime < timeoutMs) {
      attempts++;
      try {
        const result = await func(...args);

        if (result && retryCondition(result)) {
          resolve(result);
          break;
        }
      } catch (err) {
        errMSG = err.message;
        console.log(`Attempt ${attempts} failed with error:`, errMSG);
      }

      await delay(delayMs);
    }
    reject(
      `Function failed after ${maxAttempts} attempts. with Error: ${errMSG}`
    );
  });
};

// ------------ Timer Function added on 22 September 2024 ------------------
exports.timerFunction = (inputFunc, waitingLing /*nameOfFunction*/) => {
  return async function (...args) {
    let seconds = 0;
    let timerMessage = `${waitingLing}... ${seconds++} Sec`;

    const intervalId = setInterval(() => {
      // Clear current line and write the timer message
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      process.stdout.write(timerMessage);
      timerMessage = `${waitingLing}... ${seconds++} Sec`;
    }, 1000);

    // Patch console.log to clear the timer message, log, then restore the timer
    const originalLog = console.log;
    console.log = (...logArgs) => {
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      originalLog(...logArgs);
      process.stdout.write(timerMessage);
    };
    let result;
    try {
      // Pass any arguments received by the wrapped function to the inputFunc
      result = await inputFunc(...args);
    } catch (error) {
      throw error;
    } finally {
      // Restore the original console.log
      console.log = originalLog;

      // Clear the interval and stop displaying the timer message
      clearInterval(intervalId);
      process.stdout.clearLine();
      process.stdout.cursorTo(0);
      //   process.stdout.write(
      //     `${nameOfFunction} is completed in ${seconds} seconds\n`
      //   );
    }

    // Return the final result
    return result;
  };
};

// ---- new Utiles developed while developing YTAutomation. ----

module.exports.timeout30Sec = { timeout: 30000 };
module.exports.timeout120Sec = { timeout: 120000 };

const randomDelay = async (minSec, maxSec) => {
  await delay(
    (Math.floor(Math.random() * (maxSec - minSec) * 10) + minSec * 10) * 100
  );
};

exports.randomDelay = randomDelay;
// --------------------------------------------------------------

// This function is most useful when you want to wait for multiple elements to appear
//  Ex. url could be either channel url or shorts url.
async function waitForFirstElement(page, selectors, timeout = 30000) {
  const elementPromises = selectors.map((selector) =>
    page
      .waitForSelector(selector, { timeout })
      .then((el) => ({ el, selector }))
      .catch(() => null)
  );

  const firstElement = await Promise.race(elementPromises);

  if (firstElement) {
    return firstElement;
  } else {
    throw new Error("None of the elements appeared within the timeout.");
  }
}
/* example Usage:
try {
   const { el, selector } = await waitForFirstElement(page, ['#selector1', '#selector2', '#selector3'], 10000);
   console.log(`First element found: ${selector}`);
   // Do something with el, which is the element handle
} catch (error) {
   console.error(error);
}
   */
