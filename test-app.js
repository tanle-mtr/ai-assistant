const puppeteer = require('puppeteer');
(async () => {
  const browser = await puppeteer.launch({headless: true});
  const page = await browser.newPage();
  await page.goto('http://localhost:8765');
  const title = await page.title();
  console.log('Page title:', title);
  const h1 = await page.('h1', el => el.textContent);
  console.log('H1 text:', h1);
  await browser.close();
})();
