const utlis = require("./utils.js");

// ---- Part-1 Imports ----
const { promisify } = require("util");
const { exec, spawn } = require("child_process");
const promisifiedExec = promisify(exec);

// ---- Part-2 Imports ----
const puppeteer = require("puppeteer");

// ---- Variables ----
// const port = process.env.CHROME_DEBUG_PORT;
const port = 9222;
// const chatURL = process.env.CHAT_URL;
const chatURL = "https://sso.rajasthan.gov.in/signin";

// ============ Main GetBrowser Function ============
exports.getBrowser = async () => {
  const wsUrl = await getDebuggerUrl();

  const pageERP = await utlis.robustPolling(
    pptrConnect,
    // { timeoutMs: 120000 },
    {},
    wsUrl
  );
  return pageERP;
};

// ---- Part 1 Open & Get Debugger Url ----
// 1.1 Get webSocketDebuggerUrl
async function getDebuggerUrl() {
  try {
    let data;
    try {
      data = await getUrl();
    } catch (err) {
      null;
    }
    if (data) return JSON.parse(data).webSocketDebuggerUrl;

    await openChromeInstance();

    // Polling the function: Get webSocketDebuggerUrl
    let port = 9222;
    data = JSON.parse(await utlis.robustPolling(getUrl, {}, port)).webSocketDebuggerUrl;
    return data;
  } catch (error) {
    console.log(`Error in getDebuggerUrl function : `, error.message);
    console.log(error);
  }
}

// 1.2 Get webSocketDebuggerUrl
async function getUrl() {
  const urlCommand = `curl http://127.0.0.1:${port}/json/version`;
  const { stdout } = await promisifiedExec(urlCommand);
  return stdout;
}

// 1.3 Open Chrome Instance
async function openChromeInstance() {
  console.log(`In openChromeInstance, Profile to be opened has target: 1 `);

  let openCommand = `"C:/Program Files/Google/Chrome/Application/chrome.exe"  --profile-directory="Profile 1" --remote-debugging-port=9222 --window-size=697,735`;
  // let openCommand = `"C:/Program Files/Google/Chrome/Application/chrome.exe" --user-data-dir="C:/Automation-App-by-JN-Data"  --profile-directory="Profile 1" --remote-debugging-port=9222 --window-size=697,735`;
  let chromeProcess = spawn(openCommand, [], {
    shell: true,
    detached: true,
    stdio: "ignore",
  });

  await utlis.delay(3000);

  // Close the child process if it still running
  if (chromeProcess && !chromeProcess.killed) {
    chromeProcess.kill("SIGKILL"); // Terminate the Chrome process
  }
  openCommand = chromeProcess = undefined;
}

// ---- Part 2 Connect Chorme instance to  PPTR ----
async function pptrConnect(wsUrl) {
  // try {
  let browser = await puppeteer.connect({
    browserWSEndpoint: wsUrl,
    defaultViewport: false,
  });

  let pages = await browser.pages();
  let pageERP = pages.find((p) => p.url().includes(chatURL) || p.url() === "about:blank" || p.url() === "chrome://new-tab-page/");
  if (!pageERP) {
    console.log("No blank page found");
    pageERP = await browser.newPage();
  }

  if (!pageERP.url().includes(chatURL))
    await pageERP.goto(chatURL, {
      waitUntil: ["load", "domcontentloaded", "networkidle0"],
      timeout: 60000,
    });

  console.log("Puppeteer Connected.");
  browser = pages = undefined;

  return pageERP;
}
