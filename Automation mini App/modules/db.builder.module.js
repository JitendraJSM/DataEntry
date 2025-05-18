const fs = require("fs");

// 1. Read dates from dataFromDMG & Format dates
async function getDatesFromXLSX(dataFromDMG) {
  let monthMap = {
    Jan: "01",
    Feb: "02",
    Mar: "03",
    Apr: "04",
    May: "05",
    Jun: "06",
    Jul: "07",
    Aug: "08",
    Sep: "09",
    Oct: "10",
    Nov: "11",
    Dec: "12",
  };

  // Extract and format unique dates
  const dates = new Set();
  for (const { "Generated on": date } of dataFromDMG) {
    if (date !== "Error") {
      const [day, month, year] = date.split(" ")[0].split("-");
      dates.add(`${day}-${monthMap[month]}-${year}`);
    }
  }
  monthMap = undefined;

  return [...dates];
}

// 3.1.   Fill Date & Hit apply btn for each dateInXLSX
async function applyDateQueryOnPageUI(date, page) {
  let clickDelay100ms = { delay: 100 },
    timeOut30sec = { timeout: 300000 };

  //  1.  Wait for network to be idle
  await page.waitForNetworkIdle(timeOut30sec);

  //  2.  Waiting for table to load
  await page.waitForFunction(
    () => !!document.querySelector("#export_table"),
    timeOut30sec
  );

  //  3.  Enter the date and hit apply
  await page.click("#dropdownOpen button", clickDelay100ms);
  await delay(500);
  await page.type("input#fromDate", date, clickDelay100ms);
  await delay(500);
  await page.type("input#toDate", date, clickDelay100ms);
  await delay(500);
  await page.click("button#btnApplyFillter", clickDelay100ms);
  clickDelay100ms = timeOut30sec = undefined;
}

