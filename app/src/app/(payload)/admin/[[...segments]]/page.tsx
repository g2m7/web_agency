import type { ImportMap } from 'payload'

import { RootPage, generatePageMetadata } from '@payloadcms/next/views/Root/index.js'
import config from '@payload-config'

import { importMap } from '../importMap.js'

export const generateMetadata = () => {
  return generatePageMetadata({ config })
}

const Page = async (args) => {
  return (
    <RootPage
      config={Promise.resolve(config)}
      importMap={importMap}
      params={args.params}
      searchParams={args.searchParams}
    />
  )
}

export default Page
