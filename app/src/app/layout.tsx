import type { ImportMap } from 'payload'

import { RootLayout } from '@payloadcms/next/layouts/Root/index.js'
import config from '@payload-config'

import { importMap } from './(payload)/admin/importMap.js'

type Args = {
  children: React.ReactNode
}

const Layout = ({ children }: Args) => {
  return (
    <RootLayout
      config={Promise.resolve(config)}
      importMap={importMap}
      serverFunction={async function (args) {
        'use server'
        // @ts-expect-error
        const { serverFunction } = await import('./_next/server-function.js')
        return serverFunction(args)
      }}
    >
      {children}
    </RootLayout>
  )
}

export default Layout
