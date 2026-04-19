const CLOUDFLARE_API = 'https://api.cloudflare.com/client/v4'

interface DeployParams {
  accountId: string
  projectName: string
  directory: string
  branch?: string
}

export async function deployToCloudflare(params: DeployParams) {
  const token = process.env.CLOUDFLARE_API_TOKEN
  if (!token) throw new Error('CLOUDFLARE_API_TOKEN not configured')

  const response = await fetch(
    `${CLOUDFLARE_API}/accounts/${params.accountId}/pages/projects/${params.projectName}/deployments`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        branch: params.branch ?? 'main',
      }),
    },
  )

  if (!response.ok) {
    const error = await response.text()
    throw new Error(`Cloudflare deploy failed: ${error}`)
  }

  return response.json()
}

export function buildPreviewUrl(projectName: string, deploymentId: string): string {
  return `https://${deploymentId}.${projectName}.pages.dev`
}
