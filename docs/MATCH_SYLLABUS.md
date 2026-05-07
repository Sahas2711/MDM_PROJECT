# Syllabus Match — Current Project Status

This file updates the syllabus mapping against the current project state as of the latest backend, notebooks, and UI routes.

Evidence checked from:
- `Notebooks/Updated_MDM_crop_prices.ipynb`
- `Notebooks/production_training_pipeline.ipynb`
- `backend/models/model_metrics_20260507T091738Z.json`
- `backend/models/training_metadata_20260507T091738Z.json`
- `backend/predict.py`
- `backend/predict_image.py`
- `backend/smart_decision.py`
- `backend/voice-to-voice/app/*`
- current frontend pages including `SmartDecision.jsx`

---

## 1. Overall Syllabus Mapping

| Unit | Syllabus Theme | Current Match | Remarks |
|---|---|---:|---|
| I | Classification and Prediction | Partial-Strong | Multiple classifiers are trained; crop-price classification replaces house-price case study. |
| II | Clustering Techniques | Partial | K-Means is implemented and used; hierarchical and DBSCAN appear in notebook analysis; K-Medoids and EM are missing. |
| III | Artificial Neural Network | Strong | ANN and DNN are trained and deployed for crop-price classification. |
| IV | NLP / LLM | Partial | Modern LLM, STT, and TTS are implemented, but classical POS/HMM/stemming/topic-modeling syllabus topics are not present. |
| V | Deep Learning | Strong-Partial | CNN-based image freshness and fruit classification are implemented; recurrent topics are missing. |
| VI | Generative Adversarial Networks | Weak | No GAN implementation is integrated in the current project. |

---

## 2. Unit-wise Match

### Unit I — Classification and Prediction

Syllabus expects:
- Naive Bayes
- Bayesian Belief Network
- Eager / Lazy learning
- KNN
- SVM
- classification assessment
- house-price prediction case study

What the project currently has:
- `KNN` in notebook comparison
- `SVM` in notebook comparison
- `Decision Tree`, `Logistic Regression`, `Random Forest`, `Gradient Boosting` in notebook comparison
- deployed `Random Forest`, `ANN`, and `DNN` for crop-price classification
- classification metrics available in `backend/models/model_metrics_20260507T091738Z.json`

Current match:
- `Naive Bayes`: Missing
- `Bayesian Belief Network`: Missing
- `KNN`: Present in notebook work
- `SVM`: Present in notebook work
- `Classification assessment`: Present
- `Case study`: Replaced by crop-price prediction instead of house-price prediction

Verdict:
- Good practical coverage for classification, but not a perfect syllabus match.

### Unit II — Clustering Techniques

Syllabus expects:
- clustering basics and quality parameters
- K-Means
- K-Medoids
- agglomerative / divisive clustering
- EM algorithm
- spectral clustering
- online shopping case study

What the project currently has:
- `K-Means` deployed in backend clustering flow (`predict.py` / `smart_decision.py`)
- clustering used in `/smart-decision` as `Cluster Analysis`
- notebook evidence for hierarchical clustering and DBSCAN analysis from prior audit docs

Current match:
- `K-Means`: Present and used
- `Hierarchical clustering`: Present in notebook analysis
- `DBSCAN`: Extra notebook work, not in syllabus core list
- `K-Medoids`: Missing
- `EM / GMM`: Missing
- `Spectral clustering`: Missing
- `Case study`: Replaced by mandi / crop market clustering instead of online shopping

Verdict:
- Useful clustering work exists, but unit coverage is still incomplete.

### Unit III — Artificial Neural Network

Syllabus expects:
- neurons, perceptron, ANN topology
- activation functions
- learning rate
- gradient descent / backpropagation
- ANN advantages and limitations
- deep learning introduction
- automatic car case study

What the project currently has:
- notebook-trained `ANN`
- notebook-trained `DNN`
- backend deployment of both `ann_model.h5` and `dnn_model.h5`
- live inference through backend model registry
- model comparison metadata in backend metrics

