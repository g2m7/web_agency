import type { PayloadRequest } from 'payload'

export default async function deployWebhook(req: PayloadRequest) {
  const body = await (req.text?.() ?? Promise.resolve('{}'))
  const event = JSON.parse(body)

  const payload = req.payload
  const deployId = event.id ?? ''
  const status = event.success ? 'deployed' : 'failed'
  const url = event.url ?? event.deploy_url ?? ''

  const deployments = await payload.find({
    collection: 'deployments',
    where: { preview_url: { contains: deployId } },
    limit: 1,
  })

  const deployment = deployments.docs[0]
  if (deployment) {
    await payload.update({
      collection: 'deployments',
      id: String(deployment.id),
      data: {
        status,
        deployed_at: new Date().toISOString(),
        ...(url ? { preview_url: url } : {}),
      },
    })
  }

  return Response.json({ received: true })
}
