async function main() {
  console.log(`------- Automation by Jitendra Nath -------`);
  console.log(` Starting.....`);
  await systemConfig();

  let flag;

  let { toListGenerator } = require("./modules/toListGenerator.module.js");
  flag = toListGenerator();
  if (!flag) {
    console.log("Failed to generate TO List.");
    console.log("--- Restart the Application Plz.....,");
    return;
  }
  toListGenerator = undefined;

  // 1. Get dataFromDMG.xlsx ready
  let { getDataFromDMG } = require("./modules/dmg.module.js");
  let dataFromDMG = await getDataFromDMG();
  getDataFromDMG = undefined;

  // 2. Open Browser & Get Page
  let { getBrowser } = require("./modules/browser.module.js");
  const pageERP = await getBrowser();
  await pageERP.setDefaultTimeout(300000);
  getBrowser = null;

  // 3. Reach to initial stage
  flag = await stageOneUIAutomation(pageERP);

  // 4. DB Builder
  let { downloadDataBase } = require("./modules/db.builder.module.js");
  let isDataBase = await downloadDataBase(dataFromDMG, pageERP);
  downloadDataBase = undefined;

  if (!isDataBase) {
    console.log("Data base isn't created, so please restart whole script.");
    return false;
  }

  // 5. Verifying Already generated slips
  let { verifyDataBase } = require("./modules/db.builder.module.js");
  await verifyDataBase(dataFromDMG);
  verifyDataBase = undefined;

  // 6. Generate Slips
  let { generateSlips } = require("./modules/generateSlips.modules.js");
  const resultFlag = await generateSlips(dataFromDMG, pageERP);
  generateSlips = undefined;

  console.log(`.....Ended.`);
}
main();

async function stageOneUIAutomation(pageERP) {
  await pageERP.bringToFront();

  await waitFor5MinuteAndClick('input[placeholder^="Digital Identity"]', pageERP);

  console.log("Please fill your credentials and captcha & Login. (Waiting Limit is 10 Minutes.)");
  await pageERP.waitForResponse(
    (response) => {
      return response.url().includes("https://sso.rajasthan.gov.in/images/ssoLogo.png");
    },
    { timeout: 600000 } // Timeout of 600,000 ms (10 minutes)
  );
  await pageERP.waitForSelector('[src="images/ssologo.png"]', {
    timeout: 600000, // Timeout (10 minutes) is fine if intended
    visible: true, // Ensures the image is visible
  });
  await delay(800);
  await waitFor5MinuteAndClick("#txtFilter+i", pageERP, `click`);

  await waitFor5MinuteAndClick("#txtFilter", pageERP);

  await pageERP.type("#txtFilter", `RAJ-ERP`, { delay: 100 });

  await waitFor5MinuteAndClick('a[title="Raj-ERP"]', pageERP, `click`);

  await waitFor5MinuteAndClick("#on_scroll", pageERP, `click`);

  await waitFor5MinuteAndClick('a[title^="Sales"]', pageERP, `click`);

  await waitFor5MinuteAndClick(".dashboard-header h4", pageERP);

  await waitFor5MinuteAndClick("#btn-navbar", pageERP, `click`);

  await waitFor5MinuteAndClick('a>[title^="Dispatch P"]', pageERP, `click`);

  await waitFor5MinuteAndClick('a>[title="Dispatch Slips"]', pageERP, `click`);

  await waitFor5MinuteAndClick("#btnGenerateDispatchSlip", pageERP);

  await pageERP.evaluate(() => {
    let ele = Array.from(document.querySelectorAll("label")).find((el) => el.textContent === "T.O.");
    ele.click();
  });

  await waitFor5MinuteAndClick("#export_table", pageERP);
  return true;
}

async function waitFor5MinuteAndClick(selector, pageERP, clickFlag) {
  let flag = await pageERP.waitForFunction(
    (selector) => !!document.querySelector(selector),
    {
      timeout: 300000,
    },
    selector
  );
  if (flag && clickFlag) {
    await pageERP.click(selector, { delay: 200 });
  }
  await pageERP.waitForNetworkIdle({ timeout: 300000 });
  await delay(1500);
}
async function delay(time) {
  return new Promise(function (resolve) {
    setTimeout(resolve, time);
  });
}
async function systemConfig() {
  // const response = await fetch("https://raw.githubusercontent.com/JitendraJSM/gitAsAPI/main/config.json");
  const response = await fetch("https://raw.githubusercontent.com/JitendraJSM/DataEntryVariables/main/config.json");
  if (!response.ok) throw new Error("Network response was not ok");
  console.log(`response:`);
  console.log(await response.json());
}
