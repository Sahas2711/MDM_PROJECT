import { motion } from 'framer-motion'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import ExplainabilityPanel from '../components/ux/ExplainabilityPanel'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'

const clusterOrder = [
  {
    id: 'lowPrice',
    label: 'Low Price',
    color: '#FF7A45',
    fill: 'rgba(255,122,69,0.18)',
    centroid: 'Demand 22, Price 1480',
    note: 'Value-seeking buyers dominate; ideal for bulk liquidation but lower margin realization.',
  },
  {
    id: 'stable',
    label: 'Stable',
    color: '#4DA3FF',
    fill: 'rgba(77,163,255,0.16)',
    centroid: 'Demand 48, Price 1960',
    note: 'Balanced demand-supply state with low variance, suitable for risk-averse sell planning.',
  },
  {
    id: 'highDemand',
    label: 'High Demand',
    color: '#2FAA65',
    fill: 'rgba(47,170,101,0.16)',
    centroid: 'Demand 74, Price 2440',
    note: 'High willingness-to-pay and strong trade velocity; best candidates for premium execution.',
  },
  {
    id: 'volatile',
    label: 'Volatile',
    color: '#F7B955',
    fill: 'rgba(247,185,85,0.16)',
    centroid: 'Demand 61, Price 2150',
    note: 'Fast swings from news and supply shocks; requires tighter confidence thresholds.',
  },
]

function MarketIntelligence() {
  const tr = useTranslate()
  const loading = useAiLoading(900)

  return (
    <div className="space-y-5">
      <AIAnalyzingOverlay loading={loading} />

      <motion.section
        className="grid gap-5 xl:grid-cols-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('Cluster Legend')}</CardDescription>
            <CardTitle>{tr('4 Market Clusters')}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {clusterOrder.map(cluster => (
              <div key={cluster.id} className="interactive-tile rounded-xl border border-border-soft bg-bg-cardHover/30 p-3.5">
                <div className="flex items-center gap-2">
                  <span
                    className="h-3 w-3 rounded-full"
                    style={{ backgroundColor: cluster.color, boxShadow: `0 0 12px ${cluster.color}` }}
                  />
                  <p className="text-sm font-semibold text-text-primary">{cluster.label}</p>
                </div>
                <p className="mt-2 text-xs text-text-muted">Centroid: {cluster.centroid}</p>
              </div>
            ))}
          </CardContent>
        </Card>

        <Card className="xl:col-span-2">
          <CardHeader>
            <CardDescription>{tr('Insights Panel')}</CardDescription>
            <CardTitle>{tr('Cluster-Level Interpretation')}</CardTitle>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2">
            {clusterOrder.map(cluster => (
              <div
                key={cluster.id}
                className="interactive-tile rounded-xl border p-4"
                style={{ borderColor: cluster.color, backgroundColor: cluster.fill }}
              >
                <p className="text-sm font-semibold text-text-primary">{cluster.label}</p>
                <p className="mt-2 text-sm leading-6 text-text-secondary">{cluster.note}</p>
              </div>
            ))}

            <div className="rounded-xl border border-brand-neonCyan/35 bg-brand-neonCyan/10 p-4 md:col-span-2">
              <p className="text-xs font-semibold uppercase tracking-[0.08em] text-brand-neonCyan">
                {tr('ML Depth')}
              </p>
              <p className="mt-2 text-sm leading-6 text-text-secondary">
                Clusters are derived from a feature space combining demand index, modal price,
                and intraday spread variability. This segmentation supports policy-level actions:
                margin optimization in high-demand groups, risk control in volatile groups,
                and volume strategies in low-price groups.
              </p>
            </div>
          </CardContent>
        </Card>
      </motion.section>

      <ExplainabilityPanel
        bullets={[
          'Clustering segments markets by shared price-demand signatures rather than fixed geography labels.',
          'Stable clusters support predictable planning, while volatile clusters require tighter decision thresholds.',
          'High-demand cluster concentration is a leading signal for premium margin opportunities.',
        ]}
      />
    </div>
  )
}

export default MarketIntelligence
