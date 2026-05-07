# Syllabus Alignment Audit — AgriIntel AI Dashboard

Evaluated against 6 curriculum units. Evidence sourced from both notebooks, backend code, and frontend pages.

---

## Unit I — Classification

**Syllabus expects**: Naive Bayes, Bayesian Belief Network, Decision Tree, KNN, SVM, classification assessment, house price prediction case study.

| Algorithm | Status | Evidence |
|---|---|---|
| Decision Tree | ✅ Implemented | DT accuracy 99.65% — Updated notebook Section 3 |
| KNN | ✅ Implemented | KNN accuracy 89.39% — Updated notebook Section 3 |
| SVM | ✅ Implemented | SVM accuracy 97.61% — Updated notebook Section 3 |
| Logistic Regression | ✅ Bonus | LR accuracy 99.01% — not in syllabus but present |
| Random Forest | ✅ Bonus | RF accuracy 99.71% — not in syllabus but present |
| Gradient Boosting | ✅ Bonus | GB accuracy 99.71% — not in syllabus but present |
| Naive Bayes | ❌ Missing | No implementation in either notebook |
| Bayesian Belief Network | ❌ Missing | No implementation anywhere |
| Classification Assessment | ✅ Present | Comparison table with accuracy/F1/precision/recall in Section 3 |
| House Price Prediction | ❌ Substituted | Crop price classification used instead (domain substitution) |

**Alignment**: ~60% — Core tree/distance/kernel classifiers present. Probabilistic classifiers (NB, BBN) absent. Domain case study substituted.

---

## Unit II — Clustering

**Syllabus expects**: K-Means, K-Medoids, Agglomerative, EM, Spectral Clustering, online shopping case study.

| Algorithm | Status | Evidence |
|---|---|---|
| K-Means | ✅ Implemented | k=9, silhouette=0.2435 — Updated notebook Section 4 |
| Hierarchical | ✅ Implemented | silhouette=0.1927 — Updated notebook Section 4 |
| DBSCAN | ✅ Bonus | silhouette=0.3141 — not in syllabus but present |
| K-Medoids | ❌ Missing | No implementation in either notebook |
| Agglomerative (explicit) | ⚠️ Partial | Hierarchical covers this conceptually but not labeled separately |
| EM Clustering | ❌ Missing | No GMM or EM implementation |
| Spectral Clustering | ❌ Missing | No implementation |
| Online Shopping Case Study | ❌ Substituted | Mandi market price clustering used instead |

**Alignment**: ~40% — Only K-Means and Hierarchical confirmed. Three required algorithms missing. Domain substituted.

---

## Unit III — Artificial Neural Networks

**Syllabus expects**: Perceptron, activation functions, backpropagation theory, ANN architecture, car evaluation case study.

| Topic | Status | Evidence |
|---|---|---|
| ANN Implementation | ✅ Implemented | Dense 128→64→32→3, Dropout, Adam, 100 epochs, Test Acc 99.53% — Updated notebook Section 5 |
| DNN Implementation | ✅ Bonus | Dense 256→128→64→32→16→3, BatchNorm, Dropout, 150 epochs, Test Acc 63.75% — Section 6 |
| ANN Deployed to Backend | ✅ Deployed | `ann_model.h5` loaded in `predict.py`, live inference active |
| DNN Deployed to Backend | ✅ Deployed | `dnn_model.h5` loaded in `predict.py`, live inference active |
| Perceptron Theory | ❌ Missing | No single-layer perceptron implementation or discussion |
| Activation Function Analysis | ❌ Missing | ReLU used implicitly; no comparative analysis of sigmoid/tanh/ReLU |
| Backpropagation Theory | ❌ Missing | No manual backprop; Keras autograd only |
| Car Evaluation Case Study | ❌ Substituted | Crop price prediction used instead |

**Alignment**: ~50% — ANN and DNN architectures well-implemented and deployed. Theoretical foundations (perceptron, backprop, activation analysis) absent. Domain substituted.

---

## Unit IV — NLP / LLM

**Syllabus expects**: POS tagging, HMM, stop words, stemming, lemmatization, topic modeling, LLM fine-tuning, social media analytics.

| Topic | Status | Evidence |
|---|---|---|
| LLM Integration | ✅ Implemented | OpenRouter meta-llama/llama-3.3-70b-instruct:free — `voice-to-voice/app/config.py` |
| Speech-to-Text | ✅ Implemented | Groq Whisper large-v3 — `voice-to-voice/app/config.py` |
| Text-to-Speech | ✅ Implemented | HuggingFace facebook/mms-tts-mar (Marathi) — `voice-to-voice/app/config.py` |
| System Prompt Engineering | ✅ Implemented | Marathi-first farmer support prompt with safety constraints — `prompts.py` |
| POS Tagging | ❌ Missing | No NLTK/spaCy POS implementation |
| HMM | ❌ Missing | No Hidden Markov Model |
| Stop Words / Stemming / Lemmatization | ❌ Missing | No text preprocessing pipeline |
| Topic Modeling | ❌ Missing | No LDA/NMF |
| LLM Fine-tuning | ❌ Missing | API-only usage; no fine-tuning |
| Social Media Analytics | ❌ Missing | No social data integration |

