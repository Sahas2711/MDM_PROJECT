import { motion } from 'framer-motion'
import { CheckCircle2, MinusCircle } from 'lucide-react'
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '../components/ui/card'
import { cn } from '../lib/utils'

const UNITS = [
  {
    unit: 'Unit I',
    title: 'Classification & Prediction',
    models: [
      {
        name: 'Random Forest',
        status: 'deployed',
        accuracy: '99.65% test · 99.50% CV',
        epochs: 'N/A — ensemble, 100 trees',
        description: 'Primary deployed crop-price classifier. Uses 9 features (state, district, market, commodity, variety, grade, arrival_date, min_price, max_price) to classify price as Low / Medium / High. Artifact: crop_price_classifier_rf_20260507T091738Z.joblib.',
        where: '/smart-decision, /model-performance, /predict API',
      },
      {
        name: 'Gradient Boosting',
        status: 'deployed',
        accuracy: '99.59% test · 99.68% CV (best CV overall)',
        epochs: 'N/A — boosting, 100 estimators',
        description: 'Second deployed classifier. Highest cross-validation accuracy across all models. Sequential boosting on residuals. Artifact: crop_price_classifier_gb_20260507T091738Z.joblib.',
        where: '/predict?model_type=gradient_boosting, /model-performance',
      },
      {
        name: 'Decision Tree',
        status: 'notebook',
        accuracy: '99.65% test',
        epochs: 'N/A',
        description: 'Trained in Updated_MDM_crop_prices.ipynb for comparison. Matches RF test accuracy but overfits more — not deployed due to lower CV stability.',
        where: 'Notebook — Updated_MDM_crop_prices.ipynb',
      },
      {
        name: 'Logistic Regression',
        status: 'notebook',
        accuracy: '99.01% test',
        epochs: 'N/A — max_iter=1000',
        description: 'Linear baseline classifier trained in notebook. Good accuracy for a linear model. Not deployed — ensemble models outperform it on this dataset.',
        where: 'Notebook — Updated_MDM_crop_prices.ipynb',
      },
      {
        name: 'KNN (K-Nearest Neighbours)',
        status: 'notebook',
        accuracy: '89.39% test',
        epochs: 'N/A — k=5',
        description: 'Lazy learner trained in notebook comparison. Lowest accuracy among all classifiers due to high-cardinality categorical features. Covers syllabus eager/lazy learning topic.',
        where: 'Notebook — Updated_MDM_crop_prices.ipynb',
      },
      {
        name: 'SVM (Support Vector Machine)',
        status: 'notebook',
        accuracy: '97.61% test',
        epochs: 'N/A — RBF kernel',
        description: 'Trained in notebook with RBF kernel. Strong accuracy but slow inference on large feature sets. Not deployed — RF and GB are faster and more accurate.',
        where: 'Notebook — Updated_MDM_crop_prices.ipynb',
      },
    ],
  },
  {
    unit: 'Unit II',
    title: 'Clustering Techniques',
    models: [
      {
        name: 'K-Means Clustering',
        status: 'deployed',
        accuracy: 'Silhouette 0.2435',
        epochs: 'N/A — k=5, max_iter=300',
        description: 'Deployed cluster model over price-feature vectors. Used in the Smart Decision pipeline as the Cluster Analysis node to group market price patterns. Exposed via /clusters API. Artifact: kmeans_clusterer_20260507T091738Z.joblib.',
        where: '/smart-decision (Cluster Analysis node), /clusters API, /market-intelligence',
      },
      {
        name: 'Hierarchical Clustering',
        status: 'notebook',
        accuracy: 'Silhouette 0.1927',
        epochs: 'N/A — agglomerative, ward linkage',
        description: 'Agglomerative hierarchical clustering trained in notebook for comparison against K-Means. Lower silhouette score. Covers syllabus agglomerative/divisive clustering topic.',
        where: 'Notebook — Updated_MDM_crop_prices.ipynb',
      },
      {
        name: 'DBSCAN',
        status: 'notebook',
        accuracy: 'Silhouette 0.3141',
        epochs: 'N/A — eps=0.5, min_samples=5',
        description: 'Density-based clustering experiment in notebook. Highest silhouette score but produces noise points on this dataset. Extra notebook work beyond syllabus core list.',
        where: 'Notebook — Updated_MDM_crop_prices.ipynb',
      },
    ],
  },
  {
    unit: 'Unit III',
    title: 'Artificial Neural Network',
    models: [
      {
        name: 'ANN (Artificial Neural Network)',
        status: 'deployed',
        accuracy: '98.89% test · Macro F1 97.36%',
        epochs: '39 best epoch — early stopping, patience=10',
        description: 'Dense feedforward neural network trained with Keras. Architecture: input → Dense(256, ReLU) → Dropout(0.3) → Dense(128, ReLU) → Dropout(0.2) → Dense(3, Softmax). Trained on crop-price classification. Artifact: ann_model_20260507T091738Z.keras.',
        where: '/predict?model_type=ann, /smart-decision, /model-performance',
      },
      {
        name: 'DNN (Deep Neural Network)',
        status: 'deployed',
        accuracy: '98.89% test · Macro F1 97.20%',
        epochs: '38 best epoch — early stopping, patience=10',
        description: 'Deeper variant of the ANN with additional hidden layers. Architecture: input → Dense(512) → Dense(256) → Dense(128) → Dense(64) → Dense(3, Softmax). Dropout and BatchNorm applied. Artifact: dnn_model_20260507T091738Z.keras.',
        where: '/predict?model_type=dnn, /smart-decision, /model-performance',
      },
    ],
  },
  {
    unit: 'Unit IV',
    title: 'NLP / LLM',
    models: [
      {
        name: 'Groq Whisper STT (whisper-large-v3)',
        status: 'deployed',
        accuracy: 'Production STT — WER not benchmarked',
        epochs: 'N/A — pre-trained, Groq-hosted',
        description: 'Speech-to-text using Groq-hosted Whisper large-v3. Handles Marathi, Hindi, and English farmer audio. First stage of the voice-to-voice pipeline in backend/voice-to-voice.',
        where: '/voice-assistant (STT stage)',
      },
      {
        name: 'Llama 3.3 70B Versatile (Groq)',
        status: 'deployed',
        accuracy: 'N/A — generative LLM',
        epochs: 'N/A — pre-trained, prompt-engineered',
        description: 'llama-3.3-70b-versatile via Groq API. Generates multilingual farmer-support responses. System prompt constrains output to short, practical, Marathi-first advice. Temperature 0.2, max_tokens 320. Replaced OpenRouter.',
        where: '/voice-assistant (LLM stage), /chat-assistant',
      },
      {
        name: 'HuggingFace MMS TTS (facebook/mms-tts-mar)',
        status: 'deployed',
        accuracy: 'N/A — generative TTS',
        epochs: 'N/A — pre-trained, HuggingFace Inference API',
        description: 'Text-to-speech synthesis using Facebook MMS Marathi model. Converts LLM text reply to audio returned to the farmer. Fallback: ElevenLabs HTTP TTS.',
        where: '/voice-assistant (TTS stage)',
      },
    ],
  },
  {
    unit: 'Unit V',
    title: 'Deep Learning (CNN)',
    models: [
      {
        name: 'YOLOv8 Object Detector (yolov8n.pt)',
        status: 'deployed',
        accuracy: 'Per-image detector confidence',
        epochs: 'N/A — yolov8n.pt pre-trained',
        description: 'YOLOv8 nano model — first stage of the Smart Decision image pipeline. Detects and localises the crop/produce in the uploaded image before classification. Threshold: 0.35.',
        where: '/smart-decision (Object Detection node)',
      },
      {
        name: 'Fruit Classifier CNN (fruit_classifier.h5)',
        status: 'deployed',
        accuracy: 'Per-image confidence returned',
        epochs: 'N/A — pre-trained, fine-tuned',
        description: 'Multi-class CNN that identifies the fruit/crop category from a YOLO-cropped region before the freshness check. Validates that the uploaded image is a supported crop type. Input: 224×224 RGB.',
        where: '/smart-decision (Fruit Validation node)',
      },
      {
        name: 'Freshness CNN (cnn_food_quality_model.h5)',
        status: 'deployed',
        accuracy: 'Per-image confidence returned',
        epochs: 'N/A — pre-trained, fine-tuned',
        description: 'Binary CNN classifier: Fresh vs Rotten. Applied after YOLO detection and fruit classification. Returns freshness label + confidence score. Input: 128×128 RGB.',
        where: '/smart-decision (Quality Analysis node), /predict-image, /model-performance',
      },
      {
        name: 'Real-ESRGAN x4plus (RealESRGAN_x4plus.pth)',
        status: 'deployed',
        accuracy: 'N/A — super-resolution, no classification metric',
        epochs: 'N/A — pre-trained weights only, no training',
        description: 'Real-ESRGAN upscaler integrated as an optional preprocessing stage before the YOLO → CNN pipeline. Uses RRDBNet architecture with 23 RRDB blocks. Tile size 256px to limit VRAM. GPU auto-detected, CPU fallback. Skips images already ≥1024px. Weights: RealESRGAN_x4plus.pth (~67 MB). Toggle: enable_enhancement=true on /smart-decision and /predict-image.',
        where: '/smart-decision (enable_enhancement=true), /predict-image (enable_enhancement=true)',
      },
    ],
  },
  {
    unit: 'Unit VI',
    title: 'Generative Adversarial Networks',
    models: [
      {
        name: 'Real-ESRGAN (GAN-based Super Resolution)',
        status: 'deployed',
        accuracy: 'N/A — perceptual quality enhancement',
        epochs: 'N/A — pretrained weights, inference only',
        description: 'Real-ESRGAN is a practical GAN application — it uses a trained generator (RRDBNet) to produce photorealistic upscaled images from low-resolution inputs. Covers GAN generator/discriminator architecture, adversarial training concepts, and practical GAN inference. Integrated as the preprocessing enhancement stage in the AgriIntel image pipeline. No GAN training is performed — pretrained weights are used for inference only.',
        where: '/smart-decision (enable_enhancement=true), /predict-image (enable_enhancement=true), backend/enhance.py',
      },
    ],
  },
]

