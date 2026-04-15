# Delivery and Operations SOP

## Objective

Fulfill the service profitably, consistently, and fast using the AI agent for all repeatable work. The human operator handles final quality checks, escalations, and strategic decisions only.

## Delivery philosophy

The system is template-first, agent-operated, and human-supervised. Every repeated step is automated. The human intervenes only at quality gates and for edge cases.

## Hosting and domain architecture

### Hosting platform

Sites are deployed to **Cloudflare Pages** (or Vercel/Netlify as fallback). Rationale:
- Zero-config SSL
- Global CDN for fast mobile loading
- Free tier covers early clients; scales affordably
- Agent deploys via Git push or CLI — fully automatable
- Custom domains via DNS CNAME

### Domain ownership model

- **Client-owned domains (default).** The client registers and owns their domain. The agent configures DNS (CNAME to hosting) and provides instructions if the client needs to make changes themselves.
- **Agency-registered domains (exception only).** If the client cannot manage domain registration, the agency can register on the client's behalf, but the client retains beneficial ownership. Document this in the client record.

### Deployment process

1. Agent builds site from niche template + client content
2. Agent deploys to staging subdomain (e.g., `client.preview.ourdomain.com`)
3. Human reviews staging site
4. On approval, agent publishes to production:
   - If client domain: agent provides DNS instructions or configures DNS if access is granted
   - If preview subdomain: agent promotes to custom subdomain or client domain
5. Agent verifies HTTPS, checks core paths, confirms analytics firing

### Cancellation and domain transition

When a client cancels:
1. Site remains live for **7 calendar days** after cancellation effective date (grace period for client to export content)
2. Agent offers the client a static export of their site content upon request
3. If the domain is client-owned, agent removes DNS records and hosting; client points domain wherever they choose
4. If the domain is agency-registered, agent initiates domain transfer to the client within 14 days
5. After 7-day grace period, agent removes the hosted site and staging preview
6. Agent marks all client assets as archived in records

### DNS management

- Agent manages DNS for hosting purposes only (CNAME/A records pointing to hosting)
- Email DNS (MX, SPF, DKIM) remains the client's responsibility
- Agent does not modify DNS records that affect the client's email or other services

## Delivery components

Base service includes:

- Website deployment
- Hosting and uptime responsibility
- SSL and basic technical setup
- Analytics visibility
- AI chat assistant setup
- Basic content update pathway
- Ongoing support and minor changes

## Agent-driven fulfillment stages

### Stage 1: Site assembly (Agent)
- Apply the correct niche template
- Insert business content from client intake + public sources
- Adjust structure for the client's services
- Configure CTA and contact paths

### Stage 2: Feature setup (Agent)
- Attach analytics tracking
- Configure the chatbot knowledge source and fallback behavior
- Set up basic CMS fields if included in the package

### Stage 3: Automated QA (Agent)
- Check mobile layout
- Check forms and contact methods
- Check copy for obvious errors
- Check page speed basics
- Check link integrity
- Verify no other client's data is present (data isolation check)

### Stage 4: Human quality review (Human)
- Review the assembled site
- Check that business details are correct
- Verify overall quality and professionalism
- Approve for launch or flag issues for agent to fix

### Stage 5: Launch (Agent)
- Connect domain
- Verify HTTPS
- Publish
- Re-test core paths

### Stage 6: Ongoing operations (Agent)
- Handle edit requests
- Update chatbot data when needed
- Review analytics periodically
- Generate monthly reports
- Maintain uptime and address issues
- Monitor for churn signals

## Agent guardrails for delivery

The agent MUST NOT:
- Delete or overwrite a live site without human approval
- Mix content between clients (strict data isolation)
- Launch a site that has not passed the human quality review
- Make structural or design changes outside the client's package scope
- Respond to legal complaints or threats (escalate to human)
- Access or display another client's data, demos, or reports

The agent MUST:
- Run the data isolation check before every launch
- Log every change made to a client site
- Classify every support request (included / add-on / out of scope)
- Flag out-of-scope requests to the human operator
- Maintain uptime monitoring and alert the human on outages

## Capacity management rules

- Every niche has its own starter template.
- Every package has a defined monthly change allowance.
- Every request is classified as included, add-on, or out of scope.
- The retainer is never converted into unlimited development.
- Agent handles all routine edits; human handles complex or unusual requests.

## Change request triage

Agent classifies requests into:

- **Included minor edit** → agent handles immediately
- **Included scheduled update** → agent queues for batch processing
- **Add-on task** → agent sends pricing to client, waits for approval
- **Out-of-scope request** → agent declines politely and notifies human

## Delivery SLAs

Recommended targets (agent-operated):

- Initial launch: within 3–5 business days after materials received
- Minor edits: within 24 hours (agent processes throughout the day)
- Critical issue response: same day (agent detects + human reviews)

## File and asset organization

Agent maintains each client separated with:

- Brand assets
- Copy source
- Live site URL
- Domain notes
- Billing info
- Support log
- Monthly reports
- Change history

## Profit protection rules

- Never allow unpriced revisions to expand endlessly.
- Use a fixed component library.
- Reuse chatbot control logic and analytics configuration.
- Maintain a strict checklist for launch.
- Agent logs time spent per client for monitoring (even though agent time is near-zero cost).
- Monitor AI API costs per client — flag if any client consistently exceeds normal usage.
