import puppeteer from 'puppeteer'
import fs from 'fs'
import pendingxhr from 'pending-xhr-puppeteer'
import Promise from 'bluebird'
import { Impact } from '@techby/impact'

const { PendingXHR } = pendingxhr

const impact = new Impact({
  apiKey: process.env.IMPACT_API_KEY
})

const EMAIL_SELECTOR = '#email'
const PASSWORD_SELECTOR = '#password'
const LOGIN_BUTTON_SELECTOR = '#signin_btn'
const DATE_PICKER_SELECTOR = '.ent_date_picker_btn'
const ALL_TIME_SELECTOR = 'li[data-qa="context_menu_item_1"]'
const TIME_SERIES_URL_PART = '/api/team.stats.timeSeries'
const INITIAL_RENDER_DELAY_MS = 2000
const BULK_DATES_CONCURRENCY = 2

// FIXME: node cron to run this every day
// FIXME: some sort of detection and retry if this fails
// (ie if the page hasn't fully loaded before chekcing if DATE_PICKER_SELECTOR exists)
export async function scrape ({ isAllTime } = {}) {
  console.log('all time', isAllTime)
  const browser = await puppeteer.launch()
  const page = await browser.newPage()
  const pendingXHR = new PendingXHR(page)

  await loadCookies(page)

  let waitForResponse
  if (!isAllTime) {
    waitForResponse = waitForTimelineStats(page)
  }

  await page.goto('https://hackclub.slack.com/stats#overview', { waitUntil: 'networkidle2' })

  const isLoggedOut = await page.$(LOGIN_BUTTON_SELECTOR)

  if (isLoggedOut) {
    console.log('logged out')
    await login(page)
    if (!isAllTime) {
      waitForResponse = waitForTimelineStats(page)
    }
  }

  if (isAllTime) {
    await setToAllTime(page, pendingXHR)
  } else {
    await waitForResponse
  }

  await saveCookies(page)
  await browser.close()
}

async function waitForTimelineStats (page, { isAllTime } = {}) {
  const response = await page.waitForResponse((response) =>
    response.url().indexOf(TIME_SERIES_URL_PART) !== -1
  )
  return handleTimelineStats(await response.json(), { isAllTime })
}

async function handleTimelineStats ({ stats }, { isAllTime }) {
  // console.log('stats', stats)
  if (!isAllTime) {
    stats = stats.slice(-1) // only last day
  }
  const res = await Promise.map(stats, (stat) => {
    const date = new Date(stat.ds)
    // TODO: guests_count, full_members_count, chats_dms_count_1d, chats_groups_count_1d
    return Promise.all([
      impact.incrementMetric(
        'messages', { type: 'dm' }, stat.chats_dms_count_1d, { date, isTotal: true }
      ),
      impact.incrementMetric(
        'messages', { type: 'group' }, stat.chats_groups_count_1d, { date, isTotal: true }
      ),
      impact.incrementMetric(
        'messages', { type: 'public' }, stat.chats_channels_count_1d, { date, isTotal: true }
      )
      // don't call this. this was just run 1 time to get data before the other method of active-users was implemented
      // impact.incrementMetric(
      //   'active-users', {}, stat.readers_count_1d, { date, isTotal: true, isSingleTimeScale: true, timeScale: 'day' }
      // )
    ]).catch((err) => { console.log(err) })
  }, { concurrency: BULK_DATES_CONCURRENCY })
  console.log('res', res)
  return true
}

async function loadCookies (page) {
  let cookiesStr
  try {
    cookiesStr = await fs.promises.readFile('./cookies.json')
  } catch { }

  if (cookiesStr) {
    const cookies = JSON.parse(cookiesStr)
    await page.setCookie(...cookies)
  }
}

async function saveCookies (page) {
  const cookies = await page.cookies()
  await fs.promises.writeFile('./cookies.json', JSON.stringify(cookies, null, 2))
}

async function login (page) {
  await page.click(EMAIL_SELECTOR)
  await page.keyboard.type(process.env.SLACK_EMAIL)
  await page.click(PASSWORD_SELECTOR)
  await page.keyboard.type(process.env.SLACK_PASSWORD)

  await page.click(LOGIN_BUTTON_SELECTOR)
  await page.waitForNavigation()
}

async function setToAllTime (page, pendingXHR) {
  // let slack do initial rendering & load up xhr reqs
  await new Promise((resolve) => setTimeout(resolve, INITIAL_RENDER_DELAY_MS))
  await pendingXHR.waitForAllXhrFinished()

  await page.click(DATE_PICKER_SELECTOR)
  await page.click(ALL_TIME_SELECTOR)
  return waitForTimelineStats(page, { isAllTime: true })
}
