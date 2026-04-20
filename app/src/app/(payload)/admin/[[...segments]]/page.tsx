import { RootPage, generatePageMetadata } from '@payloadcms/next/views'
import config from '@payload-config'

import { importMap } from '../importMap.js'

export const generateMetadata = () => {
  return generatePageMetadata({ config })
}

const Page = async (args: {
  params: Promise<{ segments: string[] }>
  searchParams: Promise<{ [key: string]: string | string[] }>
}) => {
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
