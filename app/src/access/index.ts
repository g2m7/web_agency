import type { Access } from 'payload'

const INTERNAL_API_KEY = process.env.API_KEY_INTERNAL

export const apiKeyOrOperator: Access = ({ req }) => {
  const authHeader = req.headers?.get('authorization') ?? req.headers?.get('Authorization') ?? ''
  if (authHeader.startsWith('Bearer ') && authHeader.slice(7) === INTERNAL_API_KEY) {
    return true
  }
  return Boolean(req.user)
}

export const operatorOnly: Access = ({ req }) => {
  return Boolean(req.user)
}

export const adminOnly: Access = ({ req }) => {
  return Boolean(req.user && (req.user as any).role === 'admin')
}

export const readOnlyOrOperator: Access = ({ req }) => {
  return Boolean(req.user)
}
