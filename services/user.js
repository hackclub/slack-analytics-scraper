import _ from 'lodash'

const GET_USERS_LIMIT = 1000
const MAX_GET_USERS_DEPTH = 100 // max 100 reqs (100k users)

let userCache = {}

export async function populateUsersCache (app) {
  console.log('populating user cache')
  const users = await getUsers(app)
  console.log('members', users.length)
  const usersWithReqInfo = _.map(users, (user) => ({
    id: user.id,
    isGuest: user.is_restricted || user.is_ultra_restricted,
    isBot: user.is_bot
  }))
  userCache = _.keyBy(usersWithReqInfo, 'id')
  return userCache
}

async function getUsers (app, cursor, depth = 1) {
  console.log('get users step', depth)
  // eslint-disable-next-line camelcase
  let { members, response_metadata } = await app.client.users.list({
    // The token you used to initialize your app
    token: process.env.SLACK_BOT_TOKEN,
    cursor: cursor,
    limit: GET_USERS_LIMIT
  })
  if (response_metadata.next_cursor && depth < MAX_GET_USERS_DEPTH) {
    members = members.concat(await getUsers(app, response_metadata.next_cursor, depth + 1))
  }
  return members
}

export function getCachedUser (id) {
  return userCache[id]
}

export function getCachedUsers () {
  return userCache
}

export function upsertCachedUser (id, diff) {
  if (!userCache[id]) {
    userCache[id] = {}
  }
  userCache[id] = _.defaults(diff, userCache[id])
  return userCache[id]
}
