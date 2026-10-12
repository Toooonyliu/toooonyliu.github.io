import { chromium } from "playwright";
const browser = await chromium.launch({ headless: true, executablePath: "/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" });
try {
  const page = await browser.newPage({ viewport: { width: 1280, height: 1000 }, deviceScaleFactor: 1 });
  await page.goto("http://127.0.0.1:4173/", { waitUntil: "networkidle" });
  await page.screenshot({ path: "qa/iteration4-before-home.png" });
  await page.getByRole("button", { name: "Map", exact: true }).click();
  await page.screenshot({ path: "qa/iteration4-before-map.png" });
  console.log("Captured the existing default Home and Map in an isolated browser session.");
} finally { await browser.close(); }
