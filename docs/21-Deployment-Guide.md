# Deployment Guide — Production VPS

Complete guide for deploying the web agency platform to a VPS with a second domain. Assumes one domain is already pointing to the VPS and you want to add a new domain for the agency app.

**Audience:** Intermediate — comfortable with SSH, Linux CLI, DNS, and basic Docker. Not a hand-holding guide; tells you what to do and why, not every `cd` and `ls`.

---

## Table of Contents

1. [Architecture Overview](#1-architecture-overview)
2. [Prerequisites](#2-prerequisites)
3. [Phase 1: DNS — Point the New Domain](#3-phase-1-dns--point-the-new-domain)
4. [Phase 2: VPS Server Setup](#4-phase-2-vps-server-setup)
5. [Phase 3: Application Docker Files](#5-phase-3-application-docker-files)
6. [Phase 4: Production Environment Config](#6-phase-4-production-environment-config)
7. [Phase 5: Nginx Reverse Proxy](#7-phase-5-nginx-reverse-proxy)
8. [Phase 6: SSL / HTTPS](#8-phase-6-ssl--https)
9. [Phase 7: First Deploy](#9-phase-7-first-deploy)
10. [Phase 8: Post-Deploy Verification](#10-phase-8-post-deploy-verification)
11. [Ongoing Operations](#11-ongoing-operations)
12. [Multi-Domain Setup](#12-multi-domain-setup)
13. [Troubleshooting](#13-troubleshooting)
14. [Master Checklist](#14-master-checklist)

---

## 1. Architecture Overview

What runs on the VPS after deployment:

```
Internet
  │
  ├─ domain-A.com (existing) ──→ Nginx server block ──→ wherever it points now (unchanged)
  │
  └─ domain-B.com (new agency) ──→ Nginx server block ──→ localhost:3006
                                                            │
                                                            ├─ app container (Next.js + Payload CMS)
                                                            ├─ postgres container
                                                            └─ redis container
```

**Stack on the VPS:**

| Component | Technology | Port |
|---|---|---|
| Reverse proxy | Nginx | 80, 443 |
| SSL | Certbot (Let's Encrypt) | — |
| App | Next.js 15 + Payload CMS 3 (Docker) | 3006 (internal only) |
| Database | PostgreSQL 15 (Docker) | 5432 (internal only) |
| Job queue | Redis 7 (Docker) | 6379 (internal only) |

No container ports are exposed to the public internet. Nginx is the only entry point.

Scope note: this deployment runs the internal operations platform. Payload is the system of record for execution and audit. If a separate CRM is later introduced, it should remain a sales interface and not replace operational state ownership in Payload.

---

## 2. Prerequisites

Before you start, have these ready:

- [ ] **VPS** running Ubuntu 22.04+ with root or sudo access
- [ ] **VPS IP address** — find with `curl -4 ifconfig.me` from the VPS
- [ ] **New domain name** registered and ready to configure DNS
- [ ] **SSH access** to the VPS (key-based preferred)
- [ ] **Resend API key** — create at [resend.com](https://resend.com), verify your sending domain
- [ ] **Repo access** — ability to `git clone` the repo on the VPS
- [ ] **Existing domain** already working on this VPS (we won't touch it)

---

## 3. Phase 1: DNS — Point the New Domain

### 3.1 Add DNS Records

At your domain registrar (or DNS provider like Cloudflare):

| Type | Name | Value | TTL |
|---|---|---|---|
| A | `@` | `YOUR_VPS_IP` | Auto / 300s |
| A | `www` | `YOUR_VPS_IP` | Auto / 300s |

If using Cloudflare, set the proxy toggle to **DNS only** (grey cloud) during setup. You can enable the orange cloud (CDN/proxy) later if desired.

### 3.2 Verify Propagation

```bash
# From your local machine
dig your-new-domain.com +short
# Should return your VPS IP

dig www.your-new-domain.com +short
# Should return your VPS IP
```

If the IP doesn't show yet, wait. Cloudflare propagates in seconds; other registrars can take up to 48 hours. Do not proceed to Phase 5 (Nginx) until DNS resolves.

---

## 4. Phase 2: VPS Server Setup

SSH into your VPS for all remaining steps.

```bash
ssh root@YOUR_VPS_IP
```

### 4.1 System Updates

```bash
sudo apt update && sudo apt upgrade -y
```

### 4.2 Install Docker

```bash
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker $USER
# Log out and back in for group to take effect, or:
newgrp docker
```

Verify:

```bash
docker --version
docker compose version
```

### 4.3 Install Nginx

```bash
sudo apt install -y nginx
sudo systemctl enable nginx
sudo systemctl start nginx
```

Verify: visit `http://YOUR_VPS_IP` — you should see the Nginx default page.

### 4.4 Install Certbot

```bash
sudo apt install -y certbot python3-certbot-nginx
```

### 4.5 Install Git

```bash
sudo apt install -y git
```

### 4.6 Clone the Repo

```bash
mkdir -p /opt/web-agency
git clone YOUR_REPO_URL /opt/web-agency
cd /opt/web-agency/app
```

If the repo is private, use a deploy key or personal access token:

```bash
git clone git@github.com:you/web-agency.git /opt/web-agency
# or
git clone https://TOKEN@github.com/you/web-agency.git /opt/web-agency
```

### 4.7 Configure Firewall

```bash
sudo ufw allow OpenSSH
sudo ufw allow 'Nginx Full'
sudo ufw --force enable
sudo ufw status
```

Should show OpenSSH and Nginx Full (80/443). Port 3006 should NOT be open.

---

## 5. Phase 3: Application Docker Files

These files should already exist in the repo. If they don't, create them now.

### 5.1 `app/Dockerfile`

```dockerfile
FROM node:20-alpine AS base
RUN corepack enable
WORKDIR /app

FROM base AS deps
COPY package.json pnpm-lock.yaml* ./
RUN pnpm install --frozen-lockfile

FROM base AS builder
COPY --from=deps /app/node_modules ./node_modules
COPY . .
RUN pnpm build

FROM base AS runner
ENV NODE_ENV=production
WORKDIR /app

COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/.next/static ./.next/static
COPY --from=builder /app/public ./public

EXPOSE 3006
ENV PORT=3006
ENV HOSTNAME="0.0.0.0"

CMD ["node", "server.js"]
```

### 5.2 `app/next.config.mjs`

The `output: 'standalone'` flag is required for the Dockerfile to work. It tells Next.js to produce a self-contained build in `.next/standalone/`.

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  experimental: {
    serverActions: {
      bodySizeLimit: '2mb',
    },
  },
}

export default nextConfig
```

### 5.3 `app/docker-compose.prod.yml`

This is separate from the dev `docker-compose.yml` (which uses the `dev` profile for Postgres/Redis only).

```yaml
services:
  app:
    build: .
    ports:
      - "127.0.0.1:3006:3006"
    env_file: .env
    depends_on:
      postgres:
        condition: service_healthy
      redis:
        condition: service_healthy
    restart: unless-stopped
    healthcheck:
      test: ["CMD-SHELL", "wget -qO- http://localhost:3006/api/access || exit 1"]
      interval: 30s
      timeout: 10s
      retries: 3
      start_period: 30s

  postgres:
    image: postgres:15-alpine
    environment:
      POSTGRES_DB: ${DB_NAME:-web_agency}
      POSTGRES_USER: ${DB_USER:-web_agency}
      POSTGRES_PASSWORD: ${DB_PASSWORD:?Set DB_PASSWORD in .env}
    volumes:
      - pgdata:/var/lib/postgresql/data
    healthcheck:
      test: ["CMD-SHELL", "pg_isready -U ${DB_USER:-web_agency}"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    # No ports exposed — only accessible from other containers

  redis:
    image: redis:7-alpine
    volumes:
      - redisdata:/data
    healthcheck:
      test: ["CMD", "redis-cli", "ping"]
      interval: 5s
      timeout: 5s
      retries: 5
    restart: unless-stopped
    # No ports exposed — only accessible from other containers

volumes:
  pgdata:
  redisdata:
```

**Key decisions explained:**

- **`127.0.0.1:3006:3006`** — binds the app port to localhost only. Nginx on the same machine proxies to it. The app is never directly accessible from the internet.
- **Postgres and Redis have no `ports`** — they're only reachable from other Docker containers via the internal Docker network. This is correct for production; you don't want your database on the public internet.
- **`DB_PASSWORD:?$}`** — Docker Compose will refuse to start if `DB_PASSWORD` is not set in `.env`. Catches misconfiguration early.
- **`restart: unless-stopped`** — containers auto-restart on crash or VPS reboot.

---

## 6. Phase 4: Production Environment Config

### 6.1 Create the `.env` File

```bash
cd /opt/web-agency/app
cp .env.example .env
nano .env
```

### 6.2 Required Values

Edit `.env` with production values:

```bash
# ─── Core ───────────────────────────────────────────
PAYLOAD_SECRET=<run: openssl rand -hex 32>
DATABASE_URL=postgres://web_agency:<STRONG_PASSWORD>@postgres:5432/web_agency
NEXT_PUBLIC_SERVER_URL=https://your-new-domain.com
PORT=3006
NODE_ENV=production

# ─── Docker Compose vars ────────────────────────────
DB_NAME=web_agency
DB_USER=web_agency
DB_PASSWORD=<STRONG_PASSWORD>   # must match DATABASE_URL password

# ─── Redis ──────────────────────────────────────────
REDIS_URL=redis://redis:6379    # "redis" is the container hostname

# ─── Email ──────────────────────────────────────────
RESEND_API_KEY=re_xxxxxxxx      # real key from resend.com

# ─── Payments ───────────────────────────────────────
DODO_API_KEY=
DODO_WEBHOOK_SECRET=
POLAR_API_KEY=
POLAR_WEBHOOK_SECRET=

# ─── Deployment ─────────────────────────────────────
CLOUDFLARE_API_TOKEN=
CLOUDFLARE_ACCOUNT_ID=

# ─── Auth ───────────────────────────────────────────
API_KEY_INTERNAL=<run: openssl rand -hex 32>

# ─── Monitoring ─────────────────────────────────────
UPTIME_ROBOT_API_KEY=
ALERT_EMAIL_TO=you@yourdomain.com
ALERT_EMAIL_FROM=alerts@your-new-domain.com
```

### 6.3 Critical Differences from Local Dev

| Variable | Local dev | Production |
|---|---|---|
| `DATABASE_URL` host | `localhost` | `postgres` (Docker container name) |
| `REDIS_URL` host | `localhost` | `redis` (Docker container name) |
| `NEXT_PUBLIC_SERVER_URL` | `http://localhost:3006` | `https://your-new-domain.com` |
| `NODE_ENV` | `development` | `production` |
| `PAYLOAD_SECRET` | anything | cryptographically random |
| `DB_PASSWORD` | `web_agency` | strong generated password |

### 6.4 Generate Secrets

```bash
# Generate all secrets at once
echo "PAYLOAD_SECRET=$(openssl rand -hex 32)"
echo "API_KEY_INTERNAL=$(openssl rand -hex 32)"
echo "DB_PASSWORD=$(openssl rand -hex 16)"
```

Copy the output into your `.env` file. Make sure `DB_PASSWORD` matches in both `DATABASE_URL` and the `DB_PASSWORD` variable.

### 6.5 Protect the `.env` File

```bash
chmod 600 /opt/web-agency/app/.env
```

---

## 7. Phase 5: Nginx Reverse Proxy

### 7.1 Create the Server Block

```bash
sudo nano /etc/nginx/sites-available/your-new-domain.com
```

Paste:

```nginx
server {
    listen 80;
    listen [::]:80;
    server_name your-new-domain.com www.your-new-domain.com;

    # Security headers
    add_header X-Frame-Options "SAMEORIGIN" always;
    add_header X-Content-Type-Options "nosniff" always;
    add_header X-XSS-Protection "1; mode=block" always;
    add_header Referrer-Policy "strict-origin-when-cross-origin" always;

    # Payload CMS admin and API
    location / {
        proxy_pass http://127.0.0.1:3006;
        proxy_http_version 1.1;

        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection "upgrade";
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;

        proxy_cache_bypass $http_upgrade;
        proxy_read_timeout 300s;
        proxy_connect_timeout 75s;

        # Max upload size for Payload CMS media
        client_max_body_size 10M;
    }
}
```

### 7.2 Enable the Site

```bash
sudo ln -s /etc/nginx/sites-available/your-new-domain.com /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default  # only if you don't need the default site
sudo nginx -t
```

You should see `syntax is ok` and `test is successful`.

### 7.3 Reload Nginx

```bash
sudo systemctl reload nginx
```

### 7.4 Your Existing Domain

Your existing domain's config lives in its own file under `/etc/nginx/sites-available/`. Nginx serves both domains independently — each is a separate `server {}` block. Adding the new domain does not affect the existing one.

Verify:

```bash
ls /etc/nginx/sites-enabled/
# Should show both your-existing-domain and your-new-domain
```

---

## 8. Phase 6: SSL / HTTPS

### 8.1 Obtain Certificate

```bash
sudo certbot --nginx -d your-new-domain.com -d www.your-new-domain.com
```

Certbot will:
1. Verify domain ownership via the HTTP challenge (your DNS must already resolve)
2. Obtain a certificate from Let's Encrypt
3. Automatically modify your Nginx config to use HTTPS
4. Set up automatic renewal via a systemd timer

### 8.2 Verify Auto-Renewal

```bash
sudo certbot renew --dry-run
```

This should complete without errors. Let's Encrypt certificates expire every 90 days; Certbot's timer auto-renews them.

### 8.3 Verify HTTPS

```bash
curl -I https://your-new-domain.com
# Should return HTTP/2 200 or similar, not a connection error
```

At this point, the app isn't running yet so you'll get a 502 Bad Gateway. That's expected — we fix that in Phase 7.

---

## 9. Phase 7: First Deploy

### 9.1 Build and Start Containers

```bash
cd /opt/web-agency/app
docker compose -f docker-compose.prod.yml up -d --build
```

This:
- Builds the app Docker image (installs deps, runs `next build`)
- Starts Postgres, waits for it to be healthy
- Starts Redis, waits for it to be healthy
- Starts the app container

First build takes 2-5 minutes depending on VPS specs.

### 9.2 Watch the Logs

```bash
docker compose -f docker-compose.prod.yml logs -f app
```

Look for:
- `✓ Ready in Xms` or `Listening on port 3006` — app started
- Payload CMS migration messages — database tables created
- No `ECONNREFUSED` errors — all services connected

Press `Ctrl+C` to stop watching logs (containers keep running).

### 9.3 Run Payload Migrations

```bash
docker compose -f docker-compose.prod.yml exec app npx payload migrate
```

This creates/updates all database tables from the Payload collection definitions. Run this on every deploy after the first one too.

### 9.4 Create Admin User

1. Open `https://your-new-domain.com/admin` in your browser
2. Payload's first-run setup screen appears
3. Create your operator admin account
4. Save these credentials securely — this is the human operator account

---

## 10. Phase 8: Post-Deploy Verification

Run through every item:

### 10.1 Service Health

```bash
# All three containers should be "Up"
docker compose -f docker-compose.prod.yml ps

# App responds on localhost
curl -s -o /dev/null -w "%{http_code}" http://localhost:3006
# Should return 200

# HTTPS works through Nginx
curl -s -o /dev/null -w "%{http_code}" https://your-new-domain.com
# Should return 200
```

### 10.2 Payload Admin

- [ ] `https://your-new-domain.com/admin` loads the admin panel
- [ ] You can log in with the operator account
- [ ] All 11 collections appear in the sidebar (Leads, Clients, Interactions, ClientInteractions, Deployments, BillingEvents, Jobs, PolicyChecks, PipelineEvents, SkillVersions, Operators)
- [ ] `SystemConfig` appears under "Globals"

### 10.3 API Access

```bash
# Payload API responds
curl -s https://your-new-domain.com/api/access
# Should return JSON with user permissions
```

### 10.4 Database Connectivity

```bash
docker compose -f docker-compose.prod.yml exec postgres \
  psql -U web_agency -d web_agency -c "\dt"
# Should list all Payload tables
```

### 10.5 Redis Connectivity

```bash
docker compose -f docker-compose.prod.yml exec redis redis-cli ping
# Should return PONG
```

### 10.6 Security

- [ ] `http://your-new-domain.com` redirects to `https://` (Certbot handles this)
- [ ] `https://your-new-domain.com:3006` does NOT connect (app not exposed)
- [ ] `https://your-new-domain.com:5432` does NOT connect (postgres not exposed)
- [ ] `https://your-new-domain.com:6379` does NOT connect (redis not exposed)
- [ ] Response headers include `X-Frame-Options`, `X-Content-Type-Options`

---

## 11. Ongoing Operations

### 11.1 Deploy Updates

From the VPS:

```bash
cd /opt/web-agency
git pull origin main
cd app
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx payload migrate
```

### 11.2 View Logs

```bash
# All services
docker compose -f docker-compose.prod.yml logs -f

# App only
docker compose -f docker-compose.prod.yml logs -f app

# Last 100 lines
docker compose -f docker-compose.prod.yml logs --tail 100 app
```

### 11.3 Restart a Service

```bash
docker compose -f docker-compose.prod.yml restart app
```

### 11.4 Database Backup

```bash
# One-time manual backup
docker compose -f docker-compose.prod.yml exec postgres \
  pg_dump -U web_agency web_agency > backup_$(date +%Y%m%d_%H%M%S).sql

# Restore from backup
cat backup_20260420_120000.sql | docker compose -f docker-compose.prod.yml exec -T postgres \
  psql -U web_agency web_agency
```

For automated daily backups, add a cron job:

```bash
# Edit crontab
crontab -e

# Add this line for daily 3am backups (keeps last 30 days)
0 3 * * * docker compose -f /opt/web-agency/app/docker-compose.prod.yml exec -T postgres pg_dump -U web_agency web_agency | gzip > /opt/web-agency/backups/db_$(date +\%Y\%m\%d).sql.gz && find /opt/web-agency/backups/ -name "*.sql.gz" -mtime +30 -delete
```

Create the backups directory first:

```bash
mkdir -p /opt/web-agency/backups
```

### 11.5 Monitor Disk Usage

```bash
df -h
docker system df
```

### 11.6 Update SSL Certificate

Certbot auto-renews, but verify:

```bash
sudo certbot certificates
```

### 11.7 View Resource Usage

```bash
docker stats --no-stream
```

---

## 12. Multi-Domain Setup

Your VPS now serves two domains. Here's how they coexist:

### 12.1 How Nginx Routes Traffic

Nginx uses the `Host` header in incoming HTTP requests to route to the correct `server {}` block:

```
Incoming request for domain-A.com
  → Nginx matches server block with server_name domain-A.com
  → Proxies to wherever domain-A's config points

Incoming request for domain-B.com (your-new-domain.com)
  → Nginx matches server block with server_name domain-B.com
  → Proxies to 127.0.0.1:3006 (the agency app)
```

### 12.2 Verify Both Domains

```bash
# Existing domain (should still work as before)
curl -s -o /dev/null -w "%{http_code}" https://your-existing-domain.com

# New agency domain
curl -s -o /dev/null -w "%{http_code}" https://your-new-domain.com
```

Both should return 200.

### 12.3 Adding More Domains Later

To add a third domain, repeat Phase 1 (DNS), Phase 5 (Nginx server block), and Phase 6 (SSL). Each domain gets its own `/etc/nginx/sites-available/` config file pointing to wherever it needs to go.

---

## 13. Troubleshooting

### 502 Bad Gateway

Nginx can't reach the app on port 3006.

```bash
# Is the app container running?
docker compose -f docker-compose.prod.yml ps

# Check app logs for crash
docker compose -f docker-compose.prod.yml logs --tail 50 app

# Common causes:
# - App crashed during startup → check logs for the error
# - DATABASE_URL wrong → check .env, ensure host is "postgres" not "localhost"
# - Build failed → rebuild with: docker compose -f docker-compose.prod.yml up -d --build
```

### Container Keeps Restarting

```bash
docker compose -f docker-compose.prod.yml logs app --tail 100
```

Common causes:
- Wrong `DATABASE_URL` or `REDIS_URL`
- Missing required env var (check `.env` against `.env.example`)
- `PAYLOAD_SECRET` not set

### Can't Connect to HTTPS

```bash
# Is Nginx running?
sudo systemctl status nginx

# Is the SSL cert valid?
sudo certbot certificates

# Check Nginx config for errors
sudo nginx -t
```

### Database Connection Refused

```bash
# Is postgres healthy?
docker compose -f docker-compose.prod.yml ps postgres

# Can the app container reach postgres?
docker compose -f docker-compose.prod.yml exec app wget -qO- postgres:5432 || echo "can't reach"

# Common cause: DATABASE_URL uses "localhost" instead of "postgres"
```

### Redis Connection Refused

Same pattern as postgres — ensure `REDIS_URL` uses `redis` as the hostname, not `localhost`.

### Build Fails in Docker

```bash
# Build with full output
docker compose -f docker-compose.prod.yml build --no-cache --progress plain app
```

Common causes:
- `pnpm-lock.yaml` out of date → run `pnpm install` locally, commit the lockfile, push, pull on VPS
- Missing `output: 'standalone'` in `next.config.mjs`
- TypeScript errors → run `npx tsc --noEmit` locally before pushing

### Payload Migrations Fail

```bash
# Check if the database is actually reachable
docker compose -f docker-compose.prod.yml exec postgres psql -U web_agency -d web_agency -c "SELECT 1"

# If the database is fresh and migrations fail, try:
docker compose -f docker-compose.prod.yml exec app npx payload migrate:create initial-setup
docker compose -f docker-compose.prod.yml exec app npx payload migrate
```

---

## 14. Master Checklist

Print this out or copy it somewhere. Check off each item as you go.

### DNS
- [ ] A record `@` pointing to VPS IP
- [ ] A record `www` pointing to VPS IP
- [ ] DNS propagation verified with `dig`

### VPS Setup
- [ ] System packages updated
- [ ] Docker installed and verified
- [ ] Nginx installed and running
- [ ] Certbot installed
- [ ] Git installed
- [ ] Repo cloned to `/opt/web-agency`
- [ ] UFW firewall configured (SSH + Nginx Full only)

### Application Files
- [ ] `app/Dockerfile` exists in repo
- [ ] `app/docker-compose.prod.yml` exists in repo
- [ ] `app/next.config.mjs` has `output: 'standalone'`
- [ ] All files committed and pushed to remote

### Environment Config
- [ ] `/opt/web-agency/app/.env` created from `.env.example`
- [ ] `PAYLOAD_SECRET` set to a random 64-char hex string
- [ ] `DATABASE_URL` uses `postgres` as host (not `localhost`)
- [ ] `REDIS_URL` uses `redis` as host (not `localhost`)
- [ ] `DB_PASSWORD` matches the password in `DATABASE_URL`
- [ ] `NEXT_PUBLIC_SERVER_URL` set to `https://your-new-domain.com`
- [ ] `NODE_ENV` set to `production`
- [ ] `API_KEY_INTERNAL` set to a random string
- [ ] `RESEND_API_KEY` set to a real key (or placeholder if not ready yet)
- [ ] `.env` file permissions set to 600

### Nginx
- [ ] Server block created in `/etc/nginx/sites-available/`
- [ ] Symlinked to `/etc/nginx/sites-enabled/`
- [ ] `server_name` matches the new domain (with and without `www`)
- [ ] Proxy pass points to `http://127.0.0.1:3006`
- [ ] `nginx -t` passes
- [ ] Nginx reloaded
- [ ] Existing domain's config still present and working

### SSL
- [ ] Certificate obtained with `certbot --nginx`
- [ ] Both `your-new-domain.com` and `www.your-new-domain.com` covered
- [ ] `certbot renew --dry-run` succeeds
- [ ] HTTP redirects to HTTPS

### Deploy
- [ ] `docker compose -f docker-compose.prod.yml up -d --build` succeeds
- [ ] All three containers show "Up" in `docker compose ps`
- [ ] `docker compose logs app` shows successful startup
- [ ] Payload migrations run successfully
- [ ] Admin panel accessible at `https://your-new-domain.com/admin`
- [ ] Operator admin account created
- [ ] All 11 collections visible in admin sidebar
- [ ] `SystemConfig` global visible in sidebar

### Security Verification
- [ ] `https://your-new-domain.com` returns 200
- [ ] Port 3006 not accessible from outside (test: `https://domain:3006` — should fail)
- [ ] Port 5432 not accessible from outside
- [ ] Port 6379 not accessible from outside
- [ ] Security headers present in response
- [ ] Existing domain still works as before

### Post-Deploy
- [ ] Database backup cron job set up
- [ ] Backups directory created at `/opt/web-agency/backups`
- [ ] Deployment notes saved (IP, domain, admin email, where secrets are stored)

---

## Appendix A: Quick Reference Commands

```bash
# Deploy
cd /opt/web-agency && git pull && cd app
docker compose -f docker-compose.prod.yml up -d --build
docker compose -f docker-compose.prod.yml exec app npx payload migrate

# Logs
docker compose -f docker-compose.prod.yml logs -f app

# Restart
docker compose -f docker-compose.prod.yml restart app

# Stop everything
docker compose -f docker-compose.prod.yml down

# Database backup
docker compose -f docker-compose.prod.yml exec -T postgres \
  pg_dump -U web_agency web_agency | gzip > backup_$(date +%Y%m%d).sql.gz

# SSL renew check
sudo certbot renew --dry-run

# Nginx reload after config change
sudo nginx -t && sudo systemctl reload nginx
```

## Appendix B: File Locations on the VPS

| Path | Purpose |
|---|---|
| `/opt/web-agency/` | Repo root |
| `/opt/web-agency/app/` | Application code |
| `/opt/web-agency/app/.env` | Production environment variables |
| `/opt/web-agency/backups/` | Database backups |
| `/etc/nginx/sites-available/your-new-domain.com` | Nginx config |
| `/etc/nginx/sites-enabled/your-new-domain.com` | Symlink to config |
| `/etc/letsencrypt/live/your-new-domain.com/` | SSL certificates |

## Appendix C: Port Map

| Port | Service | Exposed to Internet |
|---|---|---|
| 80 | Nginx (HTTP → redirects to HTTPS) | Yes |
| 443 | Nginx (HTTPS) | Yes |
| 3006 | Next.js app | No — localhost only |
| 5432 | PostgreSQL | No — Docker internal only |
| 6379 | Redis | No — Docker internal only |