**Alignment**: ~25% — LLM/STT/TTS pipeline is genuinely impressive and production-grade, but covers none of the classical NLP syllabus topics. Fine-tuning absent.

---

## Unit V — Deep Learning

**Syllabus expects**: CNN architecture (padding, pooling), RNN, BiRNN, Encoder-Decoder, LSTM, plant disease classification case study.

| Topic | Status | Evidence |
|---|---|---|
| CNN — Fruit Classifier | ✅ Implemented | 224×224 RGB input, 20 fruit classes — `predict_image.py` + `fruit_classifier.h5` |
| CNN — Freshness Classifier | ✅ Implemented | 128×128 RGB input, Fresh/Rotten binary — `cnn_food_quality_model.h5` |
| Object Detection (YOLOv8) | ✅ Bonus | YOLOv8 fruit detection stage — `predict_image.py` |
| CNN Theory (padding/pooling) | ❌ Missing | No theoretical discussion in notebooks |
| RNN | ❌ Missing | No recurrent network implementation |
| BiRNN | ❌ Missing | No bidirectional RNN |
| Encoder-Decoder | ❌ Missing | No seq2seq or U-Net style architecture |
| LSTM | ❌ Missing | No LSTM implementation |
| Plant Disease Classification | ⚠️ Adjacent | Fruit freshness (Fresh/Rotten) used instead of disease classification |

**Alignment**: ~35% — CNN deployment is strong and multi-stage. All sequential/recurrent architectures missing. Case study adjacent but not matching.

---

## Unit VI — Generative AI / GAN

**Syllabus expects**: GAN architecture, Generator/Discriminator, WGAN, DCGAN, CycleGAN, FaceApp-style case study.

| Topic | Status | Evidence |
|---|---|---|
| VAE — Trained | ⚠️ Partial | VAE trained in Updated notebook; weights exported as `vae_weights.h5` |
| VAE — Deployed | ❌ Not deployed | `vae_weights.h5` absent from `backend/models/`; no backend code loads it |
| GAN Architecture | ❌ Missing | No Generator/Discriminator in any notebook or backend |
| WGAN | ❌ Missing | No implementation |
| DCGAN | ❌ Missing | No implementation |
| CycleGAN | ❌ Missing | No implementation |
| FaceApp Case Study | ❌ Missing | No image generation or style transfer |

**Alignment**: ~10% — VAE is the only generative model and it is not deployed. No GAN variants present. This unit is effectively unaddressed.

---

## Overall Alignment Summary

| Unit | Topic | Alignment |
|---|---|---|
| I | Classification | ~60% |
| II | Clustering | ~40% |
| III | ANN | ~50% |
| IV | NLP / LLM | ~25% |
| V | Deep Learning | ~35% |
| VI | GAN | ~10% |
| **Overall** | | **~37%** |

---

## Strengths

- Classification section is the most complete — 6 algorithms trained, compared, and the best model (RF) is deployed to production.
- ANN/DNN both trained and deployed with live inference endpoints.
- Voice pipeline (Unit IV) is production-grade even though it doesn't cover classical NLP topics.
- CNN + YOLOv8 image pipeline is multi-stage and genuinely functional.

## Critical Gaps

- **Unit VI is nearly empty** — no GAN of any kind; VAE trained but not deployed.
- **Unit IV classical NLP** — POS, HMM, stemming, topic modeling all absent.
- **Unit V sequential models** — RNN, LSTM, BiRNN, Encoder-Decoder all absent.
- **Unit II** — K-Medoids, EM, Spectral Clustering all absent.
- **Unit I** — Naive Bayes and Bayesian Belief Network absent.
- All case studies are domain-substituted (crop/mandi instead of house/car/shopping/disease/FaceApp).

## Recommendations to Improve Alignment

1. Add Naive Bayes to notebook Section 3 (2-line sklearn addition).
2. Add GMM (EM clustering) to notebook Section 4.
3. Add a perceptron demo cell to notebook Section 5.
4. Add an LSTM cell for price time-series forecasting in notebook Section 6.
5. Deploy VAE or add a basic DCGAN cell to notebook Section 7 for Unit VI coverage.
6. Add a minimal NLP preprocessing cell (stop words, stemming) to address Unit IV classical topics.
