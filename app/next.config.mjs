import { withPayload } from '@payloadcms/next/withPayload'

export default withPayload({
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
})
