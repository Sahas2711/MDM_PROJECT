import { useMemo } from 'react'
import { useTheme } from '../context/ThemeContext'

export default function useChartTheme() {
  const { theme } = useTheme()

  return useMemo(() => ({
    theme,
    grid: 'var(--chart-grid)',
    axis: 'var(--chart-axis)',
    tick: 'var(--chart-tick)',
    tooltip: {
      background: 'var(--chart-tooltip-bg)',
      border: '1px solid var(--chart-tooltip-border)',
      borderRadius: '12px',
      color: 'var(--chart-tooltip-text)',
      fontSize: 12,
    },
  }), [theme])
}
