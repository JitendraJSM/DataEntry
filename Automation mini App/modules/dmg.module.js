const fs = require("fs");
const { readExcelData, writeExcelData } = require("./xlsx.module.js");

const fetchAndWrite = async (rawannaNo) => {
  try {
    const fetch = (await import("node-fetch")).default;

    const response = await fetch(
      `https://mines.rajasthan.gov.in/DMG2/Public/eRawannaStatus/${rawannaNo}`,
      {
        headers: {
          accept:
            "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,image/apng,*/*;q=0.8,application/signed-exchange;v=b3;q=0.7",
          "accept-language": "en-US,en;q=0.9",
          "cache-control": "max-age=0",
          "sec-ch-ua":
            '"Not/A)Brand";v="8", "Chromium";v="126", "Google Chrome";v="126"',
          "sec-ch-ua-mobile": "?0",
          "sec-ch-ua-platform": '"Windows"',
          "sec-fetch-dest": "document",
          "sec-fetch-mode": "navigate",
          "sec-fetch-site": "same-origin",
          "sec-fetch-user": "?1",
          "upgrade-insecure-requests": "1",
        },
        method: "GET",
      }
    );

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    // Create a promise that resolves when the write stream finishes
    const writeFilePromise = new Promise((resolve, reject) => {
      const writer = fs.createWriteStream(`./_tempFiles/${rawannaNo}.txt`);
      response.body.pipe(writer);

      writer.on("finish", () => {
        // console.log("Data written to file successfully.");
        resolve();
      });

      writer.on("error", (err) => {
        console.error("Error writing to file", err);
        reject(err);
      });
    });

    // Await the write file promise to ensure writing is completed
    await writeFilePromise;

    // console.log(`fetchData ENDED`);
  } catch (error) {
    console.log(`Error in fetchData: ${error.message}`);
    console.log(error);
    console.log(`===========================================`);
  }
};

const extractDataFromTextFile = async (rawannaNo) => {
  // Path to your text file
  const filePath = `./_tempFiles/${rawannaNo}.txt`;

  let data = fs.readFileSync(filePath, "utf8");

  // Function to extract text between <strong> and </strong> after a keyword
  const extractTextAfterKeyword = (keyword, data) =>
    data
      .match(new RegExp(`${keyword}.*?<strong>(.*?)<\\/strong>`, "is"))?.[1]
      .replace(/[\r\n\t]+/g, "")
      .replace(/&nbsp;/g, "")
      .trim() || null;

  // Extract text after "eRawanna No."
  let eRawannaNo = extractTextAfterKeyword("eRawanna No.", data).split(" ")[0];

  // Extract text after "Generated on"
  let time = extractTextAfterKeyword("Generated on", data);

  // Delete the file after extracting the lines
  await fs.promises.rm(filePath, { force: true });

  return { eRawannaNo, time };
};

// module.exports.generateInTime = async () => {
module.exports.getDataFromDMG = async () => {
  // console.time("Script Execution Time");\
  let dataFromDMG;
  try {
    //   ==== Variables ====
    let flag,
      xlsxData = await readExcelData();

    console.log(`------------ DMG Time Generation STARTED ------------`);

    // Step 1. Check the existing dataFromDMG.xlsx file
    flag = fs.existsSync(`./data/dmg.xlsx`);
    if (flag) {
      dataFromDMG = await readExcelData("dmg");
      console.log(`Checking the existing dataFromDMG.xlsx file`);
      flag =
        xlsxData.length === dataFromDMG.length &&
        dataFromDMG.every(
          (slip, i) =>
            slip["Ravanna No"] === xlsxData[i]["Ravanna No"] &&
            slip["Vehicle No"] === xlsxData[i]["Vehicle No"] &&
            slip["Net Weight"] === xlsxData[i]["Net Weight"] &&
            slip["TO No"] === xlsxData[i]["TO No"] &&
            slip["Size"] === xlsxData[i]["Size"] &&
            slip["Generated on"] &&
            /AM|PM|Error/.test(slip["Generated on"])
        );
    }
    if (flag) return dataFromDMG;

    // Step 2. Loop over each row in the xlsx file
    for (const row of xlsxData) {
      try {
        // Step 2.1 Fetch data & Write Files
        await fetchAndWrite(row["Ravanna No"]);

        // Step 2.2 Read from text file and extract eRawannNo & time
        const data = await extractDataFromTextFile(row["Ravanna No"]);

        // Step 2.3 Check and Write log to Log File
        if (row["Ravanna No"] === data.eRawannaNo) {
          row["Generated on"] = data.time;
        }
        console.log(
          `Rawana no. ${row["Ravanna No"]} of ${row["Vehicle No"]} generated on ${row["Generated on"]}.\n`
        );
      } catch (error) {
        row["Generated on"] = `Error`;
        row["Remarks"] = `Error in getting time form DMG.`;

        console.log(`----------------------- Error -----------------------`);
        console.log(`Error for ${row["Ravanna No"]} is: ${error?.message}`);
        console.log(`----------------------- Error -----------------------`);
      }
    }

    //   Step 3. Write whole data to xlsx file
    writeExcelData(xlsxData, "dmg");
    console.log(`----------------------- ENDED -----------------------`);
    dataFromDMG = await readExcelData("dmg");
    flag = undefined;
    return dataFromDMG;
  } catch (error) {
    console.log(`Error MSG: ${error.message}`);
    console.log(`Error: ${error}`);
  }
  // console.timeEnd("Script Execution Time");
};
