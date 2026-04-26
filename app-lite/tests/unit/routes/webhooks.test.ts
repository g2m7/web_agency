import { beforeEach, describe, expect, it, vi } from 'vitest'
import { Hono } from 'hono'

const dbState = vi.hoisted(() => ({ current: null as any }))

vi.mock('../../../src/db', () => ({
  getDb: () => dbState.current,
}))

vi.mock('../../../src/state-machine/orchestrator', () => ({
  transitionClient: vi.fn().mockResolvedValue({ success: true }),
}))

import { dodoWebhook } from '../../../src/routes/webhooks/dodo'
import { cloudflareWebhook } from '../../../src/routes/webhooks/cloudflare'
import { transitionClient } from '../../../src/state-machine/orchestrator'

const mockedTransitionClient = vi.mocked(transitionClient)

function createMockDb(overrides: Record<string, unknown> = {}) {
  return {
    find: vi.fn().mockResolvedValue({ totalDocs: 0, docs: [] }),
    findByID: vi.fn().mockResolvedValue(null),
    create: vi.fn().mockResolvedValue({ id: 'row-1' }),
    update: vi.fn().mockResolvedValue({ id: 'row-1' }),
    delete: vi.fn().mockResolvedValue({ id: 'row-1' }),
    findGlobal: vi.fn().mockResolvedValue({}),
    updateGlobal: vi.fn().mockResolvedValue({}),
    ...overrides,
  }
}

const app = new Hono()
app.route('/webhooks/dodo', dodoWebhook)
app.route('/webhooks/cloudflare', cloudflareWebhook)

async function jsonRequest(path: string, init: RequestInit = {}) {
  const headers = new Headers(init.headers)
  if (!headers.has('content-type') && init.body) headers.set('content-type', 'application/json')
  return app.request(path, { ...init, headers })
}

describe('webhook routes', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    dbState.current = createMockDb()
  })

  it('returns already_processed for duplicate Dodo events', async () => {
    dbState.current.find.mockResolvedValueOnce({ totalDocs: 1, docs: [{ id: 'billing-1' }] })

    const res = await jsonRequest('/webhooks/dodo', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: 'evt-1',
        type: 'subscription.canceled',
        metadata: { client_id: 'client-1' },
      }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'already_processed' })
    expect(dbState.current.create).not.toHaveBeenCalled()
    expect(mockedTransitionClient).not.toHaveBeenCalled()
  })

  it('cancels active clients through the orchestrator', async () => {
    dbState.current.find.mockResolvedValueOnce({ totalDocs: 0, docs: [] })
    dbState.current.findByID.mockResolvedValueOnce({ id: 'client-2', status: 'active' })

    const res = await jsonRequest('/webhooks/dodo', {
      method: 'POST',
      body: JSON.stringify({
        idempotency_key: 'evt-2',
        type: 'subscription.canceled',
        metadata: { client_id: 'client-2' },
      }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'processed' })
    expect(dbState.current.create).toHaveBeenCalledWith({
      collection: 'billing-events',
      data: expect.objectContaining({
        client: 'client-2',
        event_type: 'subscription.canceled',
        idempotency_key: 'evt-2',
      }),
    })
    expect(mockedTransitionClient).toHaveBeenCalledWith(
      dbState.current,
      'client-2',
      'active',
      'cancelled',
      expect.objectContaining({
        triggeredBy: 'webhook:dodo',
        skipPolicy: true,
      }),
    )
  })

  it('updates already-nonactive clients directly on Dodo cancellation', async () => {
    dbState.current.find.mockResolvedValueOnce({ totalDocs: 0, docs: [] })
    dbState.current.findByID.mockResolvedValueOnce({ id: 'client-3', status: 'pending_payment' })

    const res = await jsonRequest('/webhooks/dodo', {
      method: 'POST',
      body: JSON.stringify({
        id: 'evt-3',
        type: 'subscription.cancelled',
        metadata: { client_id: 'client-3' },
        cancellation_reason: 'customer_request',
      }),
    })

    expect(res.status).toBe(200)
    expect(await res.json()).toEqual({ status: 'processed' })
    expect(dbState.current.update).toHaveBeenCalledWith({
      collection: 'clients',
      id: 'client-3',
      data: expect.objectContaining({
        status: 'cancelled',
        cancellation_reason: 'customer_request',
        cancelled_at: expect.any(String),
      }),
    })
    expect(mockedTransitionClient).not.toHaveBeenCalled()
  })

  it('handles Cloudflare deployments with missing ids and not found records', async () => {
    const missingId = await jsonRequest('/webhooks/cloudflare', {
      method: 'POST',
      body: JSON.stringify({ status: 'success' }),
    })

    dbState.current.findByID.mockRejectedValueOnce(new Error('missing'))
    const notFound = await jsonRequest('/webhooks/cloudflare', {
      method: 'POST',
      body: JSON.stringify({ metadata: { deployment_id: 'deployment-1' }, status: 'success' }),
    })

    expect(missingId.status).toBe(200)
    expect(await missingId.json()).toEqual({ status: 'no_deployment_id' })
    expect(notFound.status).toBe(404)
    expect(await notFound.json()).toEqual({ status: 'deployment_not_found' })
    expect(dbState.current.update).not.toHaveBeenCalled()
  })

  it('maps Cloudflare success and failure statuses correctly', async () => {
    dbState.current.findByID.mockResolvedValueOnce({ id: 'deployment-2', status: 'building' })
    dbState.current.findByID.mockResolvedValueOnce({ id: 'deployment-3', status: 'building' })

    const success = await jsonRequest('/webhooks/cloudflare', {
      method: 'POST',
      body: JSON.stringify({
        metadata: { deployment_id: 'deployment-2' },
        status: 'success',
        url: 'https://preview.example.dev',
      }),
    })

    const failure = await jsonRequest('/webhooks/cloudflare', {
      method: 'POST',
      body: JSON.stringify({
        metadata: { deployment_id: 'deployment-3' },
        latest_stage: { status: 'failure' },
      }),
    })

    expect(success.status).toBe(200)
    expect(await success.json()).toEqual({ status: 'processed' })
    expect(dbState.current.update).toHaveBeenNthCalledWith(1, {
      collection: 'deployments',
      id: 'deployment-2',
      data: expect.objectContaining({
        status: 'deployed',
        preview_url: 'https://preview.example.dev',
        deployed_at: expect.any(String),
      }),
    })

    expect(failure.status).toBe(200)
    expect(await failure.json()).toEqual({ status: 'processed' })
    expect(dbState.current.update).toHaveBeenNthCalledWith(2, {
      collection: 'deployments',
      id: 'deployment-3',
      data: expect.objectContaining({
        status: 'failed',
      }),
    })
  })
})
