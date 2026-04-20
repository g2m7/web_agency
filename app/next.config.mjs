import { withPayload } from '@payloadcms/next'

export default withPayload({
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
})
