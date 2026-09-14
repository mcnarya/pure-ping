# Pure Ping ⏱️

> Featherlight, self-hosted homelab uptime, latency tracker and heartbeat monitor. Part of the **Pure** ecosystem.

## Features

- ⚡ **Featherlight Heartbeat Engine**: Non-blocking asynchronous HTTP/HTTPS probe scheduler with sub-second latency measurements.
- 📊 **Live Latency Sparklines**: Visual response time graphs and 24h rolling uptime percentage metrics.
- 🩺 **Zero-Database Persistence**: Stores monitoring targets and configurations in `/data/targets.json`.
- 🔔 **Instant Webhook Alerts**: Send alerts directly to `ntfy.sh`, Discord, Telegram, or custom webhooks when endpoints go down or recover.
- 🎯 **Pre-Seeded Pure Homelab Targets**: Automatically pre-configured to monitor Pure Hub, Pure Feed, Pure OTP, Pure Read, Pure Clone, and Pure Note.
- 🎨 **Pure Aesthetic Themes**: High-contrast Material 3 Dark, Material Light, Nord Dark, Nord Light, Dracula, Sunset, and Cyberpunk. Synced dynamically with Pure Hub.
- 🔒 **Optional Password Gate**: Protect your dashboard with `APP_PASSWORD`.
- 🐳 **Lightweight Alpine Container**: Extremely small footprint with zero external database dependencies.

---

## Quick Start

### Docker Run

```bash
docker run -d \
  --name pure-ping \
  -p 3004:3000 \
  -e APP_PASSWORD="your-secure-password" \
  -v $(pwd)/data:/data \
  pure-ping:latest
```

### Docker Compose

```yaml
services:
  pure-ping:
    image: pure-ping:latest
    container_name: pure-ping
    ports:
      - "3004:3000"
    environment:
      - APP_PASSWORD=yourpassword
      - DATA_DIR=/data
    volumes:
      - ./data:/data
    restart: unless-stopped
```

---

## Environment Variables

| Variable | Description | Default |
|---|---|---|
| `PORT` | HTTP Server Port | `3000` |
| `APP_PASSWORD` | Access gate password (optional) | *None (open)* |
| `DATA_DIR` | Directory for targets and settings JSON files | `/data` |

---

## Local Development

```bash
# 1. Install dependencies
npm install

# 2. Start Vite dev frontend (port 5175)
npm run dev

# 3. Start backend server (port 3000)
npm run start
```
