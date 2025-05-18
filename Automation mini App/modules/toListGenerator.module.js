async function toListGenerator() {
  const fs = require("fs");
  console.log("Generating TO List.");
  const { readExcelData, writeExcelData } = require("./xlsx.module.js");

  let tolistData = await readExcelData("tolist");
  let filePath = fs.existsSync(`./data/dmg.xlsx`) ? "dmg" : "";
  let data = await readExcelData(filePath);

  for (const row of data) {
    let toRow = tolistData.find(
      (toRow) =>
        row["Plant"] === toRow["Plant Name"] && row["Size"] === toRow["Size"]
    );
    row["TO No"] = `ST/JSLM/FY${toRow["TO Number"]}`;
  }
  writeExcelData(data, filePath);
  console.log("TO List Generation Complete.");

  return true;
}
// toListGenerator();
module.exports = { toListGenerator };
