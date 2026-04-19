import type { Config } from 'payload'

export const webhookEndpoints: Config['endpoints'] = [
  {
    path: '/webhooks/dodo',
    method: 'post',
    handler: async (req) => {
      const { default: handler } = await import('./dodo')
      return handler(req)
    },
  },
  {
    path: '/webhooks/polar',
    method: 'post',
    handler: async (req) => {
      const { default: handler } = await import('./polar')
      return handler(req)
    },
  },
  {
    path: '/webhooks/resend',
    method: 'post',
    handler: async (req) => {
      const { default: handler } = await import('./resend')
      return handler(req)
    },
  },
  {
    path: '/webhooks/deploy',
    method: 'post',
    handler: async (req) => {
      const { default: handler } = await import('./deploy')
      return handler(req)
    },
  },
  {
    path: '/health',
    method: 'get',
    handler: async () => {
      return Response.json({ status: 'ok', timestamp: new Date().toISOString() })
    },
  },
]
