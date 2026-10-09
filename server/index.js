import express from 'express';
import cors from 'cors';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';
import dotenv from 'dotenv';
import {
  readTargets,
  writeTargets,
  readSettings,
  writeSettings
} from './storage.js';
import {
  probeSingleTarget,
  startProberScheduler,
  stopProberScheduler,
  detectProtocol
} from './prober.js';
import { generateStatusBadge } from './badge.js';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;
const APP_PASSWORD = process.env.APP_PASSWORD || process.env.PASSWORD || '';

app.use(cors());
app.use(express.json());

// Auth Middleware
function requireAuth(req, res, next) {
  if (!APP_PASSWORD) return next();
  const authHeader = req.headers.authorization;
  const token = authHeader ? authHeader.replace(/^Bearer\s+/i, '') : (req.headers['x-app-password'] || req.query.token);
  if (token === APP_PASSWORD) return next();
  return res.status(401).json({ error: 'Unauthorized: Invalid or missing password' });
}

// Health Check
app.get(['/api/health', '/ping/api/health'], (req, res) => {
  res.json({ status: 'ok', service: 'pure-ping', uptime: process.uptime(), timestamp: new Date().toISOString() });
});

// Auth Status
app.get(['/api/auth/status', '/ping/api/auth/status'], (req, res) => {
  res.json({ authRequired: Boolean(APP_PASSWORD) });
});

// Auth Verification
app.post(['/api/auth/verify', '/ping/api/auth/verify'], (req, res) => {
  const { password } = req.body;
  if (!APP_PASSWORD || password === APP_PASSWORD) {
    return res.json({ valid: true });
  }
  return res.status(401).json({ valid: false, error: 'Incorrect password' });
});

// List Targets
app.get(['/api/targets', '/ping/api/targets'], requireAuth, async (req, res) => {
  try {
    const targets = await readTargets();
    res.json(targets);
  } catch (err) {
    console.error('[pure-ping] Failed to get targets:', err);
    res.status(500).json({ error: 'Failed to retrieve targets' });
  }
});

// Add Target
app.post(['/api/targets', '/ping/api/targets'], requireAuth, async (req, res) => {
  try {
    const { name, url, intervalSeconds = 30, timeoutMs = 5000, protocol } = req.body;
    if (!name || !url) {
      return res.status(400).json({ error: 'Name and URL are required' });
    }

    const resolvedProtocol = detectProtocol(url, protocol);
    const id = name.toLowerCase().replace(/[^a-z0-9_-]+/g, '-') + '-' + Date.now().toString(36);
    const newTarget = {
      id,
      name,
      url,
      protocol: resolvedProtocol,
      intervalSeconds: parseInt(intervalSeconds, 10) || 30,
      timeoutMs: parseInt(timeoutMs, 10) || 5000,
      status: 'pending',
      uptimePercentage: 100,
      latencyHistory: [],
      incidents: [],
      createdAt: new Date().toISOString()
    };

    // Probe once right away
    const probed = await probeSingleTarget(newTarget);

    const targets = await readTargets();
    targets.push(probed);
    await writeTargets(targets);

    res.status(201).json(probed);
  } catch (err) {
    console.error('[pure-ping] Failed to create target:', err);
    res.status(500).json({ error: 'Failed to create target' });
  }
});

// Update Target
app.put(['/api/targets/:id', '/ping/api/targets/:id'], requireAuth, async (req, res) => {
  try {
    const targets = await readTargets();
    const index = targets.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const current = targets[index];
    const { name, url, intervalSeconds, timeoutMs, protocol } = req.body;

    const newUrl = url || current.url;
    const resolvedProtocol = protocol ? detectProtocol(newUrl, protocol) : (current.protocol || detectProtocol(newUrl));

    const updated = {
      ...current,
      name: name || current.name,
      url: newUrl,
      protocol: resolvedProtocol,
      intervalSeconds: intervalSeconds ? parseInt(intervalSeconds, 10) : current.intervalSeconds,
      timeoutMs: timeoutMs ? parseInt(timeoutMs, 10) : current.timeoutMs
    };

    targets[index] = updated;
    await writeTargets(targets);
    res.json(updated);
  } catch (err) {
    console.error('[pure-ping] Failed to update target:', err);
    res.status(500).json({ error: 'Failed to update target' });
  }
});

