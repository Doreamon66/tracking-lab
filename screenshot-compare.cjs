const { chromium } = require('playwright')
const path = require('path')

const BASE = 'http://localhost:5173'
const OUT = path.join(__dirname, 'screenshots', '05-compare-mode.png')

async function sleep(ms) {
  return new Promise(r => setTimeout(r, ms))
}

async function safeClick(page, selector, timeout = 3000) {
  try {
    const el = await page.waitForSelector(selector, { state: 'visible', timeout })
    if (el) { await el.click(); return true }
  } catch { /* ignore */ }
  return false
}

async function main() {
  const browser = await chromium.launch({ headless: true })
  const context = await browser.newContext({
    viewport: { width: 1440, height: 900 },
    deviceScaleFactor: 2,
  })
  const page = await context.newPage()

  await page.goto(BASE, { waitUntil: 'domcontentloaded', timeout: 15000 })
  await sleep(3000)

  // Enter workbench - click the menu directly
  console.log('Entering workbench...')
  await safeClick(page, '.el-menu-item:has-text("埋点工作台")')
  await sleep(1500)

  // Go to Skill version management tab
  console.log('Going to Skill 版本管理...')
  await safeClick(page, '.el-tabs__item:has-text("Skill 版本管理")', 3000)
  await sleep(2000)

  // Enable compare mode via the switch
  console.log('Enabling compare mode...')
  await safeClick(page, '.el-switch', 3000)
  await sleep(1000)

  // Select versions using correct class name: .spec-ver-item
  const vItems = await page.$$('.spec-ver-item')
  console.log(`Found ${vItems.length} spec-ver-items`)
  if (vItems.length >= 2) {
    await vItems[0].click()
    await sleep(600)
    await vItems[1].click()
    await sleep(1500)
  }

  // Click "规范内容对比" tab if visible
  await safeClick(page, '.el-tabs__item:has-text("规范内容对比")', 2000)
  await sleep(1000)

  console.log('Taking screenshot...')
  await page.screenshot({ path: OUT, fullPage: false })
  console.log('Done!')

  await browser.close()
}

main().catch(e => {
  console.error('Error:', e)
  process.exit(1)
})
