import { motion } from 'framer-motion'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../ui/card'
import useTranslate from '../../hooks/useTranslate'

function ExplainabilityPanel({ title = 'Why this recommendation?', bullets = [] }) {
  const tr = useTranslate()
  return (
    <motion.section
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
    >
      <Card className="border-brand-neonCyan/30">
        <CardHeader>
          <CardDescription>Explainability</CardDescription>
          <CardTitle>{tr(title)}</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-3">
          {bullets.map((item) => (
            <motion.div
              key={item}
              className="rounded-xl border border-border-soft bg-bg-cardHover/40 p-4"
              whileHover={{ y: -2, borderColor: '#30456B' }}
              transition={{ duration: 0.2 }}
            >
              <p className="text-sm leading-6 text-text-secondary">{item}</p>
            </motion.div>
          ))}
        </CardContent>
      </Card>
    </motion.section>
  )
}

export default ExplainabilityPanel
