const BASE_URL = import.meta.env.VITE_API_URL ?? 'http://localhost:8000'

/**
 * POST /predict
 * @param {number} min_price
 * @param {number} max_price
 * @returns {Promise<{ prediction: number, recommendation: 'SELL' | 'HOLD' }>}
 */
export async function fetchPrediction(min_price, max_price) {
  const response = await fetch(`${BASE_URL}/predict`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ min_price, max_price }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * POST /smart-decision — image only, prices fetched automatically
 * @param {File} imageFile
 * @param {string} cropHint  optional crop name (e.g. "apple", "wheat")
 */
export async function fetchSmartDecision(imageFile, cropHint = '') {
  const form = new FormData()
  form.append('file', imageFile)

  const url = new URL(`${BASE_URL}/smart-decision`)
  if (cropHint) url.searchParams.set('crop_hint', cropHint)

  const response = await fetch(url.toString(), { method: 'POST', body: form })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * POST /predict-image
 * @param {File} imageFile
 * @returns {Promise<{ freshness: string, confidence: number, model_version: string, latency_ms: number }>}
 */
export async function fetchPredictImage(imageFile) {
  const form = new FormData()
  form.append('file', imageFile)

  const response = await fetch(`${BASE_URL}/predict-image`, {
    method: 'POST',
    body: form,
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}

/**
 * POST /predict with explicit model_type
 * @param {number} min_price
 * @param {number} max_price
 * @param {string} model_type  random_forest | gradient_boosting | ann | best
 */
export async function fetchPredictionWithModel(min_price, max_price, model_type) {
  const url = new URL(`${BASE_URL}/predict`)
  url.searchParams.set('model_type', model_type)

  const response = await fetch(url.toString(), {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ min_price, max_price }),
  })

  if (!response.ok) {
    const error = await response.json().catch(() => ({}))
    throw new Error(error.detail || `Request failed with status ${response.status}`)
  }

  return response.json()
}
