const fs = require("fs");
const path = require("path");
const gitRepoPrefix = "https://raw.githubusercontent.com/JitendraJSM/DataEntry/main/Automation%20mini%20App";
const localPathPrefix = `${__dirname}/Automation mini App`;
const dateFilePath = path.join(__dirname, "current_date.txt");

async function isUpdateNeeded() {
  if (fs.existsSync(dateFilePath)) {
    const currentDate = fs.readFileSync(dateFilePath, "utf8");
    console.log("Current date from file:", currentDate);
    // Check if the current date is the same as the today's date
    const today = new Date().toISOString().split("T")[0];
    if (currentDate === today) {
      console.log("No update needed.");
      return false;
    } else {
      console.log("Update needed.");
      return true;
    }
  } else {
    fs.writeFileSync(dateFilePath, new Date().toISOString().split("T")[0]);
    return true;
  }
}
async function main() {
  const response = await fetch("https://raw.githubusercontent.com/JitendraJSM/DataEntryVariables/main/config.json");
  const obj = await response.json();
  console.log(obj);
  // if (!obj.testIsUpdateAvailable) {
  if (!obj.isUpdateAvailable) {
    console.log("Update not available on github.");
    return;
  }
  const isUpdateNeededVar = await isUpdateNeeded();
  if (isUpdateNeededVar) {
    console.log("calling update");
    // systemConfig();
    console.log(`Update completed.`);
    fs.writeFileSync(dateFilePath, new Date().toISOString().split("T")[0]);
    return;
  }
}
async function systemConfig() {
  // Function to download and update a file
  async function downloadAndUpdateFile(relativePath) {
    const localPath = path.join(localPathPrefix, relativePath);
    const gitPath = `${gitRepoPrefix}/${relativePath.replace(/\\/g, "/")}`;

    try {
      const updateResponse = await fetch(gitPath.replace(/ /g, "%20"));
      if (!updateResponse.ok) {
        console.log(`Failed to download ${relativePath}`);
        return;
      }
      const updatedContent = await updateResponse.text();

      // Ensure directory exists
      const dir = path.dirname(localPath);
      if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
      }

      fs.writeFileSync(localPath, updatedContent);
      console.log(`Successfully downloaded ${relativePath}`);
    } catch (error) {
      console.log(`Error updating ${relativePath}: ${error.message}`);
    }
  }

  // List of files to update
  const filesToUpdate = [
    "modules/browser.module.js",
    "modules/db.builder.module.js",
    "modules/dmg.module.js",
    "modules/generateSlips.modules.js",
    "modules/toListGenerator.module.js",
    "modules/utils.js",
    "modules/xlsx.module.js",
    "index.js",
  ];

  // Update each file
  for (const file of filesToUpdate) {
    await downloadAndUpdateFile(file);
  }

  // Fetch and log config.json
  const configResponse = await fetch("https://raw.githubusercontent.com/JitendraJSM/DataEntryVariables/main/config.json");
  if (configResponse.ok) {
    const config = await configResponse.json();
    console.log("Config:", config);
    console.log("Update available.");
  } else {
    console.log("Failed to fetch config.json");
  }
}

// systemConfig();
main();
// // Fetch config.json
// const response = await fetch("https://raw.githubusercontent.com/JitendraJSM/DataEntryVariables/main/config.json");
// const obj = await response.json();
// console.log(obj);
// console.log("Update available.");
