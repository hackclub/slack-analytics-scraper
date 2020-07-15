import _ from 'lodash'
import Promise from 'bluebird'
import fs from 'fs'

import { hashUserId } from './util.js'
import { Impact } from '@techby/impact'

const impact = new Impact({
  apiKey: process.env.IMPACT_API_KEY
})

const INCREMENT_METRIC_CONCURRENCY = 10

// if this was something that needed to be run more than once, it'd be setup
// w/ puppeteer scraping the site. puppeteer would need to listen for
// `team.stats.listUsers` request, then modify it to be some large limit instead of 100
// (or several paginated requests)

// for running just once, do all of that manually in chrome (ie you can copy the curl req
// and rerun locally with a high limit instead of 100). then save as users.json

// this increases counts for users and members metrics, and prepopulates active user metrics.
// active users are sent a hash of the slack user id to track uniqueness for
// dau, wau, mau, retention, etc...

// idempotent. you shouldn't need to run again but you can
async function handleUserStats ({ stats }) {
  const { usersByDate, membersByDate } = _.reduce(stats, (obj, stat) => {
    const isGuest = stat.is_restricted || stat.is_ultra_restricted
    const joinDateStr = dateToStr(new Date(stat.account_created * 1000))
    obj.usersByDate[joinDateStr] = obj.usersByDate[joinDateStr] || 0
    obj.usersByDate[joinDateStr] += 1
    if (!isGuest) {
      obj.membersByDate[joinDateStr] = obj.membersByDate[joinDateStr] || 0
      obj.membersByDate[joinDateStr] += 1
    }
    return obj
  }, { usersByDate: {}, membersByDate: {} })

  const usersArr = _.map(usersByDate, (count, date) => ({ count, date: new Date(date) }))
  const membersArr = _.map(membersByDate, (count, date) => ({ count, date: new Date(date) }))

  // users = users + members
  await Promise.map(usersArr, ({ count, date }) => {
    // TODO: dimensions on timezone?
    impact.incrementMetric('users', {}, count, { date, setTotal: true })
  }, { concurrency: INCREMENT_METRIC_CONCURRENCY })

  await Promise.map(membersArr, ({ count, date }) => {
    // TODO: dimensions on timezone?
    impact.incrementMetric('members', {}, count, { date, setTotal: true })
  }, { concurrency: INCREMENT_METRIC_CONCURRENCY })

  await Promise.map(stats, (stat) => {
    const hashedUserId = hashUserId(stat.user_id)
    const joinDate = new Date(stat.account_created * 1000 + 7 * 24 * 3600 * 1000)
    return impact.incrementUnique('active-users', hashedUserId, { date: joinDate })
  }, { concurrency: INCREMENT_METRIC_CONCURRENCY })

  // FIXME: override active users count w/ one from slack (for past data).
  // otherwise a user is only active on day they sign up (for all we know)
  console.log('done')
}

function dateToStr (date) {
  const yyyy = date.getFullYear()
  let mm = date.getMonth() + 1
  if (mm < 10) {
    mm = `0${mm}`
  }
  let dd = date.getDate()
  if (dd < 10) {
    dd = `0${dd}`
  }
  return `${yyyy}-${mm}-${dd}`
}

handleUserStats(JSON.parse(fs.readFileSync('./sample_data/users.json')))
