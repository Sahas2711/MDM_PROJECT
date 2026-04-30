import { cn } from '../../lib/utils'
import useTranslate from '../../hooks/useTranslate'

function Card({ className, ...props }) {
  return (
    <div
      className={cn(
        'rounded-2xl border border-border-soft bg-gradient-to-b from-bg-card to-slate-950/70 shadow-card-md transition-all duration-300 hover:-translate-y-0.5 hover:border-border-strong hover:shadow-card-lg',
        className,
      )}
      {...props}
    />
  )
}

function CardHeader({ className, ...props }) {
  return <div className={cn('space-y-1.5 p-5', className)} {...props} />
}

function CardTitle({ className, children, ...props }) {
  const tr = useTranslate()
  return (
    <h3 className={cn('font-display text-base font-semibold tracking-tight text-text-primary', className)} {...props}>
      {typeof children === 'string' ? tr(children) : children}
    </h3>
  )
}

function CardDescription({ className, children, ...props }) {
  const tr = useTranslate()
  return (
    <p className={cn('text-sm text-text-secondary', className)} {...props}>
      {typeof children === 'string' ? tr(children) : children}
    </p>
  )
}

function CardContent({ className, ...props }) {
  return <div className={cn('px-5 pb-5', className)} {...props} />
}

export { Card, CardContent, CardDescription, CardHeader, CardTitle }
