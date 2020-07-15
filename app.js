import bolt from '@slack/bolt'
import { Impact } from '@techby/impact'

import { startCrons } from './services/cron.js'
import { populateUsersCache, getCachedUser, updateCachedUser } from './services/user.js'
import { hashUserId } from './services/util.js'

const impact = new Impact({
  apiKey: process.env.IMPACT_API_KEY
})

const { App } = bolt
const app = new App({
  token: process.env.SLACK_BOT_TOKEN,
  signingSecret: process.env.SLACK_SIGNING_SECRET
});

(async () => {
  // cached users so we can tell if they're being promoted in user_change event
  // (slack doesn't send the before/after, just the after)
  await populateUsersCache(app)

  startCrons()

  await app.start(process.env.PORT || 3000)

  console.log('⚡️ Bolt app is running!')

  app.event('team_join', async ({ event, context }) => {
    const { user } = event
    const hashedUserId = hashUserId(user.id)

    impact.incrementMetric('users')
    impact.incrementUnique('active-users', hashedUserId)
  })

  app.event('user_change', async ({ event }) => {
    const { user } = event
    const isGuest = user.is_restricted || user.is_ultra_restricted
    const isBot = user.is_bot
    const hashedUserId = hashUserId(user.id)
    const cachedUser = getCachedUser(user.id)
    const wasGuest = cachedUser.isGuest

    if (wasGuest && !isGuest && !isBot) {
      updateCachedUser(user.id, { isGuest: false })
      impact.incrementMetric('members', {
        // derived dimension that resolves to # of days since hashedUserId was first recorded
        'days-until-promoted': { hash: hashedUserId }
      })
    }

    impact.incrementUnique('active-users', hashedUserId)
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
