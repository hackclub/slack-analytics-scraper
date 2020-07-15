import crypto from 'crypto'

export function hashUserId (userId) {
  return crypto.createHash('sha256').update(userId).digest('base64')
}
