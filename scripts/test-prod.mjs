import { chromium } from 'playwright';

async function test() {
  const browser = await chromium.launch({ headless: true });
  const page = await browser.newPage();
  const consoleLogs = [];
  page.on('console', msg => consoleLogs.push(msg.type() + ': ' + msg.text()));
  page.on('pageerror', err => consoleLogs.push('PAGEERROR: ' + err.message));
  try {
    await page.goto('http://localhost:3000', { waitUntil: 'networkidle', timeout: 30000 });
    const rootHtml = await page.locator('#root').innerHTML();
    console.log('Root HTML length:', rootHtml.length);
    const queueBtn = await page.locator('#tab-queue-btn').textContent();
    console.log('Queue button text:', queueBtn.trim());
    console.log('Console logs:', consoleLogs);
    await page.screenshot({ path: 'localhost_screenshot.png' });
    console.log('Screenshot saved to localhost_screenshot.png');
  } catch (err) {
    console.error('Localhost error:', err.message);
    console.log('Console logs so far:', consoleLogs);
  } finally {
    await browser.close();
  }
}

test();
