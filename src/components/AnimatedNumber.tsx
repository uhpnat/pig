import { animate } from 'framer-motion'
import { useEffect, useRef, useState } from 'react'
import { useStore } from '@/hooks/useStore'

export function AnimatedNumber({ value, format, duration = 0.9 }: { value: number; format: (n: number) => string; duration?: number }) {
  const { motionOff } = useStore()
  const [shown, setShown] = useState(value)
  const prev = useRef(value)
  useEffect(() => {
    if (motionOff) { setShown(value); prev.current = value; return }
    const c = animate(prev.current, value, { duration, ease: 'easeOut', onUpdate: setShown })
    prev.current = value
    return () => c.stop()
  }, [value, duration, motionOff])
  return <>{format(shown)}</>
}
