import React, { useState } from 'react';
import {
  RefreshCw,
  Trash2,
  ExternalLink,
  Clock,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  Activity,
  ChevronDown,
  ChevronUp
} from 'lucide-react';

export default function TargetCard({ target, onProbe, onDelete }) {
  const [probing, setProbing] = useState(false);
  const [showIncidents, setShowIncidents] = useState(false);

  const isUp = target.status === 'up';
  const isPending = target.status === 'pending';

  const handleInstantProbe = async () => {
    setProbing(true);
    await onProbe(target.id);
    setTimeout(() => setProbing(false), 400);
  };

  const history = target.latencyHistory || [];
  const maxLatency = Math.max(100, ...history.map(h => h.latencyMs || 0));

  return (
    <div className="p-4 rounded-xl border border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] hover:border-[var(--md-sys-color-primary)]/50 transition-all shadow-xs flex flex-col justify-between gap-3">
      {/* Top Header */}
      <div className="flex items-start justify-between gap-2">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="relative flex items-center justify-center">
            <span
              className={`w-3 h-3 rounded-full ${
                isPending
                  ? 'bg-amber-400'
                  : isUp
                  ? 'bg-[var(--md-sys-color-success)]'
                  : 'bg-[var(--md-sys-color-error)]'
              }`}
            />
            {isUp && (
              <span className="absolute w-3 h-3 rounded-full bg-[var(--md-sys-color-success)] animate-glow pointer-events-none" />
            )}
          </div>

          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <h3 className="text-sm font-semibold text-[var(--md-sys-color-on-surface)] truncate">
                {target.name}
              </h3>
              <span
                className={`text-[10px] font-medium px-1.5 py-0.2 rounded-full uppercase tracking-wider ${
                  isPending
                    ? 'bg-amber-400/20 text-amber-300'
                    : isUp
                    ? 'bg-[var(--md-sys-color-success)]/15 text-[var(--md-sys-color-success)]'
                    : 'bg-[var(--md-sys-color-error)]/20 text-[var(--md-sys-color-error)]'
                }`}
              >
                {isPending ? 'Pending' : isUp ? 'Online' : 'Down'}
              </span>
            </div>
            <a
              href={target.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-[var(--md-sys-color-on-surface-variant)] opacity-75 hover:opacity-100 flex items-center gap-1 truncate mt-0.5"
            >
              <span className="truncate">{target.url}</span>
              <ExternalLink size={10} className="flex-shrink-0" />
            </a>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-1">
          <button
            type="button"
            onClick={handleInstantProbe}
            disabled={probing}
            className={`p-1.5 rounded-md hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-all cursor-pointer ${
              probing ? 'animate-spin text-[var(--md-sys-color-primary)]' : ''
            }`}
            title="Probe Now"
          >
            <RefreshCw size={13} />
          </button>
          <button
            type="button"
            onClick={() => onDelete(target.id)}
            className="p-1.5 rounded-md hover:bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-error)] transition-colors cursor-pointer"
            title="Delete Target"
          >
            <Trash2 size={13} />
          </button>
        </div>
      </div>

      {/* Latency Sparkline Graph */}
      <div className="space-y-1 my-1">
        <div className="flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
          <span className="flex items-center gap-1">
            <Activity size={12} className="text-[var(--md-sys-color-primary)]" />
            <span>Response History</span>
          </span>
          <span>{target.latencyMs ? `${target.latencyMs} ms` : '—'}</span>
        </div>

        <div className="h-9 w-full bg-[var(--md-sys-color-surface)]/70 rounded-lg p-1.5 flex items-end gap-1 overflow-hidden border border-[var(--md-sys-color-outline)]/40">
          {history.length === 0 ? (
            <div className="w-full h-full flex items-center justify-center text-[10px] text-[var(--md-sys-color-on-surface-variant)]/60">
              Gathering latency metrics...
            </div>
          ) : (
            history.map((pt, idx) => {
              const isPtUp = pt.status === 'up';
              const heightPercent = Math.max(15, Math.min(100, Math.round((pt.latencyMs / maxLatency) * 100)));
              return (
                <div
                  key={idx}
                  className={`flex-1 rounded-xs transition-all ${
                    isPtUp
                      ? 'bg-[var(--md-sys-color-success)] hover:opacity-80'
                      : 'bg-[var(--md-sys-color-error)] hover:opacity-80'
                  }`}
                  style={{ height: `${heightPercent}%` }}
                  title={`${isPtUp ? `${pt.latencyMs}ms` : 'Down / Timeout'} (${new Date(pt.timestamp).toLocaleTimeString()})`}
                />
              );
            })
          )}
        </div>
      </div>

      {/* Metric Badges */}
      <div className="grid grid-cols-3 gap-1.5 py-1 text-center bg-[var(--md-sys-color-surface)]/40 rounded-lg border border-[var(--md-sys-color-outline)]/30">
        <div className="p-1">
          <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Uptime</p>
          <p className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
            {target.uptimePercentage != null ? `${target.uptimePercentage}%` : '100%'}
          </p>
        </div>
        <div className="p-1 border-x border-[var(--md-sys-color-outline)]/30">
          <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Interval</p>
          <p className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
            {target.intervalSeconds}s
          </p>
        </div>
        <div className="p-1">
          <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)]">Code</p>
          <p className="text-xs font-semibold text-[var(--md-sys-color-on-surface)]">
            {target.statusCode || '—'}
          </p>
        </div>
      </div>

      {/* Error Message if Down */}
      {!isUp && !isPending && target.errorMessage && (
        <div className="p-2 rounded-lg bg-[var(--md-sys-color-error)]/15 border border-[var(--md-sys-color-error)]/30 text-xs text-[var(--md-sys-color-error)] flex items-center gap-1.5">
          <AlertTriangle size={13} className="flex-shrink-0" />
          <span className="truncate">{target.errorMessage}</span>
        </div>
      )}

      {/* Incidents Accordion Toggle */}
      {target.incidents && target.incidents.length > 0 && (
        <div className="border-t border-[var(--md-sys-color-outline)]/40 pt-2">
          <button
            type="button"
            onClick={() => setShowIncidents(!showIncidents)}
            className="w-full flex items-center justify-between text-[11px] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] cursor-pointer"
          >
            <span>{target.incidents.length} Incident{target.incidents.length > 1 ? 's' : ''}</span>
            {showIncidents ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
          </button>

          {showIncidents && (
            <div className="mt-2 space-y-1 text-[10.5px]">
              {target.incidents.slice(0, 3).map((inc, i) => (
                <div
                  key={i}
                  className="p-1.5 rounded bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]/40 flex items-center justify-between"
                >
                  <div className="flex items-center gap-1 text-[var(--md-sys-color-error)]">
                    <XCircle size={10} />
                    <span>Down: {inc.error}</span>
                  </div>
                  <span className="text-[var(--md-sys-color-on-surface-variant)] opacity-70">
                    {new Date(inc.startedAt).toLocaleTimeString()}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