const STATUS_CONFIG = {
  deployed: {
    label: 'Deployed',
    icon: CheckCircle2,
    pill: 'bg-green-500/15 text-green-400 border-green-500/30',
    border: 'border-green-500/20',
    dot: 'bg-green-400',
  },
  notebook: {
    label: 'Notebook Only',
    icon: MinusCircle,
    pill: 'bg-yellow-400/15 text-yellow-300 border-yellow-400/30',
    border: 'border-yellow-400/15',
    dot: 'bg-yellow-400',
  },
}

const UNIT_COLORS = {
  'Unit I':   'border-blue-500/30 bg-blue-500/5',
  'Unit II':  'border-cyan-500/30 bg-cyan-500/5',
  'Unit III': 'border-purple-500/30 bg-purple-500/5',
  'Unit IV':  'border-green-500/30 bg-green-500/5',
  'Unit V':   'border-orange-500/30 bg-orange-500/5',
  'Unit VI':  'border-pink-500/30 bg-pink-500/5',
}

function StatusPill({ status }) {
  const cfg = STATUS_CONFIG[status]
  const Icon = cfg.icon
  return (
    <span className={cn('inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[11px] font-semibold', cfg.pill)}>
      <Icon size={11} />
      {cfg.label}
    </span>
  )
}

