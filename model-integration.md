\# Model Export \& Integration Guide



Below is a complete code cell to download all trained models, followed by a detailed integration guide for your full-stack project.



\---



\## Code Cell: Download All Models



Run this cell after all training is complete. It will zip all necessary models and files for download.



```python

\# ============================================================================

\# EXPORT ALL MODELS FOR INTEGRATION

\# ============================================================================



import os

import joblib

import shutil

import tensorflow as tf

from google.colab import files



\# Create export directory

EXPORT\_DIR = "/content/exported\_models"

os.makedirs(EXPORT\_DIR, exist\_ok=True)



print("="\*80)

print("📦 EXPORTING MODELS FOR INTEGRATION")

print("="\*80)



\# 1. Crop Price Classification Model (Random Forest - best performing)

joblib.dump(classification\_models\['Random Forest'], 

&#x20;           os.path.join(EXPORT\_DIR, "crop\_price\_classifier.pkl"))

print("✅ crop\_price\_classifier.pkl - Random Forest model (99.71% accuracy)")



\# 2. Scaler for feature normalization

joblib.dump(scaler, os.path.join(EXPORT\_DIR, "feature\_scaler.pkl"))

print("✅ feature\_scaler.pkl - StandardScaler for input features")



\# 3. Feature columns list (critical for correct input order)

joblib.dump(feature\_cols, os.path.join(EXPORT\_DIR, "feature\_columns.pkl"))

print("✅ feature\_columns.pkl - List of feature names in correct order")



\# 4. ANN Model (Keras)

ann\_model.save(os.path.join(EXPORT\_DIR, "ann\_model.h5"))

print("✅ ann\_model.h5 - Artificial Neural Network (99.53% accuracy)")



\# 5. DNN Model (Keras)

dnn\_model.save(os.path.join(EXPORT\_DIR, "dnn\_model.h5"))

print("✅ dnn\_model.h5 - Deep Neural Network (63.75% accuracy)")



\# 6. VAE Model (for synthetic data generation)

vae.save\_weights(os.path.join(EXPORT\_DIR, "vae\_weights.h5"))

print("✅ vae\_weights.h5 - Variational Autoencoder weights")



\# 7. CNN Fruit Freshness Model (if trained)

try:

&#x20;   cnn\_model.save(os.path.join(EXPORT\_DIR, "fruit\_freshness\_cnn.h5"))

&#x20;   print("✅ fruit\_freshness\_cnn.h5 - CNN for fruit freshness detection")

except:

&#x20;   print("⚠️ CNN model not found - fruit freshness model not saved")



\# 8. Label encoders for categorical columns

joblib.dump(label\_encoders, os.path.join(EXPORT\_DIR, "label\_encoders.pkl"))

print("✅ label\_encoders.pkl - Label encoders for categorical features")



\# 9. K-Means clustering model

kmeans\_model = KMeans(n\_clusters=optimal\_k, random\_state=42, n\_init=10)

kmeans\_model.fit(X\_scaled)

joblib.dump(kmeans\_model, os.path.join(EXPORT\_DIR, "kmeans\_clusterer.pkl"))

print(f"✅ kmeans\_clusterer.pkl - K-Means with {optimal\_k} clusters")



\# Create zip file

zip\_path = "/content/all\_models\_export.zip"

shutil.make\_archive(zip\_path.replace(".zip", ""), 'zip', EXPORT\_DIR)



\# Download

files.download(zip\_path)



print("\\n" + "="\*80)

print("✅ All models exported and downloaded!")

print(f"📁 Download location: {zip\_path}")

print("="\*80)



\# Display contents

print("\\n📋 EXPORTED FILES:")

for f in os.listdir(EXPORT\_DIR):

&#x20;   size = os.path.getsize(os.path.join(EXPORT\_DIR, f)) / 1024

&#x20;   print(f"   • {f} ({size:.1f} KB)")

```



\---



\## Integration Guide for Full-Stack Project



This guide explains how to integrate each model into your existing codebase (Node.js backend, React frontend, or Python-based API).



\### 📦 Model Files Overview



| File | Type | Purpose |

|------|------|---------|

| `crop\_price\_classifier.pkl` | Random Forest | Predict price category (Low/Medium/High) |

| `feature\_scaler.pkl` | StandardScaler | Normalize input features |

| `feature\_columns.pkl` | List | Feature order for input |

