import { useEffect, useState } from 'react'

export interface CountdownTime {
  days: number
  hours: number
  minutes: number
  seconds: number
}

/** Live countdown timer to the end of `targetDateStr` (yyyy-mm-dd) in +07:00 timezone. */
export function useCountdown(targetDateStr: string): CountdownTime {
  const [timeLeft, setTimeLeft] = useState<CountdownTime>({
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
  })

  useEffect(() => {
    const updateCountdown = () => {
      const targetTime = new Date(`${targetDateStr}T23:59:59+07:00`).getTime()
      const diff = Math.max(0, targetTime - Date.now())
      setTimeLeft({
        days: Math.floor(diff / (1000 * 60 * 60 * 24)),
        hours: Math.floor((diff % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60)),
        minutes: Math.floor((diff % (1000 * 60 * 60)) / (1000 * 60)),
        seconds: Math.floor((diff % (1000 * 60)) / 1000),
      })
    }

    updateCountdown()
    const timer = setInterval(updateCountdown, 1000)
    return () => clearInterval(timer)
  }, [targetDateStr])

  return timeLeft
}
