// ---------------------------------------------------------------------------
// Paystack transaction verification (Vercel serverless function).
// ---------------------------------------------------------------------------
// The browser must never be trusted to decide whether a payment succeeded — a
// user can call the success callback themselves or edit localStorage. Every
// payment is therefore re-checked here against Paystack using the SECRET key,
// which must only ever exist as a server environment variable.
//
// Required env var (set in Vercel → Project → Settings → Environment Variables):
//   PAYSTACK_SECRET_KEY = sk_live_... (or sk_test_... while testing)
// ---------------------------------------------------------------------------

const PAYSTACK_VERIFY_URL = 'https://api.paystack.co/transaction/verify/'

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    res.setHeader('Allow', 'POST')
    return res.status(405).json({ status: false, message: 'Method not allowed' })
  }

  const secret = process.env.PAYSTACK_SECRET_KEY
  if (!secret) {
    // Fail closed: never report a payment as verified when we cannot check it.
    return res.status(500).json({
      status: false,
      message: 'Payment verification is not configured on the server.',
    })
  }

  const { reference } = req.body || {}
  if (!reference || typeof reference !== 'string') {
    return res.status(400).json({ status: false, message: 'A transaction reference is required.' })
  }

  try {
    const response = await fetch(PAYSTACK_VERIFY_URL + encodeURIComponent(reference), {
      headers: { Authorization: `Bearer ${secret}` },
    })
    const payload = await response.json()

    if (!response.ok || !payload.status) {
      return res.status(response.status || 502).json({
        status: false,
        message: payload.message || 'Could not verify this transaction with Paystack.',
      })
    }

    const tx = payload.data
    const paid = tx.status === 'success'

    // Return only what the client needs to unlock the right thing. The amount
    // comes back in kobo; the caller checks it matches what was requested so a
    // tampered client cannot pay ₦1 for a ₦54,000 plan.
    return res.status(200).json({
      status: paid,
      message: paid ? 'Payment verified' : `Payment ${tx.status}`,
      data: {
        reference: tx.reference,
        amount: tx.amount,
        currency: tx.currency,
        paidAt: tx.paid_at,
        channel: tx.channel,
        email: tx.customer?.email,
        metadata: tx.metadata || {},
      },
    })
  } catch (err) {
    return res.status(502).json({ status: false, message: 'Could not reach Paystack.' })
  }
}
