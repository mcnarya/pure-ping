import net from 'net';
import dns from 'dns/promises';
import { execFile } from 'child_process';
import { promisify } from 'util';
import { readTargets, writeTargets, readSettings } from './storage.js';

const execFileAsync = promisify(execFile);

let probeIntervalTimer = null;
let isProbing = false;

/**
 * Detect or normalize target protocol: 'http' | 'tcp' | 'dns' | 'ping'
 */
export function detectProtocol(url, specifiedProtocol) {
  if (specifiedProtocol && ['http', 'tcp', 'dns', 'ping'].includes(specifiedProtocol.toLowerCase())) {
    return specifiedProtocol.toLowerCase();
  }
  const str = (url || '').trim().toLowerCase();
  if (str.startsWith('tcp://')) return 'tcp';
  if (str.startsWith('dns://')) return 'dns';
  if (str.startsWith('ping://') || str.startsWith('icmp://')) return 'ping';
  return 'http';
}

// Send alert webhook
async function sendWebhookAlert({ target, event, message, latencyMs, protocol }) {
  try {
    const settings = await readSettings();
    if (!settings.webhookEnabled || !settings.webhookUrl) return;

    const payload = {
      app: 'pure-ping',
      target: target.name,
      url: target.url,
      protocol: protocol || target.protocol || 'http',
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

// 1. HTTP / HTTPS Probe
async function probeHttp(targetUrl, timeoutMs = 5000) {
  const start = performance.now();
  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), timeoutMs);

  let url = targetUrl.trim();
  if (!/^https?:\/\//i.test(url)) {
    url = `http://${url}`;
  }

  try {
    const res = await fetch(url, {
      method: 'GET',
      signal: controller.signal,
      headers: {
        'User-Agent': 'Pure-Ping/1.0',
        'Cache-Control': 'no-cache'
      }
    });
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    const statusCode = res.status;
    const isUp = res.status >= 200 && res.status < 400;
    return {
      status: isUp ? 'up' : 'down',
      statusCode,
      latencyMs,
      errorMessage: isUp ? '' : `HTTP ${res.status}`
    };
  } catch (err) {
    clearTimeout(timeoutId);
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: 'down',
      statusCode: 0,
      latencyMs,
      errorMessage: err.name === 'AbortError' ? 'Timeout' : (err.message || 'Connection Refused')
    };
  }
}

// 2. TCP Socket Probe
function probeTcp(targetUrl, timeoutMs = 5000) {
  return new Promise((resolve) => {
    const start = performance.now();
    const cleaned = targetUrl.replace(/^tcp:\/\//i, '').replace(/\/.*$/, '').trim();
    const lastColon = cleaned.lastIndexOf(':');

    if (lastColon === -1) {
      return resolve({
        status: 'down',
        statusCode: 0,
        latencyMs: 0,
        errorMessage: 'Invalid TCP target: host:port required'
      });
    }

    const host = cleaned.slice(0, lastColon);
    const port = parseInt(cleaned.slice(lastColon + 1), 10);

    if (!host || !port || isNaN(port)) {
      return resolve({
        status: 'down',
        statusCode: 0,
        latencyMs: 0,
        errorMessage: 'Invalid TCP port'
      });
    }

    const socket = new net.Socket();
    let resolved = false;

    const cleanup = () => {
      socket.removeAllListeners();
      socket.destroy();
    };

    socket.setTimeout(timeoutMs);

    socket.on('connect', () => {
      if (resolved) return;
      resolved = true;
      const latencyMs = Math.round(performance.now() - start);
      cleanup();
      resolve({
        status: 'up',
        statusCode: 200,
        latencyMs,
        errorMessage: ''
      });
    });

    socket.on('timeout', () => {
      if (resolved) return;
      resolved = true;
      const latencyMs = Math.round(performance.now() - start);
      cleanup();
      resolve({
        status: 'down',
        statusCode: 0,
        latencyMs,
        errorMessage: 'TCP Timeout'
      });
    });

    socket.on('error', (err) => {
      if (resolved) return;
      resolved = true;
      const latencyMs = Math.round(performance.now() - start);
      cleanup();
      resolve({
        status: 'down',
        statusCode: 0,
        latencyMs,
        errorMessage: err.code || err.message || 'TCP Refused'
      });
    });

    socket.connect(port, host);
  });
}

// 3. DNS Lookup Probe
async function probeDns(targetUrl, timeoutMs = 5000) {
  const start = performance.now();
  const cleaned = targetUrl.replace(/^dns:\/\//i, '').replace(/\/.*$/, '').split(':')[0].trim();

  if (!cleaned) {
    return {
      status: 'down',
      statusCode: 0,
      latencyMs: 0,
      errorMessage: 'Invalid hostname for DNS probe'
    };
  }

  try {
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('DNS Timeout')), timeoutMs)
    );

    const lookupPromise = dns.resolve(cleaned, 'A').catch(async () => {
      const res = await dns.lookup(cleaned);
      return [res.address];
    });

    const addresses = await Promise.race([lookupPromise, timeoutPromise]);
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: 'up',
      statusCode: 200,
      latencyMs,
      errorMessage: ''
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    return {
      status: 'down',
      statusCode: 0,
      latencyMs,
      errorMessage: err.code || err.message || 'DNS Resolution Failed'
    };
  }
}

