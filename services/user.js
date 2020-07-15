import _ from 'lodash'

let userCache = {}

export async function populateUsersCache (app) {
  const { members } = await app.client.users.list({
    // The token you used to initialize your app
    token: process.env.SLACK_BOT_TOKEN
  })
  const usersWithReqInfo = _.map(members, (user) => ({
    id: user.id,
    isGuest: user.is_restricted || user.is_ultra_restricted,
    isBot: user.is_bot
  }))
  userCache = _.keyBy(usersWithReqInfo, 'id')
  return userCache
}

export function getCachedUser (id) {
  return userCache[id]
}

export function updateCachedUser (id, diff) {
  userCache[id] = _.defaults(diff, userCache[id])
  return userCache[id]
}
