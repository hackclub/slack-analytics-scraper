import _ from 'lodash'
import cron from 'cron'

import { scrape } from './scrape.js'
import { getCachedUsers } from './user.js'

const { CronJob } = cron

const MAX_PRESENCE_USER_IDS = 500

let currentPresenceOffset = 0

export function startCrons (rtm) {
  const dailyCron = new CronJob({
    // every day at 5:10am PT (+30 sec)
    // randomish time in case server has other crons it processes at top of hour
    cronTime: '30 10 5 * * *',
    onTick: scrape,
    start: false,
    timeZone: 'America/Los_Angeles'
  })

  // check presence of 500 different users every 10 seconds to watch for changes
  const userPresenceCron = new CronJob({
    cronTime: '*/10 * * * * *', // every 10 seconds
    onTick: () => {
      const users = getCachedUsers()
      const allUserIds = _.map(users, 'id')
      console.log('checking presences:', 'offset', currentPresenceOffset, 'limit', MAX_PRESENCE_USER_IDS)
      const userIds = _.take(_.drop(allUserIds, currentPresenceOffset), MAX_PRESENCE_USER_IDS)
      if (_.isEmpty(userIds)) {
        currentPresenceOffset = 0
      } else {
        currentPresenceOffset += MAX_PRESENCE_USER_IDS
      }
      rtm.addOutgoingEvent(false, 'presence_query', { ids: userIds })
    },
    start: false,
    timeZone: 'America/Los_Angeles'
  })

  dailyCron.start()
  userPresenceCron.start()
  console.log('Crons started')
}
