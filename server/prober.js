import { readTargets, writeTargets, readSettings } from './storage.js';

let probeIntervalTimer = null;
let isProbing = false;

// Send alert webhook
async function sendWebhookAlert({ target, event, message, latencyMs }) {
  try {
    const settings = await readSettings();
    if (!settings.webhookEnabled || !settings.webhookUrl) return;

    const payload = {
      app: 'pure-ping',
      target: target.name,
      url: target.url,
      event, // 'down' | 'recovered'
      status: target.status,
      message,
      latencyMs: latencyMs || 0,
      timestamp: new Date().toISOString()
    };

    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 8000);

    await fetch(settings.webhookUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'User-Agent': 'Pure-Ping/1.0'
      },
      body: JSON.stringify(payload),
      signal: controller.signal
    });

    clearTimeout(timeout);
  } catch (err) {
    console.warn('[pure-ping] Webhook notification failed:', err.message);
  }
}

// Probe a single target
export async function probeSingleTarget(target, maxPoints = 40) {
  const start = performance.now();
  let status = 'down';
  let latencyMs = 0;
  let statusCode = 0;
  let errorMessage = '';

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), target.timeoutMs || 5000);

  try {
    const res = await fetch(target.url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Pure-Ping/1.0',
        'Cache-Control': 'no-cache'
      }
    });
    clearTimeout(timeoutId);
    latencyMs = Math.round(performance.now() - start);
    statusCode = res.status;
    status = (res.status >= 200 && res.status < 400) ? 'up' : 'down';
    if (status === 'down') {
      errorMessage = `HTTP ${res.status}`;
    }
  } catch (err) {
    clearTimeout(timeoutId);
    latencyMs = Math.round(performance.now() - start);
    status = 'down';
    errorMessage = err.name === 'AbortError' ? 'Timeout' : (err.message || 'Connection Refused');
  }

  const previousStatus = target.status;
  const nowIso = new Date().toISOString();

  // Create or append latency point
  const history = Array.isArray(target.latencyHistory) ? [...target.latencyHistory] : [];
  history.push({
    timestamp: nowIso,
    latencyMs,
    statusCode,
    status
  });
  if (history.length > maxPoints) {
    history.shift();
  }

  // Calculate rolling uptime
  const upPoints = history.filter(h => h.status === 'up').length;
  const uptimePercentage = Math.round((upPoints / history.length) * 100);

  // Manage incident log
  const incidents = Array.isArray(target.incidents) ? [...target.incidents] : [];
  if (previousStatus === 'up' && status === 'down') {
    const incident = {
      type: 'down',
      startedAt: nowIso,
      error: errorMessage
    };
    incidents.unshift(incident);
    if (incidents.length > 20) incidents.pop();
    sendWebhookAlert({ target, event: 'down', message: `Target ${target.name} went DOWN: ${errorMessage}`, latencyMs });
  } else if (previousStatus === 'down' && status === 'up') {
    if (incidents.length > 0 && !incidents[0].resolvedAt) {
      incidents[0].resolvedAt = nowIso;
    }
    sendWebhookAlert({ target, event: 'recovered', message: `Target ${target.name} RECOVERED. Latency: ${latencyMs}ms`, latencyMs });
  }

  return {
    ...target,
    status,
    statusCode,
    latencyMs,
    uptimePercentage,
    latencyHistory: history,
    incidents,
    lastChecked: nowIso,
    errorMessage: status === 'down' ? errorMessage : ''
  };
}

// Run due probes
export async function runProbeCycle() {
  if (isProbing) return;
  isProbing = true;
  try {
    const targets = await readTargets();
    const settings = await readSettings();
    const now = Date.now();
    let updated = false;

    for (let i = 0; i < targets.length; i++) {
      const target = targets[i];
      const intervalMs = (target.intervalSeconds || 30) * 1000;
      const lastCheckedMs = target.lastChecked ? new Date(target.lastChecked).getTime() : 0;

      if (now - lastCheckedMs >= intervalMs || target.status === 'pending') {
        const probed = await probeSingleTarget(target, settings.maxHistoryPoints || 40);
        targets[i] = probed;
        updated = true;
      }
    }

    if (updated) {
      await writeTargets(targets);
    }
  } catch (err) {
    console.error('[pure-ping] Probe cycle error:', err);
  } finally {
    isProbing = false;
  }
}

// Start scheduler loop
export function startProberScheduler() {
  if (probeIntervalTimer) clearInterval(probeIntervalTimer);
  // Run first cycle immediately
  runProbeCycle();
  // Check every 5 seconds for due targets
  probeIntervalTimer = setInterval(runProbeCycle, 5000);
}

export function stopProberScheduler() {
  if (probeIntervalTimer) {
    clearInterval(probeIntervalTimer);
    probeIntervalTimer = null;
  }
}
