import axios from 'axios'
import Promise from 'bluebird'
import { init as initImpact, incrementMetric } from '@techby/impact'

import { dateToStr } from './util.js'

initImpact({
  apiKey: process.env.TECH_BY_API_KEY
})

const BANK_API_URL = 'https://bank-hackclu-historical-h0rdbc.herokuapp.com/stats'
const METRICS = [
  {
    bankKey: 'transactions_volume',
    metricSlug: 'bank-transactions-volume'
  },
  {
    bankKey: 'transactions_count',
    metricSlug: 'bank-transactions'
  },
  {
    bankKey: 'raised',
    metricSlug: 'bank-raised'
  }
]

export async function updateBankStats (date = new Date()) {
  const todayDateStr = dateToStr(date)
  console.log(todayDateStr)
  const { data: todayData } = await axios.get(
    BANK_API_URL, { params: { date: todayDateStr } }
  )
  const yesterday = new Date(date)
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayDateStr = dateToStr(yesterday)
  const { data: yesterdayData } = await axios.get(
    BANK_API_URL, { params: { date: yesterdayDateStr } }
  )

  // console.log(todayData, yesterdayData)

  Promise.map(METRICS, ({ bankKey, metricSlug }) => {
    const totalForDay = todayData[bankKey] - yesterdayData[bankKey]
    console.log(metricSlug, totalForDay)
    incrementMetric(metricSlug, {}, totalForDay, { date: yesterday, isTotal: true })
  })
}

// const allDates = getDateRange(new Date('2018-05-31'), new Date('2020-07-14'))
// Promise.map(allDates, updateBankStats, { concurrency: 1 })

// updateBankStats()
