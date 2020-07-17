import bolt from '@slack/bolt'
import slackRtm from '@slack/rtm-api'
import { init as initImpact, incrementMetric, incrementUnique } from '@techby/impact'

import { startCrons } from './services/cron.js'
import { populateUsersCache, getCachedUser, upsertCachedUser } from './services/user.js'
import { hashUserId } from './services/util.js'

initImpact({
  apiKey: process.env.IMPACT_API_KEY
})

// Using RTMClient instead of bolt because bolt (events API) doesn't support presence changes
const { RTMClient } = slackRtm
const rtm = new RTMClient(process.env.SLACK_BOT_TOKEN)

const { App } = bolt
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

(async () => {
  // cached users so we can tell if they're being promoted in user_change event
  // (slack doesn't send the before/after, just the after)
  // also for looping through all users to check for active/away presence
  await populateUsersCache(app)

  await app.start(process.env.PORT || 3000)

  // batch_presence_aware doesn't seem to actually work...
  await rtm.start({ batch_presence_aware: true })

  startCrons(rtm)

  console.log('⚡️ Bolt app is running!')

  // normally you'd call rtm.subscribePresence(userIds) and it'll have an event any time
  // a user's presence changes. this seems to be capped at ~1,000 users though...
  // so we have a cron that queries 500 (max for query) user ids every minute
  // to check for online users
  rtm.on('presence_change', ({ presence, user }) => {
    const cachedUser = getCachedUser(user)
    const hasPresenceChanged = cachedUser.presence !== presence
    upsertCachedUser(user, { presence })
    if (hasPresenceChanged && presence === 'active' && !cachedUser?.isBot) {
      console.log('presence_change', user)
      const hashedUserId = hashUserId(user)
      incrementUnique('active-users', hashedUserId)
    }
  })

  rtm.on('team_join', async ({ user }) => {
    console.log('team_join', user)
    const hashedUserId = hashUserId(user.id)

    const isGuest = user.is_restricted || user.is_ultra_restricted
    const isBot = user.is_bot
    upsertCachedUser(user.id, { isGuest, isBot })

    if (!isBot) {
      incrementMetric('users')
      incrementUnique('active-users', hashedUserId)
    }
  })

  rtm.on('user_change', async ({ user }) => {
    console.log('user_change', user)
    const isGuest = user.is_restricted || user.is_ultra_restricted
    const isBot = user.is_bot
    const hashedUserId = hashUserId(user.id)
    const cachedUser = getCachedUser(user.id)
    const wasGuest = cachedUser?.isGuest

    if (wasGuest && !isGuest && !isBot) {
      upsertCachedUser(user.id, { isGuest: false })
      incrementMetric('members', {
        // derived dimension that resolves to # of days since hashedUserId was first recorded
        'days-until-promoted': { hash: hashedUserId }
      })
    }

    incrementUnique('active-users', hashedUserId)
  })

  // app.event('message', async ({ event }) => {
  //   const { user, channel } = event
  //   const hashedUserId = hashUserId(user)
  //   incrementMetric('messages', {
  //     'channel-name': channel, // TODO: get channel name, not id
  //     // derived dimension that resolves to true if user account is < 1 mo old and false if account > 1 mo
  //     'is-new-user': { hash: hashedUserId }
  //   })
  // })
})()