| `ann\_model.h5` | Keras ANN | Alternative classification |

| `dnn\_model.h5` | Keras DNN | Deep learning classifier |

| `fruit\_freshness\_cnn.h5` | Keras CNN | Detect fresh/rotten fruit from image |

| `kmeans\_clusterer.pkl` | K-Means | Cluster crop data |

| `label\_encoders.pkl` | Dict | Encode categorical values |



\---



\## 1. Crop Price Classification Model (Random Forest)



\### Purpose

Predicts whether a crop will have \*\*Low, Medium, or High\*\* market price based on features like state, district, commodity, variety, etc.



\### Input Requirements



```python

\# Required input format (Python dict or JSON)

input\_data = {

&#x20;   "min\_price": 1200.0,

&#x20;   "max\_price": 1800.0,

&#x20;   "state\_encoded": 9,        # from label\_encoders\['state']

&#x20;   "district\_encoded": 149,   # from label\_encoders\['district']

&#x20;   "market\_encoded": 187,     # from label\_encoders\['market']

&#x20;   "commodity\_encoded": 95,   # from label\_encoders\['commodity']

&#x20;   "variety\_encoded": 114,    # from label\_encoders\['variety']

&#x20;   "grade\_encoded": 0,        # from label\_encoders\['grade']

&#x20;   "arrival\_date\_encoded": 0  # from label\_encoders\['arrival\_date']

}

```



\*\*Feature Order (CRITICAL):\*\* Use `feature\_columns.pkl` to know exact order.



\### Output Format



```json

{

&#x20;   "prediction": "High",

&#x20;   "prediction\_code": 2,

&#x20;   "probabilities": {

&#x20;       "Low": 0.05,

&#x20;       "Medium": 0.12,

&#x20;       "High": 0.83

&#x20;   }

}

```



\### Integration Steps (Python Backend)



```python

import joblib

import numpy as np



\# Load models

classifier = joblib.load("crop\_price\_classifier.pkl")

scaler = joblib.load("feature\_scaler.pkl")

feature\_cols = joblib.load("feature\_columns.pkl")

label\_encoders = joblib.load("label\_encoders.pkl")



def predict\_crop\_price(input\_dict):

&#x20;   # Convert input to array in correct order

&#x20;   features = \[input\_dict\[col] for col in feature\_cols]

&#x20;   features\_scaled = scaler.transform(\[features])

&#x20;   

&#x20;   prediction\_code = classifier.predict(features\_scaled)\[0]

&#x20;   probabilities = classifier.predict\_proba(features\_scaled)\[0]

&#x20;   

&#x20;   # Map code to label

&#x20;   label\_map = {0: "Low", 1: "Medium", 2: "High"}

&#x20;   

&#x20;   return {

&#x20;       "prediction": label\_map\[prediction\_code],

&#x20;       "prediction\_code": int(prediction\_code),

&#x20;       "probabilities": {

&#x20;           "Low": float(probabilities\[0]),

&#x20;           "Medium": float(probabilities\[1]),

&#x20;           "High": float(probabilities\[2])

&#x20;       }

&#x20;   }

```



\### Node.js Integration (via HTTP API)



If using Node.js, create a Python microservice or use TensorFlow.js for web. Recommended: Python Flask/FastAPI backend.



\*\*FastAPI Example:\*\*



```python

from fastapi import FastAPI

from pydantic import BaseModel



app = FastAPI()



class CropData(BaseModel):

&#x20;   min\_price: float

&#x20;   max\_price: float

&#x20;   state: str

&#x20;   district: str

&#x20;   commodity: str

&#x20;   # ... other fields



@app.post("/predict")

async def predict(data: CropData):

&#x20;   # Encode categorical fields using loaded label\_encoders

&#x20;   # Then run prediction

&#x20;   return result

```



\### Common Errors \& Solutions



| Error | Cause | Solution |

|-------|-------|----------|

| `KeyError: 'feature\_name'` | Missing feature in input | Ensure all 9 features are provided |

| `ValueError: X has 8 features, but...` | Wrong feature order | Use `feature\_columns.pkl` to order features |

| `FileNotFoundError: .pkl` | Model file missing | Check file path; re-download |

| `AttributeError: 'NoneType'` | Scaler not loaded | Load scaler with `joblib.load()` |



\---



\## 2. Fruit Freshness CNN Model



\### Purpose

Classifies fruit images as \*\*Fresh\*\* or \*\*Rotten\*\*.



