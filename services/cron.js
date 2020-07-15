import cron from 'cron'

import { scrape } from './scrape.js'

const { CronJob } = cron

const dailyCron = new CronJob({
  // every day at 5:10am PT (+30 sec)
  // randomish time in case server has other crons it processes at top of hour
  cronTime: '30 10 5 * * *',
  onTick: scrape,
  start: false,
  timeZone: 'America/Los_Angeles'
})

export function startCrons () {
  console.log('Crons started')
  dailyCron.start()
}
