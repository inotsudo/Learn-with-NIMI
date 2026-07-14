const { chromium } = require("playwright");

const ANNIE_ID = "991fb500-fd40-4ec3-9a84-3c6222ca6195";
const EMAIL    = "kmartinkrypton@gmail.com";
const PASS     = "KMK96KMKkp";
const OUT      = "/tmp/claude-1000/-home-martin-Documents-Learn-with-NIMI/96017c0d-eb81-489b-9604-7e8b56982cfa/scratchpad";

(async () => {
  const browser = await chromium.launch({ args: ["--no-sandbox"] });
  const ctx = await browser.newContext({ viewport: { width: 1280, height: 900 } });
  const page = await ctx.newPage();

  await page.goto("http://localhost:3000/login");
  await page.waitForTimeout(1500);
  await page.fill('input[type="email"]', EMAIL);
  await page.fill('input[type="password"]', PASS);
  await page.click('button[type="submit"]');
  await page.waitForTimeout(3000);

  await page.evaluate((id) => {
    localStorage.setItem("nimipiko_active_child", id);
  }, ANNIE_ID);

  await page.goto("http://localhost:3000/community");
  await page.waitForTimeout(4000);

  await page.screenshot({ path: OUT + "/community_top.png", fullPage: false });
  await page.evaluate(() => window.scrollBy(0, 600));
  await page.waitForTimeout(600);
  await page.screenshot({ path: OUT + "/community_cards.png", fullPage: false });

  await browser.close();
  console.log("done");
})();
