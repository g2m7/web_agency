import { describe, test, expect } from 'vitest'
import { isRoleAddress, isDisposableDomain } from '../../../src/scraper/email-validator'

describe('isRoleAddress', () => {
  test('detects common role addresses', () => {
    expect(isRoleAddress('info@company.com')).toBe(true)
    expect(isRoleAddress('admin@company.com')).toBe(true)
    expect(isRoleAddress('support@company.com')).toBe(true)
    expect(isRoleAddress('sales@company.com')).toBe(true)
    expect(isRoleAddress('billing@company.com')).toBe(true)
    expect(isRoleAddress('contact@company.com')).toBe(true)
    expect(isRoleAddress('webmaster@company.com')).toBe(true)
    expect(isRoleAddress('marketing@company.com')).toBe(true)
    expect(isRoleAddress('hr@company.com')).toBe(true)
    expect(isRoleAddress('legal@company.com')).toBe(true)
  })

  test('does not flag personal addresses', () => {
    expect(isRoleAddress('john.doe@company.com')).toBe(false)
    expect(isRoleAddress('jane@company.com')).toBe(false)
    expect(isRoleAddress('mike.smith@company.com')).toBe(false)
  })

  test('is case-insensitive', () => {
    expect(isRoleAddress('INFO@company.com')).toBe(true)
    expect(isRoleAddress('Admin@company.com')).toBe(true)
  })
})

describe('isDisposableDomain', () => {
  test('detects known disposable domains', () => {
    expect(isDisposableDomain('mailinator.com')).toBe(true)
    expect(isDisposableDomain('guerrillamail.com')).toBe(true)
    expect(isDisposableDomain('tempmail.com')).toBe(true)
    expect(isDisposableDomain('yopmail.com')).toBe(true)
    expect(isDisposableDomain('maildrop.cc')).toBe(true)
  })

  test('does not flag legitimate domains', () => {
    expect(isDisposableDomain('gmail.com')).toBe(false)
    expect(isDisposableDomain('outlook.com')).toBe(false)
    expect(isDisposableDomain('company.com')).toBe(false)
    expect(isDisposableDomain('yahoo.com')).toBe(false)
  })

  test('is case-insensitive', () => {
    expect(isDisposableDomain('MAILINATOR.COM')).toBe(true)
    expect(isDisposableDomain('YopMail.com')).toBe(true)
  })
})