function ModelRow({ model, index }) {
  const cfg = STATUS_CONFIG[model.status]
  return (
    <motion.div
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.2, delay: index * 0.04 }}
      className={cn('rounded-2xl border p-4 space-y-3', cfg.border, 'bg-bg-cardHover/30')}
    >
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="flex items-center gap-2">
          <span className={cn('mt-1 h-2 w-2 shrink-0 rounded-full', cfg.dot)} />
          <p className="text-sm font-semibold text-text-primary">{model.name}</p>
        </div>
        <StatusPill status={model.status} />
      </div>

      <p className="text-sm leading-6 text-text-secondary">{model.description}</p>

      <div className="grid gap-2 sm:grid-cols-3">
        <div className="rounded-xl border border-border-soft bg-bg-elevated/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Accuracy / Score</p>
          <p className="mt-1 font-mono text-xs font-bold text-text-primary">{model.accuracy}</p>
        </div>
        <div className="rounded-xl border border-border-soft bg-bg-elevated/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Epochs / Config</p>
          <p className="mt-1 font-mono text-xs font-bold text-text-primary">{model.epochs}</p>
        </div>
        <div className="rounded-xl border border-border-soft bg-bg-elevated/50 px-3 py-2">
          <p className="text-[10px] uppercase tracking-widest text-text-muted">Used In</p>
          <p className="mt-1 text-xs text-text-muted leading-5">{model.where}</p>
        </div>
      </div>
    </motion.div>
  )
}

