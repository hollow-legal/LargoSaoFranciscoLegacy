const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({
    headless: 'new',
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });

  const page = await browser.newPage();
  await page.setViewport({ width: 1920, height: 1080 });

  // Position camera to show the staircases in the vestibulo
  const url = 'http://localhost:8000/?auto&hora=0.25&x=0&z=-18&yaw=0&pitch=-0.4';

  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 10000 });

  // Wait for WebGL rendering
  await new Promise(resolve => setTimeout(resolve, 3000));

  await page.screenshot({ path: '/home/user/LargoSaoFranciscoLegacy/escada.png' });

  console.log('Screenshot saved to escada.png');
  await browser.close();
  process.exit(0);
})();
