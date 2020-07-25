import crypto from 'crypto'

export function dateToStr (date) {
  const yyyy = date.getUTCFullYear()
  let mm = date.getUTCMonth() + 1
  if (mm < 10) {
    mm = `0${mm}`
  }
  let dd = date.getUTCDate()
  if (dd < 10) {
    dd = `0${dd}`
  }
  return `${yyyy}-${mm}-${dd}`
}

export function hashUserId (userId) {
  return crypto.createHash('sha256').update(userId).digest('base64')
}

export function getDateRange (startDate, endDate) {
  const dateRange = []
  const currentDate = startDate
  while (currentDate <= endDate) { // eslint-disable-line no-unmodified-loop-condition
    dateRange.push(new Date(currentDate))
    currentDate.setDate(currentDate.getDate() + 1)
  }
  return dateRange
}
