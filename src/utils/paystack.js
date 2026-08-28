// ---------------------------------------------------------------------------
// Paystack — the single payment path for the whole app.
// ---------------------------------------------------------------------------
// Flow for every charge:
//   1. Open the Paystack popup with the PUBLIC key (safe in the browser).
//   2. Paystack returns a reference.
//   3. Ask our own /api/paystack/verify to re-check that reference with the
//      SECRET key, server-side, and confirm the amount actually paid.
//   4. Only then unlock whatever was bought.
//
// Step 3 is what makes this safe. Without it a user can invoke the success
// callback from the console and get the product for free.
//
// Env: VITE_PAYSTACK_PUBLIC_KEY = pk_live_... (or pk_test_... while testing)
// ---------------------------------------------------------------------------

const INLINE_SRC = 'https://js.paystack.co/v2/inline.js'

export const PUBLIC_KEY = import.meta.env.VITE_PAYSTACK_PUBLIC_KEY || ''

/** Paystack works in kobo. Everything in this app is quoted in naira. */
export function toKobo(naira) {
  return Math.round(Number(naira) * 100)
}

export function isConfigured() {
  return Boolean(PUBLIC_KEY)
}

let scriptPromise = null

function loadInline() {
  if (typeof window === 'undefined') return Promise.reject(new Error('No browser'))
  if (window.PaystackPop) return Promise.resolve(window.PaystackPop)
  if (scriptPromise) return scriptPromise

  scriptPromise = new Promise((resolve, reject) => {
    const existing = document.querySelector(`script[src="${INLINE_SRC}"]`)
    const script = existing || document.createElement('script')
    script.src = INLINE_SRC
    script.async = true
    script.onload = () =>
      window.PaystackPop ? resolve(window.PaystackPop) : reject(new Error('Paystack failed to load'))
    script.onerror = () => {
      scriptPromise = null
      reject(new Error('Could not reach Paystack. Check your connection and try again.'))
    }
    if (!existing) document.head.appendChild(script)
  })
  return scriptPromise
}

/** Unique, traceable reference. The purpose prefix makes reconciliation easy. */
export function makeReference(purpose) {
  const rand = Math.random().toString(36).slice(2, 8).toUpperCase()
  return `${purpose}-${Date.now().toString(36).toUpperCase()}-${rand}`
}

/**
 * Confirm with our server that a reference really was paid, and for the amount
 * we asked for. Fails closed on any error.
 */
export async function verifyPayment(reference, expectedNaira) {
  try {
    const res = await fetch('/api/paystack/verify', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ reference }),
    })
    const payload = await res.json()

    if (!res.ok || !payload.status) {
      return { ok: false, error: payload.message || 'Payment could not be verified.' }
    }
    // Guard against a tampered client paying less than the asking price.
    if (expectedNaira != null && payload.data.amount < toKobo(expectedNaira)) {
      return { ok: false, error: 'The amount paid is less than the amount due.' }
    }
    return { ok: true, data: payload.data }
  } catch {
    return { ok: false, error: 'Could not reach the payment server.' }
  }
}

/**
 * Open the Paystack popup and resolve once the payment is verified server-side.
 *
 * Resolves { ok: true, reference, data } or { ok: false, error, cancelled }.
 */
export async function pay({ email, amountNaira, purpose = 'TXN', metadata = {} }) {
  if (!isConfigured()) {
    return {
      ok: false,
      error: 'Payments are not configured. Set VITE_PAYSTACK_PUBLIC_KEY and redeploy.',
    }
  }
  if (!email) return { ok: false, error: 'An email address is required to take payment.' }
  if (!(Number(amountNaira) > 0)) return { ok: false, error: 'Invalid amount.' }

  let PaystackPop
  try {
    PaystackPop = await loadInline()
  } catch (e) {
    return { ok: false, error: e.message }
  }

  const reference = makeReference(purpose)

  const outcome = await new Promise((resolve) => {
    try {
      const popup = new PaystackPop()
      popup.newTransaction({
        key: PUBLIC_KEY,
        email,
        amount: toKobo(amountNaira),
        reference,
        currency: 'NGN',
        metadata: { purpose, ...metadata },
        onSuccess: (tx) => resolve({ ok: true, reference: tx?.reference || reference }),
        onCancel: () => resolve({ ok: false, cancelled: true, error: 'Payment cancelled.' }),
        onError: (err) => resolve({ ok: false, error: err?.message || 'Payment failed.' }),
      })
    } catch (e) {
      resolve({ ok: false, error: e.message || 'Could not open the payment window.' })
    }
  })

  if (!outcome.ok) return outcome

  // Never trust the popup's success callback on its own.
  const verified = await verifyPayment(outcome.reference, amountNaira)
  if (!verified.ok) return { ok: false, error: verified.error, reference: outcome.reference }

  return { ok: true, reference: outcome.reference, data: verified.data }
}
