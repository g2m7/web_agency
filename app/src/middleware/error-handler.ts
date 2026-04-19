export class AppError extends Error {
  constructor(
    message: string,
    public readonly statusCode: number = 500,
    public readonly code?: string,
  ) {
    super(message)
    this.name = 'AppError'
  }
}

export class PolicyBlockedError extends AppError {
  constructor(ruleName: string, reason: string) {
    super(`Policy blocked by ${ruleName}: ${reason}`, 403, 'POLICY_BLOCKED')
    this.name = 'PolicyBlockedError'
  }
}

export class InvalidTransitionError extends AppError {
  constructor(from: string, to: string) {
    super(`Invalid state transition: ${from} → ${to}`, 400, 'INVALID_TRANSITION')
    this.name = 'InvalidTransitionError'
  }
}

export class IdempotencyConflictError extends AppError {
  constructor(key: string) {
    super(`Already processed: ${key}`, 200, 'ALREADY_PROCESSED')
    this.name = 'IdempotencyConflictError'
  }
}
