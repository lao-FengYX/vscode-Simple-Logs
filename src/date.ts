import { env } from 'vscode'

const SECOND = 1000
const MINUTE = 60 * SECOND
const HOUR = 60 * MINUTE
const DAY = 24 * HOUR
const WEEK = 7 * DAY
const YEAR = 365.25 * DAY
const MONTH = YEAR / 12

const timeUints: [Intl.RelativeTimeFormatUnit, number][] = [
  ['year', YEAR],
  ['month', MONTH],
  ['week', WEEK],
  ['day', DAY],
  ['hour', HOUR],
  ['minute', MINUTE],
  ['second', SECOND]
]

/**
 * 格式化日期差异为易读的时间单位
 * @param now 当前日期
 * @param before 之前的日期
 * @returns 相对当前日期的时间
 */
export function formatDate(now: Date, before: Date): string {
  const diffMilliseconds = now.getTime() - before.getTime()

  for (const [unit, timeStamp] of timeUints) {
    if (diffMilliseconds > timeStamp) {
      return new Intl.RelativeTimeFormat(env.language, { numeric: 'auto' }).format(
        // { numeric: 'auto' } 习惯的措辞
        -1 * Math.round(diffMilliseconds / timeStamp),
        unit
      )
    }
  }
  return env.language.toLowerCase() === 'zh-cn' ? '刚刚' : 'right now'
}