// 4. ICMP Ping Probe
async function probeIcmp(targetUrl, timeoutMs = 5000) {
  const start = performance.now();
  const host = targetUrl.replace(/^(ping|icmp):\/\//i, '').replace(/\/.*$/, '').split(':')[0].trim();

  if (!host) {
    return {
      status: 'down',
      statusCode: 0,
      latencyMs: 0,
      errorMessage: 'Invalid host for ping probe'
    };
  }

  try {
    const { stdout } = await execFileAsync('ping', ['-c', '1', host], {
      timeout: timeoutMs
    });

    const latencyMatch = stdout.match(/time[=<]([0-9.]+)\s*ms/i) || stdout.match(/min\/avg\/max\S* =\s*[0-9.]+\/([0-9.]+)/i);
    const latencyMs = latencyMatch ? Math.round(parseFloat(latencyMatch[1])) : Math.max(1, Math.round(performance.now() - start));

    return {
      status: 'up',
      statusCode: 200,
      latencyMs,
      errorMessage: ''
    };
  } catch (err) {
    const latencyMs = Math.round(performance.now() - start);
    const errMsg = err.killed ? 'Ping Timeout' : (err.message || 'Host Unreachable');
    return {
      status: 'down',
      statusCode: 0,
      latencyMs,
      errorMessage: errMsg.includes('100% packet loss') ? 'Packet Loss (100%)' : 'Host Unreachable'
    };
  }
}

// Probe a single target
export async function probeSingleTarget(target, maxPoints = 40) {
  const protocol = detectProtocol(target.url, target.protocol);
  let result;

  if (protocol === 'tcp') {
    result = await probeTcp(target.url, target.timeoutMs || 5000);
  } else if (protocol === 'dns') {
    result = await probeDns(target.url, target.timeoutMs || 5000);
  } else if (protocol === 'ping') {
    result = await probeIcmp(target.url, target.timeoutMs || 5000);
  } else {
    result = await probeHttp(target.url, target.timeoutMs || 5000);
  }

  const { status, statusCode, latencyMs, errorMessage } = result;
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
    sendWebhookAlert({ target, event: 'down', message: `Target ${target.name} [${protocol.toUpperCase()}] went DOWN: ${errorMessage}`, latencyMs, protocol });
  } else if (previousStatus === 'down' && status === 'up') {
    if (incidents.length > 0 && !incidents[0].resolvedAt) {
      incidents[0].resolvedAt = nowIso;
    }
    sendWebhookAlert({ target, event: 'recovered', message: `Target ${target.name} [${protocol.toUpperCase()}] RECOVERED. Latency: ${latencyMs}ms`, latencyMs, protocol });
  }

  return {
    ...target,
    protocol,
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
  runProbeCycle();
  probeIntervalTimer = setInterval(runProbeCycle, 5000);
}

export function stopProberScheduler() {
  if (probeIntervalTimer) {
    clearInterval(probeIntervalTimer);
    probeIntervalTimer = null;
  }
}
