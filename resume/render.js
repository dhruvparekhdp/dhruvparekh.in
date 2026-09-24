// Renders both resumes to PDF, and copies the designed one to the site root
// as the "Download CV" file. Run from the repo root:  node resume/render.js
const path = require('path');
const fs = require('fs');

const PW = process.env.PLAYWRIGHT_PATH || '/opt/node22/lib/node_modules/playwright';
const CHROME = process.env.CHROME_PATH || '/opt/pw-browsers/chromium-1194/chrome-linux/chrome';
const { chromium } = require(PW);

const dir = __dirname;
const root = path.join(dir, '..');

(async () => {
  const browser = await chromium.launch({ executablePath: CHROME, args: ['--no-sandbox'] });

  const designed = await browser.newPage({ viewport: { width: 794, height: 1123 }, deviceScaleFactor: 2 });
  await designed.goto('file://' + path.join(dir, 'resume.html'), { waitUntil: 'networkidle' });
  await designed.waitForTimeout(1500);
  await designed.screenshot({ path: path.join(dir, 'preview.png'), fullPage: true });
  await designed.pdf({
    path: path.join(dir, 'Dhruv_Parekh_Senior_FullStack_GenAI_Engineer.pdf'),
    format: 'A4', printBackground: true,
    margin: { top: '0', right: '0', bottom: '0', left: '0' },
  });

  const ats = await browser.newPage({ viewport: { width: 794, height: 1123 } });
  await ats.goto('file://' + path.join(dir, 'resume-ats.html'), { waitUntil: 'networkidle' });
  await ats.waitForTimeout(600);
  await ats.pdf({
    path: path.join(dir, 'Dhruv_Parekh_Senior_FullStack_GenAI_Engineer_ATS.pdf'),
    format: 'A4', printBackground: true,
  });

  await browser.close();

  fs.copyFileSync(
    path.join(dir, 'Dhruv_Parekh_Senior_FullStack_GenAI_Engineer.pdf'),
    path.join(root, 'Dhruv_Parekh_Resume.pdf'),
  );
  console.log('rendered both PDFs; site CV updated');
})().catch(e => { console.error(e); process.exit(1); });
