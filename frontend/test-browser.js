/* eslint-disable @typescript-eslint/no-require-imports */
const puppeteer = require('puppeteer');

(async () => {
  console.log('🚀 Launching headless browser to test frontend...');
  try {
    const browser = await puppeteer.launch({ headless: 'new', args: ['--no-sandbox'] });
    const page = await browser.newPage();
    
    // Capture console errors
    page.on('console', msg => {
      if (msg.type() === 'error') {
        console.error(`[BROWSER ERROR] ${msg.text()}`);
      }
    });

    page.on('pageerror', error => {
      console.error(`[PAGE ERROR] ${error.message}`);
    });

    console.log('🔗 Navigating to http://localhost:3002/ ...');
    const response = await page.goto('http://localhost:3002/', { waitUntil: 'networkidle2' });
    
    console.log(`✅ Page responded with status: ${response.status()}`);
    
    // Wait for redirect to finish or page to load
    await new Promise(r => setTimeout(r, 2000));
    
    const finalUrl = page.url();
    console.log(`📍 Final URL after load: ${finalUrl}`);

    const title = await page.title();
    console.log(`🏷️ Page Title: ${title}`);

    // If we are on landing, let's try to find the CTA
    if (finalUrl.includes('landing')) {
      const ctaText = await page.evaluate(() => {
        const btn = document.querySelector('button');
        return btn ? btn.innerText : 'No button found';
      });
      console.log(`✅ Landing Page CTA found: ${ctaText}`);
    } else if (finalUrl.includes('login')) {
      const formExists = await page.evaluate(() => !!document.querySelector('form'));
      console.log(`✅ Login Form exists: ${formExists}`);
    }

    await browser.close();
    console.log('🏁 Test completed successfully.');
  } catch (err) {
    console.error('❌ Test failed:', err);
  }
})();