// Delete Target
app.delete(['/api/targets/:id', '/ping/api/targets/:id'], requireAuth, async (req, res) => {
  try {
    const targets = await readTargets();
    const filtered = targets.filter(t => t.id !== req.params.id);
    if (filtered.length === targets.length) {
      return res.status(404).json({ error: 'Target not found' });
    }
    await writeTargets(filtered);
    res.json({ success: true, id: req.params.id });
  } catch (err) {
    console.error('[pure-ping] Failed to delete target:', err);
    res.status(500).json({ error: 'Failed to delete target' });
  }
});

// Embeddable Status Badge (SVG) - Public endpoint (no auth required for badge embedding)
app.get([
  '/api/badge/:id.svg',
  '/ping/api/badge/:id.svg',
  '/api/badge/:id',
  '/ping/api/badge/:id',
  '/api/targets/:id/badge.svg',
  '/ping/api/targets/:id/badge.svg'
], async (req, res) => {
  try {
    const rawId = req.params.id || '';
    const id = rawId.replace(/\.svg$/i, '');
    const targets = await readTargets();
    const target = targets.find(t => t.id === id);

    const metric = req.query.metric || 'status'; // 'status' | 'uptime' | 'latency'
    const label = req.query.label || (target ? target.name : 'pure-ping');

    const svg = generateStatusBadge(
      target || { name: label, status: 'down', uptimePercentage: 0, latencyMs: 0 },
      { metric, label }
    );

    res.setHeader('Content-Type', 'image/svg+xml; charset=utf-8');
    res.setHeader('Cache-Control', 'no-cache, no-store, must-revalidate');
    res.send(svg);
  } catch (err) {
    console.error('[pure-ping] Badge generation error:', err);
    res.status(500).send('<svg xmlns="http://www.w3.org/2000/svg" width="90" height="20"><text y="14" font-size="11">error</text></svg>');
  }
});

// Instant Probe Target
app.post(['/api/targets/:id/probe', '/ping/api/targets/:id/probe'], requireAuth, async (req, res) => {
  try {
    const targets = await readTargets();
    const index = targets.findIndex(t => t.id === req.params.id);
    if (index === -1) {
      return res.status(404).json({ error: 'Target not found' });
    }

    const settings = await readSettings();
    const probed = await probeSingleTarget(targets[index], settings.maxHistoryPoints || 40);
    targets[index] = probed;
    await writeTargets(targets);
    res.json(probed);
  } catch (err) {
    console.error('[pure-ping] Instant probe error:', err);
    res.status(500).json({ error: 'Probe failed' });
  }
});

// Settings Endpoints
app.get(['/api/settings', '/ping/api/settings'], requireAuth, async (req, res) => {
  try {
    const settings = await readSettings();
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to load settings' });
  }
});

app.put(['/api/settings', '/ping/api/settings'], requireAuth, async (req, res) => {
  try {
    const { webhookUrl, webhookEnabled, maxHistoryPoints } = req.body;
    const settings = {
      webhookUrl: webhookUrl || '',
      webhookEnabled: Boolean(webhookEnabled),
      maxHistoryPoints: parseInt(maxHistoryPoints, 10) || 40
    };
    await writeSettings(settings);
    res.json(settings);
  } catch (err) {
    res.status(500).json({ error: 'Failed to save settings' });
  }
});

// Serve frontend in production
const distPath = path.join(__dirname, '..', 'dist');
if (fs.existsSync(distPath)) {
  app.use(express.static(distPath));
  app.use('/ping', express.static(distPath));

  app.get(['/', '/ping', '/ping/*'], (req, res) => {
    res.sendFile(path.join(distPath, 'index.html'));
  });
}

const server = app.listen(PORT, () => {
  console.log(`[Pure-Ping] Server running on port ${PORT}`);
  console.log(`[Pure-Ping] Auth gate: ${APP_PASSWORD ? 'ENABLED' : 'DISABLED'}`);
  startProberScheduler();
});

process.on('SIGTERM', () => {
  stopProberScheduler();
  server.close(() => process.exit(0));
});
process.on('SIGINT', () => {
  stopProberScheduler();
  server.close(() => process.exit(0));
});
