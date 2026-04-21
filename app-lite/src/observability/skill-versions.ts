import type { DbClient } from '../db'
import crypto from 'crypto'

export async function registerSkillVersion(
  db: DbClient,
  params: {
    skillName: string
    version: string
    content: string
    deployedBy: string
    notes?: string
  },
) {
  const contentHash = crypto.createHash('sha256').update(params.content).digest('hex')

  const existing = await db.find({
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
    await db.update({
      collection: 'skill-versions',
      id: String(existingDoc.id),
      data: { is_active: false },
    })
  }

  const existingVersion = await db.find({
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
    return db.update({
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

  return db.create({
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

export async function getActiveSkillVersion(db: DbClient, skillName: string): Promise<string | null> {
  const result = await db.find({
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
  return result.docs[0]!.version
}

export async function rollbackSkillVersion(db: DbClient, skillName: string, targetVersion: string) {
  const current = await db.find({
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
    await db.update({
      collection: 'skill-versions',
      id: String(currentDoc.id),
      data: { is_active: false },
    })
  }

  const target = await db.find({
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
  return db.update({
    collection: 'skill-versions',
    id: String(targetDoc.id),
    data: { is_active: true },
  })
}
