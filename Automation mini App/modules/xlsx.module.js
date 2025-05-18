module.exports.readExcelData = async function (nameOfFile) {
  filePath = `./data/${nameOfFile || "data"}.xlsx`;
  try {
    const XLSX = require("xlsx");

    // Read the XLSX file
    const workbook = XLSX.readFile(filePath);

    // Convert the first sheet to JSON
    const sheetName = workbook.SheetNames[0];
    const sheet = workbook.Sheets[sheetName];
    const rawannaData = XLSX.utils.sheet_to_json(sheet);

    return rawannaData;
  } catch (error) {
    console.log(`Error is in readExcelData function ====>`);
    console.log(`\tCheck Excel File at path: "${filePath}.`);
    console.log(error.message);
  }
};

module.exports.writeExcelData = function (data, nameOfFile) {
  try {
    filePath = `./data/${nameOfFile || "data"}.xlsx`;

    const XLSX = require("xlsx");
    const workbook = XLSX.utils.book_new();
    const worksheet = XLSX.utils.json_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, "Sheet1");
    XLSX.writeFile(workbook, filePath);
  } catch (error) {
    console.log(`Error writing excel file: "./data/${nameOfFile}.xlsx"`);
    console.log(error);
  }
};