export default function SyllabusMatch() {
  const allModels = UNITS.flatMap(u => u.models)
  const deployed = allModels.filter(m => m.status === 'deployed').length
  const notebook = allModels.filter(m => m.status === 'notebook').length

  return (
    <div className="space-y-6">
      <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.28 }}>
        <Card>
          <CardHeader>
            <CardDescription>MDM Syllabus — Unit I to VI · all implemented models</CardDescription>
            <CardTitle>Syllabus Match</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-wrap gap-3">
              {[
                { label: 'Total Models', value: allModels.length, cls: 'border-border-soft text-text-primary' },
                { label: 'Deployed to Backend', value: deployed, cls: 'border-green-500/30 bg-green-500/10 text-green-400' },
                { label: 'Notebook Only', value: notebook, cls: 'border-yellow-400/30 bg-yellow-400/10 text-yellow-300' },
                { label: 'Units Covered', value: UNITS.length + ' / 6', cls: 'border-brand-neonCyan/30 bg-brand-neonCyan/10 text-brand-neonCyan' },
              ].map(({ label, value, cls }) => (
                <div key={label} className={cn('rounded-xl border px-4 py-3 min-w-[130px]', cls)}>
                  <p className="text-[11px] uppercase tracking-widest opacity-70">{label}</p>
                  <p className="mt-1 text-2xl font-bold">{value}</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {UNITS.map((unit, ui) => (
        <motion.div
          key={unit.unit}
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3, delay: ui * 0.06 }}
        >
          <Card className={cn('border', UNIT_COLORS[unit.unit])}>
            <CardHeader>
              <div className="flex items-center gap-3">
                <span className="rounded-lg border border-border-soft bg-bg-elevated px-2.5 py-1 font-mono text-xs font-bold text-text-muted">
                  {unit.unit}
                </span>
                <CardTitle>{unit.title}</CardTitle>
              </div>
              <div className="mt-1 flex gap-2 text-[11px] text-text-muted">
                <span className="text-green-400">{unit.models.filter(m => m.status === 'deployed').length} deployed</span>
                {unit.models.filter(m => m.status === 'notebook').length > 0 && (
                  <>
                    <span>·</span>
                    <span className="text-yellow-300">{unit.models.filter(m => m.status === 'notebook').length} notebook</span>
                  </>
                )}
              </div>
            </CardHeader>
            <CardContent className="space-y-3">
              {unit.models.map((model, mi) => (
                <ModelRow key={model.name} model={model} index={mi} />
              ))}
            </CardContent>
          </Card>
        </motion.div>
      ))}
    </div>
  )
}
