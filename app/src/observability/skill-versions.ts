import type { Payload } from 'payload'
import crypto from 'crypto'

export async function registerSkillVersion(
  payload: Payload,
  params: {
    skillName: string
    version: string
    content: string
    deployedBy: string
    notes?: string
  },
) {
  const contentHash = crypto.createHash('sha256').update(params.content).digest('hex')

  const existing = await payload.find({
    collection: 'skill-versions',
    where: {
      and: [
        { skill_name: { equals: params.skillName } },
        { is_active: { equals: true } },
      ],
    },
    limit: 1,
  })

  if (existing.docs.length > 0) {
    const existingDoc = existing.docs[0]!
    await payload.update({
      collection: 'skill-versions',
      id: String(existingDoc.id),
      data: { is_active: false },
    })
  }

  const existingVersion = await payload.find({
    collection: 'skill-versions',
    where: {
      and: [
        { skill_name: { equals: params.skillName } },
        { version: { equals: params.version } },
      ],
    },
    limit: 1,
  })

  if (existingVersion.docs.length > 0) {
    const existingVerDoc = existingVersion.docs[0]!
    return payload.update({
      collection: 'skill-versions',
      id: String(existingVerDoc.id),
      data: {
        content_hash: contentHash,
        is_active: true,
        deployed_by: params.deployedBy,
        notes: params.notes ?? '',
      },
    })
  }

  return payload.create({
    collection: 'skill-versions',
    data: {
      skill_name: params.skillName,
      version: params.version,
      content_hash: contentHash,
      deployed_by: params.deployedBy,
      notes: params.notes ?? '',
      is_active: true,
    },
  })
}

export async function getActiveSkillVersion(payload: Payload, skillName: string): Promise<string | null> {
  const result = await payload.find({
    collection: 'skill-versions',
    where: {
      and: [
        { skill_name: { equals: skillName } },
        { is_active: { equals: true } },
      ],
    },
    limit: 1,
  })

  if (result.docs.length === 0) return null
  return (result.docs[0] as any).version
}

export async function rollbackSkillVersion(payload: Payload, skillName: string, targetVersion: string) {
  const current = await payload.find({
    collection: 'skill-versions',
    where: {
      and: [
        { skill_name: { equals: skillName } },
        { is_active: { equals: true } },
      ],
    },
    limit: 1,
  })

  if (current.docs.length > 0) {
    const currentDoc = current.docs[0]!
    await payload.update({
      collection: 'skill-versions',
      id: String(currentDoc.id),
      data: { is_active: false },
    })
  }

  const target = await payload.find({
    collection: 'skill-versions',
    where: {
      and: [
        { skill_name: { equals: skillName } },
        { version: { equals: targetVersion } },
      ],
    },
    limit: 1,
  })

  if (target.docs.length === 0) {
    throw new Error(`Version ${targetVersion} not found for skill ${skillName}`)
  }

  const targetDoc = target.docs[0]!
  return payload.update({
    collection: 'skill-versions',
    id: String(targetDoc.id),
    data: { is_active: true },
  })
}
