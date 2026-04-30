import { useEffect, useState } from 'react'

function useAiLoading(duration = 850) {
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setLoading(false)
    }, duration)

    return () => window.clearTimeout(timer)
  }, [duration])

  return loading
}

export default useAiLoading