Current match:
- `ANN implementation`: Present
- `Deep neural network implementation`: Present
- `Backprop / activation / learning`: Implicit through Keras training, but not deeply documented as theory
- `Perceptron-only treatment`: Not explicitly shown
- `Case study`: Replaced by crop-price classification instead of automatic car case study

Verdict:
- One of the strongest units in the project from an implementation perspective.

### Unit IV — NLP / LLM

Syllabus expects:
- NLP introduction
- POS tagging
- HMM for POS
- LLM introduction and applications
- social media analytics
- stop words / stemming / lemmatization / topic modeling
- fine-tuning of LLM

What the project currently has:
- voice assistant pipeline in `backend/voice-to-voice`
- `Groq Whisper` STT
- `OpenRouter / LLM` response generation
- `HuggingFace MMS TTS`
- prompt-based farmer support assistant

Current match:
- `LLM introduction / usage`: Strong practical match
- `Voice AI application`: Present
- `POS tagging`: Missing
- `HMM`: Missing
- `Stop word removal / stemming / lemmatization`: Missing
- `Topic modeling`: Missing
- `LLM fine-tuning`: Missing
- `Case study`: Replaced by farmer-support voice assistant instead of social media analytics

Verdict:
- Modern AI application is strong, but classical syllabus NLP topics are mostly absent.

### Unit V — Deep Learning

Syllabus expects:
- CNN structure
- convolution, pooling, fully connected layers
- CNN training
- RNN / BiRNN / Encoder-Decoder / LSTM
- disease classification using CNN

What the project currently has:
- `fruit_classifier.h5` CNN
- `cnn_food_quality_model.h5` freshness CNN
- YOLO object detection before CNN freshness
- full 9-node AI crop decision workflow in `/smart-decision`

Current match:
- `CNN application`: Present and deployed
- `Freshness classification using image`: Present
- `YOLO + CNN multi-stage pipeline`: Present and stronger than basic syllabus implementation
- `RNN / BiRNN / Encoder-Decoder / LSTM`: Missing
- `Case study`: Adjacent; uses crop freshness / fruit validation instead of disease classification

Verdict:
- Strong practical CNN implementation, but sequential deep learning topics are not covered.

### Unit VI — Generative Adversarial Networks

Syllabus expects:
- GAN basics
- generator / discriminator
- Wasserstein loss
- mode collapse
- DCGAN
- CycleGAN
- FaceApp-style case study

What the project currently has:
- no active GAN integration in backend or frontend
- no deployed generative image model

Current match:
- `GAN`: Missing
- `WGAN / DCGAN / CycleGAN`: Missing
- `FaceApp case`: Missing

Verdict:
- This is the weakest syllabus match area in the current project.

---

## 3. Notebook + Project Model Table

The table below focuses on actual models present in notebook work or current backend deployment and maps them to syllabus units.

