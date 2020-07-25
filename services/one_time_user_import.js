import _ from 'lodash'
import Promise from 'bluebird'
import fs from 'fs'

import { dateToStr, hashUserId } from './util.js'
import { init as initImpact, incrementMetric, incrementUnique } from '@techby/impact'

initImpact({
  apiKey: process.env.TECH_BY_API_KEY
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
    return incrementMetric('users', {}, count, { date, isTotal: true })
  }, { concurrency: INCREMENT_METRIC_CONCURRENCY })

  await Promise.map(membersArr, ({ count, date }) => {
    // TODO: dimensions on timezone?
    return incrementMetric('members', {}, count, { date, isTotal: true })
  }, { concurrency: INCREMENT_METRIC_CONCURRENCY })

  await Promise.map(stats, (stat) => {
    const hashedUserId = hashUserId(stat.user_id)
    const joinDate = new Date(stat.account_created * 1000 + 7 * 24 * 3600 * 1000)
    return incrementUnique('active-users', hashedUserId, { date: joinDate })
  }, { concurrency: INCREMENT_METRIC_CONCURRENCY })

  // FIXME: override active users count w/ one from slack (for past data).
  // otherwise a user is only active on day they sign up (for all we know)
  console.log('done')
}

handleUserStats(JSON.parse(fs.readFileSync('./sample_data/users.json')))
