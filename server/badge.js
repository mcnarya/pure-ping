/**
 * Generates high-quality, crisp SVG status badges (Shields.io style)
 * for Pure Ping targets.
 */

// Heuristic calculation of text width in pixels at font-size 11px
function measureTextWidth(text) {
  if (!text) return 0;
  let width = 0;
  for (let i = 0; i < text.length; i++) {
    const ch = text[i];
    if (/[il1.,':;|!]/.test(ch)) {
      width += 4.5;
    } else if (/[mwWMQ@#%&]/.test(ch)) {
      width += 9.5;
    } else if (/[A-Z]/.test(ch)) {
      width += 7.5;
    } else if (/[0-9]/.test(ch)) {
      width += 6.5;
    } else {
      width += 6.0;
    }
  }
  return Math.ceil(width);
}

function escapeXml(unsafe) {
  if (!unsafe) return '';
  return String(unsafe)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;');
}

/**
 * Generate SVG status badge
 * @param {Object} target - The ping target
 * @param {Object} options - { metric: 'status' | 'uptime' | 'latency', label?: string }
 */
export function generateStatusBadge(target, options = {}) {
  const metric = options.metric || 'status';
  const labelText = options.label || target.name || 'pure-ping';

  let valueText = '';
  let statusColor = '#10b981'; // Emerald / Up

  if (!target || target.status === 'down') {
    statusColor = '#ef4444'; // Red / Coral / Down
  } else if (target.status === 'pending') {
    statusColor = '#64748b'; // Gray / Pending
  }

  if (metric === 'uptime') {
    const pct = target.uptimePercentage ?? 100;
    valueText = `${pct}%`;
    if (pct < 95) statusColor = '#f59e0b'; // Amber
    if (pct < 80) statusColor = '#ef4444'; // Red
  } else if (metric === 'latency') {
    valueText = target.status === 'up' ? `${target.latencyMs || 0}ms` : 'offline';
    if (target.latencyMs > 500) statusColor = '#f59e0b';
    if (target.status === 'down') statusColor = '#ef4444';
  } else {
    // Default metric: status
    valueText = target.status === 'up' ? 'up' : target.status === 'down' ? 'down' : 'pending';
  }

  const padding = 10;
  const labelWidth = measureTextWidth(labelText) + padding * 2;
  const valueWidth = measureTextWidth(valueText) + padding * 2;
  const totalWidth = labelWidth + valueWidth;

  const labelCenter = Math.round((labelWidth / 2) * 10);
  const valueCenter = Math.round((labelWidth + valueWidth / 2) * 10);

  const labelLength = measureTextWidth(labelText) * 10;
  const valueLength = measureTextWidth(valueText) * 10;

  return `<svg xmlns="http://www.w3.org/2000/svg" width="${totalWidth}" height="20" role="img" aria-label="${escapeXml(labelText)}: ${escapeXml(valueText)}">
  <title>${escapeXml(labelText)}: ${escapeXml(valueText)}</title>
  <linearGradient id="s" x2="0" y2="100%">
    <stop offset="0" stop-color="#fff" stop-opacity=".15"/>
    <stop offset="100%" stop-opacity=".1"/>
  </linearGradient>
  <clipPath id="r">
    <rect width="${totalWidth}" height="20" rx="4" fill="#fff"/>
  </clipPath>
  <g clip-path="url(#r)">
    <rect width="${labelWidth}" height="20" fill="#2e3440"/>
    <rect x="${labelWidth}" width="${valueWidth}" height="20" fill="${statusColor}"/>
    <rect width="${totalWidth}" height="20" fill="url(#s)"/>
  </g>
  <g fill="#fff" text-anchor="middle" font-family="-apple-system,BlinkMacSystemFont,Segoe UI,Helvetica,Arial,sans-serif" text-rendering="geometricPrecision" font-size="110">
    <text aria-hidden="true" x="${labelCenter}" y="150" fill="#010101" fill-opacity=".35" transform="scale(.1)" textLength="${labelLength}">${escapeXml(labelText)}</text>
    <text x="${labelCenter}" y="140" transform="scale(.1)" fill="#eceff4" textLength="${labelLength}">${escapeXml(labelText)}</text>
    <text aria-hidden="true" x="${valueCenter}" y="150" fill="#010101" fill-opacity=".35" transform="scale(.1)" textLength="${valueLength}">${escapeXml(valueText)}</text>
    <text x="${valueCenter}" y="140" transform="scale(.1)" fill="#ffffff" font-weight="bold" textLength="${valueLength}">${escapeXml(valueText)}</text>
  </g>
</svg>`;
}