| Sr. No. | Model Name | Description | Unit Name | Accuracy / Score | Epoch | Where Used in UI |
|---|---|---|---|---|---|---|
| 1 | KNN | notebook classifier for crop-price category prediction | Unit I — Classification | 89.39% | N/A | Notebook only, not exposed in UI |
| 2 | SVM | notebook classifier for crop-price category prediction | Unit I — Classification | 97.61% | N/A | Notebook only, not exposed in UI |
| 3 | Decision Tree | notebook classifier for crop-price category prediction | Unit I — Classification | 99.65% | N/A | Notebook only, not exposed in UI |
| 4 | Logistic Regression | extra notebook classifier beyond syllabus core list | Unit I — Classification | 99.01% | N/A | Notebook only, not exposed in UI |
| 5 | Random Forest | main deployed crop-price classifier using 9 features | Unit I — Classification | 99.65% test accuracy; CV mean 99.50% | N/A | `/smart-decision`, `/model-performance`, backend `/predict`, dashboard references |
| 6 | Gradient Boosting | trained crop-price classifier in notebook / metrics set | Unit I — Classification | 99.59% test accuracy; CV mean 99.68% | N/A | Not reliably exposed in current UI flow; mainly notebook / backend artifact set |
| 7 | K-Means | deployed cluster model over price-feature vectors | Unit II — Clustering | silhouette 0.2435 | N/A | `/smart-decision` as `Cluster Analysis` node |
| 8 | Hierarchical Clustering | notebook clustering comparison model | Unit II — Clustering | silhouette 0.1927 | N/A | Notebook only, not exposed in UI |
| 9 | DBSCAN | extra notebook clustering experiment | Unit II — Clustering | silhouette 0.3141 | N/A | Notebook only, not exposed in UI |
| 10 | ANN | dense neural network for crop-price classification | Unit III — ANN | 98.89% test accuracy | best epoch 39 | `/model-performance`, backend `/predict?model_type=ann`, `/smart-decision` support stack |
| 11 | DNN | deeper neural network for crop-price classification | Unit III / V — ANN / Deep Learning | 98.89% test accuracy in current backend metrics | best epoch 38 | backend `/predict?model_type=dnn`, `/smart-decision` support stack |
| 12 | Fruit Classifier CNN | image classifier for supported fruit/crop category before freshness step | Unit V — Deep Learning | accuracy not documented in backend metrics file | N/A | `/smart-decision` image validation pipeline |
| 13 | Freshness CNN | binary CNN for `Fresh` vs `Rotten` crop quality | Unit V — Deep Learning | per-image confidence returned; training accuracy not documented here | N/A | `/smart-decision`, image analysis portions of platform |
| 14 | YOLOv8 Detector | object detector used before fruit classification / crop validation | Unit V — Deep Learning | detector confidence per image, not notebook accuracy table | N/A | `/smart-decision` preprocessing + validation nodes |
| 15 | LLM + STT + TTS Voice Stack | Whisper + LLM + speech synthesis farmer assistant | Unit IV — NLP / LLM | no single accuracy metric | N/A | `/voice-assistant` |

Notes:
- ANN and DNN numbers above are taken from `backend/models/model_metrics_20260507T091738Z.json`, which reflects the current exported backend models.
- Traditional notebook metrics such as KNN / SVM / Decision Tree / clustering scores are retained from the existing project audit trail and notebook-derived docs.
- CNN training accuracy and fruit-classifier benchmark accuracy are not centralized in the backend metrics JSON, so those rows are marked as not documented here.

---

## 4. Best Unit Matches in Current Project

These are the units your project currently supports most strongly:

1. **Unit III — ANN**
   - ANN and DNN are both implemented and deployed.
   - Backend artifacts and metrics are available.
   - Used in actual prediction workflows.

2. **Unit V — Deep Learning**
   - Real CNN-based image pipeline exists.
   - YOLO + fruit-classifier + freshness-CNN + decision engine makes this a strong practical deep-learning section.

3. **Unit I — Classification**
   - Good notebook experimentation with multiple classical classifiers.
   - Strong production use of Random Forest for crop-price classification.

---

## 5. Weak / Missing Areas

| Unit | Missing or Weak Topics |
|---|---|
| Unit I | Naive Bayes, Bayesian Belief Network, original house-price case study |
| Unit II | K-Medoids, EM / GMM, Spectral Clustering |
| Unit III | more explicit theory notes for perceptron, backprop, activation-function discussion |
| Unit IV | POS tagging, HMM, stemming, lemmatization, topic modeling, LLM fine-tuning |
| Unit V | RNN, BiRNN, Encoder-Decoder, LSTM |
| Unit VI | GAN / WGAN / DCGAN / CycleGAN entirely missing |

---

## 6. Short Final Assessment

Your project has clearly moved beyond a simple notebook assignment. It now contains:
- real backend deployment
- multi-model inference
- image + tabular hybrid AI pipeline
- clustering in decision flow
- a voice assistant based on LLM infrastructure

So compared with the old syllabus audit, the project is now stronger in:
- deployed ANN / DNN work
- deployed CNN workflow
- real end-to-end AI product integration
- practical explainability and observability via `/smart-decision`

But for strict syllabus matching, the biggest gaps still remain:
- Unit IV classical NLP topics
- Unit VI GAN topics
- some Unit I / II algorithms that were never implemented

If needed later, this file can be turned into a submission-friendly version with:
- `Completed / Partial / Missing` coloring
- direct notebook section references
- a cleaner “what to claim in viva” summary
