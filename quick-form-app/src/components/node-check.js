const puppeteer = require('puppeteer');

(async () => {
  const browser = await puppeteer.launch({ headless: true });
  const page = await browser.newPage();

  for (let i = 0; i < 1000; i++) {
    console.log(`Iteration: ${i + 1}`);

    await page.goto('https://d2bri1qui9cr5s.cloudfront.net/captcha', { waitUntil: 'networkidle2' });

    await page.type('input[name="name"]', 'Test User', { delay: 0 });
    await page.type('textarea[name="comment"]', 'This is a test comment', { delay: 0 });

    await page.click('input[value="math"]');
    await delay(1000);
    await page.click('button[type="submit"]');

    // Wait for any confirmation or just a delay before next iteration
  }

  await browser.close();
})();

function delay(time) {
  return new Promise((resolve) => setTimeout(resolve, time));
}