\### Input

\- Image file (JPEG/PNG) - should be resized to \*\*128x128 pixels\*\*

\- RGB color channels, pixel values normalized to \[0,1]



\### Output



```json

{

&#x20;   "freshness": "Fresh",

&#x20;   "confidence": 0.97,

&#x20;   "class\_code": 0

}

```



\### Integration Code



```python

import tensorflow as tf

from tensorflow.keras.preprocessing import image

import numpy as np



cnn\_model = tf.keras.models.load\_model("fruit\_freshness\_cnn.h5")



def predict\_freshness(img\_path):

&#x20;   img = image.load\_img(img\_path, target\_size=(128, 128))

&#x20;   img\_array = image.img\_to\_array(img)

&#x20;   img\_array = np.expand\_dims(img\_array, axis=0) / 255.0

&#x20;   

&#x20;   predictions = cnn\_model.predict(img\_array)\[0]

&#x20;   class\_idx = np.argmax(predictions)

&#x20;   confidence = float(predictions\[class\_idx])

&#x20;   

&#x20;   class\_names = \['Fresh', 'Rotten']  # Adjust based on your training

&#x20;   

&#x20;   return {

&#x20;       "freshness": class\_names\[class\_idx],

&#x20;       "confidence": confidence,

&#x20;       "class\_code": int(class\_idx)

&#x20;   }

```



\### Requirements for Frontend Integration



If integrating with React/Next.js frontend:



1\. \*\*Option A (Recommended):\*\* Upload image to backend API, backend runs model

2\. \*\*Option B:\*\* Use TensorFlow.js to run model in browser (lower accuracy, larger bundle)



\*\*Backend API endpoint (FastAPI):\*\*



```python

from fastapi import File, UploadFile

import cv2

import tempfile



@app.post("/predict-fruit")

async def predict\_fruit(file: UploadFile = File(...)):

&#x20;   # Save uploaded file temporarily

&#x20;   with tempfile.NamedTemporaryFile(delete=False, suffix=".jpg") as tmp:

&#x20;       content = await file.read()

&#x20;       tmp.write(content)

&#x20;       tmp\_path = tmp.name

&#x20;   

&#x20;   result = predict\_freshness(tmp\_path)

&#x20;   os.unlink(tmp\_path)

&#x20;   return result

```



\### Common Errors



| Error | Solution |

|-------|----------|

| `Image size mismatch` | Resize to 128x128 before passing to model |

| `ValueError: Input 0 of layer...` | Ensure normalization (/255.0) |

| `Model not found` | Use absolute path or environment variable for model location |



\---



\## 3. K-Means Clustering Model



\### Purpose

Clusters crop data into segments (e.g., by price patterns, geographic regions).



\### Input

Same feature vector as classification model (9 features, scaled).



\### Output



```json

{

&#x20;   "cluster": 3,  # 0 to (k-1)

&#x20;   "cluster\_center\_distance": 12.4

}

```



\### Integration Code



```python

kmeans = joblib.load("kmeans\_clusterer.pkl")

scaler = joblib.load("feature\_scaler.pkl")



def get\_cluster(features\_list):

&#x20;   scaled = scaler.transform(\[features\_list])

&#x20;   cluster = kmeans.predict(scaled)\[0]

&#x20;   distance = kmeans.transform(scaled)\[0]\[cluster]

&#x20;   return {"cluster": int(cluster), "distance\_to\_center": float(distance)}

```



\---



\## 4. VAE Model (for Synthetic Data Generation)



\### Purpose

Generates synthetic crop data for testing or augmentation.



\### Input

Random latent vector (size 8) sampled from normal distribution.



\### Output

Generated feature vector (same dimensions as original data, unscaled).



\### Integration Code



```python

import tensorflow as tf

import numpy as np



\# Recreate VAE architecture first (same as training)

class Encoder(tf.keras.Model):

&#x20;   # ... (copy from training code)

class Decoder(tf.keras.Model):

&#x20;   # ... (copy from training code)

class VAE(tf.keras.Model):

&#x20;   # ... (copy from training code)



vae = VAE(input\_dim=len(feature\_cols), latent\_dim=8)

vae.load\_weights("vae\_weights.h5")



def generate\_synthetic\_data(n\_samples=5):

&#x20;   z = np.random.normal(size=(n\_samples, 8))

&#x20;   generated = vae.decoder(z).numpy()

&#x20;   # Inverse transform to original scale

&#x20;   original\_scale = scaler.inverse\_transform(generated)

&#x20;   return original\_scale.tolist()

```



