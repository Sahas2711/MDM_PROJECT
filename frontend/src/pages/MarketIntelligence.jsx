import { motion } from 'framer-motion'
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

const lowPriceData = [
  { x: 18, y: 1420, market: 'MKT-L1' },
  { x: 21, y: 1510, market: 'MKT-L2' },
  { x: 25, y: 1460, market: 'MKT-L3' },
  { x: 28, y: 1550, market: 'MKT-L4' },
  { x: 20, y: 1495, market: 'MKT-L5' },
]

const stableData = [
  { x: 43, y: 1890, market: 'MKT-S1' },
  { x: 47, y: 1940, market: 'MKT-S2' },
  { x: 52, y: 1995, market: 'MKT-S3' },
  { x: 49, y: 2010, market: 'MKT-S4' },
  { x: 44, y: 1925, market: 'MKT-S5' },
]

const highDemandData = [
  { x: 69, y: 2360, market: 'MKT-H1' },
  { x: 76, y: 2475, market: 'MKT-H2' },
  { x: 72, y: 2520, market: 'MKT-H3' },
  { x: 81, y: 2590, market: 'MKT-H4' },
  { x: 73, y: 2415, market: 'MKT-H5' },
]

const volatileData = [
  { x: 56, y: 1885, market: 'MKT-V1' },
  { x: 66, y: 2310, market: 'MKT-V2' },
  { x: 62, y: 2060, market: 'MKT-V3' },
  { x: 58, y: 2250, market: 'MKT-V4' },
  { x: 64, y: 1975, market: 'MKT-V5' },
]

const clusterOrder = [
  clusterMeta.lowPrice,
  clusterMeta.stable,
  clusterMeta.highDemand,
  clusterMeta.volatile,
]

function CustomTooltip({ active, payload }) {
  if (!active || !payload || payload.length === 0) {
    return null
  }

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

  return (
    <div className="space-y-5">
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
            <ResponsiveContainer width="100%" height="100%">
              <ScatterChart margin={{ top: 16, right: 10, bottom: 8, left: -10 }}>
                <CartesianGrid stroke="#22314D" strokeDasharray="3 3" />
                <XAxis
                  type="number"
                  dataKey="x"
                  name="Demand Index"
                  domain={[10, 90]}
                  tick={{ fill: '#9AB1D3', fontSize: 12 }}
                  axisLine={{ stroke: '#30456B' }}
                  tickLine={false}
                />
                <YAxis
                  type="number"
                  dataKey="y"
                  name="Modal Price"
                  domain={[1300, 2700]}
                  tick={{ fill: '#9AB1D3', fontSize: 12 }}
                  axisLine={{ stroke: '#30456B' }}
                  tickLine={false}
                />
                <Tooltip content={<CustomTooltip />} cursor={{ stroke: '#30456B', strokeDasharray: '4 4' }} />
                <Legend wrapperStyle={{ color: '#B4C0D9', fontSize: '12px', paddingTop: '8px' }} />
                <Scatter name="Low Price" data={lowPriceData} fill={clusterMeta.lowPrice.color}>
                  {lowPriceData.map((item) => (
                    <Cell key={item.market} fill={clusterMeta.lowPrice.color} fillOpacity={0.9} />
                  ))}
                </Scatter>
                <Scatter name="Stable" data={stableData} fill={clusterMeta.stable.color}>
                  {stableData.map((item) => (
                    <Cell key={item.market} fill={clusterMeta.stable.color} fillOpacity={0.9} />
                  ))}
                </Scatter>
                <Scatter name="High Demand" data={highDemandData} fill={clusterMeta.highDemand.color}>
                  {highDemandData.map((item) => (
                    <Cell key={item.market} fill={clusterMeta.highDemand.color} fillOpacity={0.9} />
                  ))}
                </Scatter>
                <Scatter name="Volatile" data={volatileData} fill={clusterMeta.volatile.color}>
                  {volatileData.map((item) => (
                    <Cell key={item.market} fill={clusterMeta.volatile.color} fillOpacity={0.9} />
                  ))}
                </Scatter>
              </ScatterChart>
            </ResponsiveContainer>
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
            {clusterOrder.map((cluster) => (
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
            {clusterOrder.map((cluster) => (
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
                Clusters are derived from a feature space combining demand index, modal price, and
                intraday spread variability. This segmentation supports policy-level actions: margin
                optimization in high-demand groups, risk control in volatile groups, and volume
                strategies in low-price groups.
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
