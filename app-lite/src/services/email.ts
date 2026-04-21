import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

interface SendEmailParams {
  to: string
  subject: string
  html: string
  from?: string
}

export async function sendEmail(params: SendEmailParams) {
  const from = params.from ?? process.env.ALERT_EMAIL_FROM ?? 'noreply@yourdomain.com'
  const result = await resend.emails.send({
    from,
    to: params.to,
    subject: params.subject,
    html: params.html,
  })
  return result
}

export async function sendAlert(subject: string, body: string) {
  const alertTo = process.env.ALERT_EMAIL_TO
  if (!alertTo) return
  return sendEmail({ to: alertTo, subject, html: `<p>${body}</p>` })
}
