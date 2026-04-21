import { RootLayout, handleServerFunctions } from '@payloadcms/next/layouts'
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
      serverFunction={async function (clientArgs: { name: string; args: Record<string, unknown> }) {
        'use server'
        return handleServerFunctions({
          ...clientArgs,
          config: Promise.resolve(config),
          importMap,
        })
      }}
    >
      {children}
    </RootLayout>
  )
}

export default Layout