\---



\## 5. Label Encoders for Categorical Features



\### Purpose

Convert categorical strings (state, district, commodity, etc.) to integers.



\### Usage



```python

label\_encoders = joblib.load("label\_encoders.pkl")



\# Example: encode state

state\_encoded = label\_encoders\['state'].transform(\["Madhya Pradesh"])\[0]



\# Decode back

state\_name = label\_encoders\['state'].inverse\_transform(\[state\_encoded])\[0]

```



\### Handling Unknown Categories



For unseen categories in production:



```python

def safe\_encode(encoder, value):

&#x20;   try:

&#x20;       return encoder.transform(\[value])\[0]

&#x20;   except ValueError:

&#x20;       # Use most frequent or default

&#x20;       return 0  # or use encoder.classes\_.size

```



\---



\## Recommended Backend Architecture



```

┌─────────────────┐     ┌─────────────────────────────────────┐

│   React App     │     │           Python Backend            │

│   (Frontend)    │────▶│  (FastAPI / Flask / Django)         │

└─────────────────┘     └─────────────────────────────────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                       ┌─────────────────────────────────────┐

&#x20;                       │         Model Service Layer         │

&#x20;                       │  - crop\_price\_classifier.pkl        │

&#x20;                       │  - fruit\_freshness\_cnn.h5           │

&#x20;                       │  - kmeans\_clusterer.pkl             │

&#x20;                       │  - feature\_scaler.pkl               │

&#x20;                       └─────────────────────────────────────┘

&#x20;                                     │

&#x20;                                     ▼

&#x20;                       ┌─────────────────────────────────────┐

&#x20;                       │           Database                  │

&#x20;                       │  - Store predictions                │

&#x20;                       │  - Log errors                       │

&#x20;                       └─────────────────────────────────────┘

```



\### Environment Variables to Set



```bash

MODELS\_PATH=/app/models

CROP\_CLASSIFIER\_PATH=$MODELS\_PATH/crop\_price\_classifier.pkl

CNN\_FRESHNESS\_PATH=$MODELS\_PATH/fruit\_freshness\_cnn.h5

SCALER\_PATH=$MODELS\_PATH/feature\_scaler.pkl

```



\---



\## Quick Start Script (for testing after download)



```python

\# test\_models.py

import joblib

import numpy as np



\# Load all models

classifier = joblib.load("crop\_price\_classifier.pkl")

scaler = joblib.load("feature\_scaler.pkl")

feature\_cols = joblib.load("feature\_columns.pkl")



\# Test input (use actual values from your data)

test\_input = {

&#x20;   "min\_price": 1200,

&#x20;   "max\_price": 1800,

&#x20;   "state\_encoded": 9,

&#x20;   "district\_encoded": 149,

&#x20;   "market\_encoded": 187,

&#x20;   "commodity\_encoded": 95,

&#x20;   "variety\_encoded": 114,

&#x20;   "grade\_encoded": 0,

&#x20;   "arrival\_date\_encoded": 0

}



\# Order features correctly

features = \[test\_input\[col] for col in feature\_cols]

features\_scaled = scaler.transform(\[features])



pred = classifier.predict(features\_scaled)\[0]

proba = classifier.predict\_proba(features\_scaled)\[0]



print(f"Prediction: {pred} (0=Low,1=Medium,2=High)")

print(f"Probabilities: Low={proba\[0]:.2f}, Medium={proba\[1]:.2f}, High={proba\[2]:.2f}")

```



\---



\## Summary Table



| Model | Input | Output | Framework | File Size |

|-------|-------|--------|-----------|-----------|

| Random Forest | 9 features (scaled) | Class (0-2) + probabilities | scikit-learn | \~5 MB |

| K-Means | 9 features (scaled) | Cluster ID | scikit-learn | \~2 MB |

| ANN | 9 features (scaled) | Class (0-2) | Keras/TF | \~500 KB |

| DNN | 9 features (scaled) | Class (0-2) | Keras/TF | \~200 KB |

| CNN | 128x128 RGB image | Fresh/Rotten + confidence | Keras/TF | \~10 MB |

| VAE | Random latent (8) | Synthetic features | Keras/TF | \~1 MB |



All models are now ready for integration into your full-stack project!