// 3.3.   Extract Total Row (i.e. Generated Slips) Count
async function getTotalRowCountFromResponse(response) {
  const responseBody = await response.json();

  const dateOnERP = new Date(responseBody[0].InTime)
    .toLocaleDateString("en-GB")
    .replace(/\//g, "-");
  const maxTotalRowCountOnERP = Math.max(
    ...responseBody.map((item) => item.TotalRowCount)
  );

  return { dateOnERP, maxTotalRowCountOnERP };
}

// 3.5.   Update data of Local DB
async function updateDatewiseDB(date, page, currDB) {
  let timeOut30sec = { timeout: 300000 },
    pageNu = 1,
    flag = true;

  await page.evaluate(() => {
    let btn = document.querySelectorAll(".btn-first-page");
    if (btn.length === 2) {
      if (!btn[1].className.includes(`disabled`)) {
        btn.scrollIntoView();
        btn.querySelector("a").click();
      }
    }
    if (btn.length === 1) {
      if (!btn[0].className.includes(`disabled`)) {
        btn.scrollIntoView();
        btn.querySelector("a").click();
      }
    }
  });

  await page.waitForNetworkIdle(timeOut30sec);
  await delay(800);

  await applyDateQueryOnPageUI(date, page);
  let response = await page.waitForResponse((response) =>
    response.url().includes("GetStockTransferGeneratedSlip?weighbridgeId=")
  );
  const { dateOnERP, maxTotalRowCountOnERP } =
    await getTotalRowCountFromResponse(response);
  if (date !== dateOnERP) {
    console.log(`There is a bug: ${date} !== ${dateOnERP}`);
    return false;
  }

  await delay(800);
  await applyDateQueryOnPageUI(date, page);

  while (flag) {
    //  Wait for capture the specific response
    response = await page.waitForResponse((response) =>
      response.url().includes("GetStockTransferGeneratedSlip?weighbridgeId=")
    );
    response = await response.json();
    response.forEach((slip) => {
      let currObj = {
        rawanaNumber: slip.RawanaNumber,
        requestNumber: slip.RequestNumber, // TO Number
        slipNumber: slip.SlipNumber,
        vehicleNumber: slip.VehicleNumber,
        location: slip.FromStoreLocation,
        inTime: slip.InTime,
        tareWeight: slip.TareWeight,
        maxCapacity: slip.MaxCapacity,
        netWeight: (slip.MaxCapacity - slip.TareWeight).toFixed(2) * 1, // Net weight
      };
      currDB.push(currObj);
    });
    process.stdout.clearLine();
    process.stdout.cursorTo(0);
    process.stdout.write(
      `Page nu.: ${pageNu}, Total generated Slips of ${date} : ${currDB.length}`
    );
    await delay(800);
    flag = await page.evaluate(() => {
      let btn = document.querySelectorAll(".btn-next-page")[1];
      if (btn.length === 2) {
        btn = btn[1];
      }
      if (btn.length === 1) {
        btn = btn[0];
      }
      if (btn.className.includes(`disabled`)) return false;
      else {
        btn.scrollIntoView();
        btn.querySelector("a").click();
      }
      return true;
    });
    pageNu++;
  }

  if (currDB.length !== maxTotalRowCountOnERP) {
    console.log(
      `There is a bug, currDB.length: ${currDB.length} !== maxTotalRowCountOnERP: ${maxTotalRowCountOnERP}`
    );
    return false;
  }

  timeOut30sec = pageNu = flag = undefined;
  return true;
}

module.exports.downloadDataBase = async function (dataFromDMG, pageERP) {
  console.log(
    `Getting the data of already generated dispatch slips. (db.verifier.module.js)`
  );

  //  1. Read dates from dataFromXLSX & Format dates
  let xlsxDates = await getDatesFromXLSX(dataFromDMG);
  console.log(`Dates to download Database are: ${xlsxDates}.\n`);

  //  2. Loop over each date create Database.
  for (const date of xlsxDates) {
    const currDB = [];

    let flag = await updateDatewiseDB(date, pageERP, currDB);

    if (!flag) return false;

    fs.writeFileSync(`./backup/database/${date}.json`, JSON.stringify(currDB));
    console.log(
      `Total generated Slips for date: ${date} are ${currDB.length}. Download Complete.`
    );
  }

  xlsxDates = undefined;
  return true;
};
// main();
module.exports.verifyDataBase = async function (dataFromDMG) {
  let { writeExcelData } = require("./xlsx.module.js");

  console.log("Verifying Database.....");

  //    1. Read dates from dataFromXLSX & Format dates
  let xlsxDates = await getDatesFromXLSX(dataFromDMG);
  console.log(`Date/s to cross-check the Slips in Database: ${xlsxDates}`);
  let data = [],
    alreadyGenerated = [],
    ToGenerate = [];
  for (const date of xlsxDates) {
    //    2.1 Read the data from json data base file to verify
    let filePath = `./backup/database/${date}.json`;
    let currData = await JSON.parse(fs.readFileSync(filePath, "utf-8"));
    data.push(...currData);
  }
  // console.log(`Verifying Database for Date: ${date}.`);
  dataFromDMG.forEach((rawannaToGenerate) => {
    //  1.Find the matching object
    rawannaToGenerate["Slip Number"] = "";
    if (rawannaToGenerate["Generated on"] === "Error") return;

    let foundAlreadyGenerated = data.find(
      (slip) => slip.rawanaNumber === rawannaToGenerate["Ravanna No"]
    );

    rawannaToGenerate["Remarks"] = "";

    // 2.If Found then add Properties
    if (foundAlreadyGenerated) {
      console.log(
        `${rawannaToGenerate["Ravanna No"]} is Already generated. ❌`
      );
      rawannaToGenerate["Slip Number"] = foundAlreadyGenerated.slipNumber;
      rawannaToGenerate["Remarks"] = "Already Generated.";
      alreadyGenerated.push(rawannaToGenerate);
    } else {
      // console.log(
      //   `${rawannaToGenerate["Ravanna No"]} is Not Already generated.✔`
      // );
      ToGenerate.push(rawannaToGenerate);
    }
  });

  writeExcelData(dataFromDMG, "dmg");
  writeExcelData(alreadyGenerated, "alreadyGenerated");
  writeExcelData(ToGenerate, "ToGenerate");
  writeExcelData = xlsxDates = data = alreadyGenerated = ToGenerate = undefined;
};

async function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
