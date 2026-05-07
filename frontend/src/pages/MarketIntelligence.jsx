import { motion } from 'framer-motion'
import { useEffect, useState } from 'react'
import {
  CartesianGrid,
  Cell,
  Legend,
  ResponsiveContainer,
  Scatter,
  ScatterChart,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts'
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from '../components/ui/card'
import AIAnalyzingOverlay from '../components/ux/AIAnalyzingOverlay'
import ExplainabilityPanel from '../components/ux/ExplainabilityPanel'
import useAiLoading from '../hooks/useAiLoading'
import useTranslate from '../hooks/useTranslate'
import { fetchClusters } from '../services/api'

const clusterMeta = {
  lowPrice: {
    id: 'lowPrice',
    label: 'Low Price',
    color: '#FF7A45',
    fill: 'rgba(255, 122, 69, 0.18)',
    centroid: 'Demand 22, Price 1480',
    note: 'Value-seeking buyers dominate; ideal for bulk liquidation but lower margin realization.',
  },
  stable: {
    id: 'stable',
    label: 'Stable',
    color: '#4DA3FF',
    fill: 'rgba(77, 163, 255, 0.16)',
    centroid: 'Demand 48, Price 1960',
    note: 'Balanced demand-supply state with low variance, suitable for risk-averse sell planning.',
  },
  highDemand: {
    id: 'highDemand',
    label: 'High Demand',
    color: '#2FAA65',
    fill: 'rgba(47, 170, 101, 0.16)',
    centroid: 'Demand 74, Price 2440',
    note: 'High willingness-to-pay and strong trade velocity; best candidates for premium execution.',
  },
  volatile: {
    id: 'volatile',
    label: 'Volatile',
    color: '#F7B955',
    fill: 'rgba(247, 185, 85, 0.16)',
    centroid: 'Demand 61, Price 2150',
    note: 'Fast swings from news and supply shocks; requires tighter confidence thresholds.',
  },
}

const clusterOrder = [
  clusterMeta.lowPrice,
  clusterMeta.stable,
  clusterMeta.highDemand,
  clusterMeta.volatile,
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) return null

  const point = payload[0].payload

  return (
    <div className="rounded-xl border border-border-strong bg-bg-elevated/95 p-3 shadow-card-md">
      <p className="text-xs font-semibold text-text-primary">{point.market}</p>
      <p className="mt-1 text-xs text-text-secondary">Demand Index: {point.x}</p>
      <p className="text-xs text-text-secondary">Modal Price: INR {point.y}</p>
    </div>
  )
}

function MarketIntelligence() {
  const tr = useTranslate()
  const loading = useAiLoading(900)
  const [clusters, setClusters] = useState([])
  const [clustersLoading, setClustersLoading] = useState(true)

  useEffect(() => {
    fetchClusters(120)
      .then(d => setClusters(d.clusters || []))
      .catch(() => setClusters([]))
      .finally(() => setClustersLoading(false))
  }, [])

  const CLUSTER_COLORS = ['#FF7A45', '#4DA3FF', '#2FAA65', '#F7B955', '#A78BFA']

  const grouped = clusters.reduce((acc, pt) => {
    const id = pt.cluster_id
    if (!acc[id]) acc[id] = []
    acc[id].push({ x: pt.modal_price, y: pt.max_price, market: pt.commodity })
    return acc
  }, {})

  return (
    <>
      <AIAnalyzingOverlay loading={loading} />

      <motion.section
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
      >
        <Card>
          <CardHeader>
            <CardDescription>{tr('Cluster Scatter Visualization')}</CardDescription>
            <CardTitle>{tr('Market Segmentation by Demand vs Modal Price')}</CardTitle>
          </CardHeader>

          <CardContent className="h-[390px]">
            {clustersLoading ? (
              <div className="flex h-[390px] items-center justify-center">
                <p className="text-sm text-text-muted">Loading cluster data...</p>
              </div>
            ) : clusters.length === 0 ? (
              <div className="flex h-[390px] items-center justify-center">
                <p className="text-sm text-text-muted">Backend unavailable — start the server to see live clusters.</p>
              </div>
            ) : (
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 16, right: 10, bottom: 8, left: -10 }}>
                  <CartesianGrid stroke="#22314D" strokeDasharray="3 3" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    name="Modal Price"
                    tick={{ fill: '#9AB1D3', fontSize: 12 }}
                    axisLine={{ stroke: '#30456B' }}
                    tickLine={false}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    name="Max Price"
                    tick={{ fill: '#9AB1D3', fontSize: 12 }}
                    axisLine={{ stroke: '#30456B' }}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#30456B', strokeDasharray: '4 4' }} />
                  <Legend wrapperStyle={{ color: '#B4C0D9', fontSize: '12px', paddingTop: '8px' }} />

                  {Object.entries(grouped).map(([id, pts]) => (
                    <Scatter
                      key={id}
                      name={`Cluster ${id}`}
                      data={pts}
                      fill={CLUSTER_COLORS[id % CLUSTER_COLORS.length]}
                    >
                      {pts.map((pt, i) => (
                        <Cell key={i} fill={CLUSTER_COLORS[id % CLUSTER_COLORS.length]} fillOpacity={0.85} />
                      ))}
                    </Scatter>
                  ))}
                </ScatterChart>
              </ResponsiveContainer>
            )}
          </CardContent>
        </Card>
      </motion.section>

      <motion.section
        className="grid gap-5 xl:grid-cols-3"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.32, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
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
                style={{
                  borderColor: cluster.color,
                  backgroundColor: cluster.fill,
                }}
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
    </>
  )
}

export default MarketIntelligence
