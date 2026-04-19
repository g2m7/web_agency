import type { PolicyContext, PolicyResult, PolicyAction } from '../types'
import { noDemoBeforeInterest } from './rules/index'
import { noPricingInHook } from './rules/index'
import { hookUnder80Words } from './rules/index'
import { noDiscountWithoutApproval } from './rules/index'
import { noRevenueSeoGuarantees } from './rules/index'
import { dataIsolationCheck } from './rules/index'
import { legalThreatEscalation } from './rules/index'
import { paymentBeforeLaunch } from './rules/index'
import { humanGateEmailApproval } from './rules/index'
import { humanGateDemoApproval } from './rules/index'
import { humanGateLaunch } from './rules/index'
import { scopeBoundary } from './rules/index'

interface PolicyRule {
  name: string
  appliesTo: PolicyAction[]
  check: (ctx: PolicyContext) => PolicyResult | Promise<PolicyResult>
}

const RULES: PolicyRule[] = [
  noDemoBeforeInterest,
  noPricingInHook,
  hookUnder80Words,
  noDiscountWithoutApproval,
  noRevenueSeoGuarantees,
  dataIsolationCheck,
  legalThreatEscalation,
  paymentBeforeLaunch,
  humanGateEmailApproval,
  humanGateDemoApproval,
  humanGateLaunch,
  scopeBoundary,
]

export async function runPolicyCheck(ctx: PolicyContext): Promise<PolicyResult> {
  const applicableRules = RULES.filter((rule) => rule.appliesTo.includes(ctx.action))

  if (applicableRules.length === 0) {
    return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'no_applicable_rules' }
  }

  let hasHumanApprovalRequirement = false

  for (const rule of applicableRules) {
    const result = await rule.check(ctx)

    if (result.blocked) {
      return result
    }

    if (result.requiresHumanApproval) {
      hasHumanApprovalRequirement = true
    }
  }

  if (hasHumanApprovalRequirement) {
    return {
      allowed: false,
      blocked: false,
      requiresHumanApproval: true,
      ruleName: 'human_gate',
      blockingReason: 'Action requires human approval before execution',
    }
  }

  return { allowed: true, blocked: false, requiresHumanApproval: false, ruleName: 'all_passed' }
}

export { RULES }
