import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import Layout from './components/layout/Layout'
import Dashboard from './pages/Dashboard'
import CropRecommendation from './pages/CropRecommendation'
import SellTiming from './pages/SellTiming'
import MarketIntelligence from './pages/MarketIntelligence'
import ModelPerformance from './pages/ModelPerformance'
import SmartDecision from './pages/SmartDecision'
import AIAssistant from './pages/AIAssistant'
import './App.css'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="crop-recommendation" element={<CropRecommendation />} />
          <Route path="sell-timing" element={<SellTiming />} />
          <Route path="market-intelligence" element={<MarketIntelligence />} />
          <Route path="model-performance" element={<ModelPerformance />} />
          <Route path="smart-decision" element={<SmartDecision />} />
          <Route path="ai-assistant" element={<AIAssistant />} />
        </Route>
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  )
}

export default App
