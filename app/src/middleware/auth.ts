import crypto from 'crypto'

export function verifyWebhookSignature(payload: string, signature: string, secret: string): boolean {
  const expectedSignature = crypto.createHmac('sha256', secret).update(payload).digest('hex')
  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
}

export function verifyInternalApiKey(authHeader: string | null): boolean {
  if (!authHeader) return false
  const key = process.env.API_KEY_INTERNAL
  if (!key) return false
  if (!authHeader.startsWith('Bearer ')) return false
  return authHeader.slice(7) === key
}
