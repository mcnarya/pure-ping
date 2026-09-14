import React, { useState, useEffect, useCallback } from 'react';
import {
  Activity,
  Plus,
  RefreshCw,
  Settings,
  ShieldCheck,
  AlertCircle,
  Bell,
  CheckCircle2
} from 'lucide-react';
import TargetCard from './components/TargetCard';
import AddTargetModal from './components/AddTargetModal';
import SuiteMenu from './components/SuiteMenu';

export default function App() {
  const [targets, setTargets] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);
  const [settings, setSettings] = useState({ webhookUrl: '', webhookEnabled: false });

  // Theming
  const [theme, setTheme] = useState(() => localStorage.getItem('pure_ping_theme') || 'theme-nord');

  // Auth
  const [authRequired, setAuthRequired] = useState(false);
  const [authenticated, setAuthenticated] = useState(true);
  const [password, setPassword] = useState('');
  const [authError, setAuthError] = useState('');

  // API Base resolver
  const apiBase = typeof window !== 'undefined' && window.location.pathname.startsWith('/ping') ? '/ping/api' : '/api';

  // Apply Theme
  useEffect(() => {
    document.documentElement.className = theme;
    localStorage.setItem('pure_ping_theme', theme);
  }, [theme]);

  // PostMessage listener for Pure Hub theme sync
  useEffect(() => {
    const handleMessage = (event) => {
      if (event.data?.type === 'PURE_HUB_THEME_CHANGE' && typeof event.data.theme === 'string') {
        setTheme(event.data.theme);
      }
      if (event.data?.type === 'PURE_HUB_DYNAMIC_THEME_OVERRIDE') {
        const { primary, primaryContainer } = event.data;
        if (primary && primaryContainer) {
          document.documentElement.style.setProperty('--md-sys-color-primary', primary);
          document.documentElement.style.setProperty('--md-sys-color-primary-container', primaryContainer);
        }
      }
      if (event.data?.type === 'PURE_HUB_DYNAMIC_THEME_RESET') {
        document.documentElement.style.removeProperty('--md-sys-color-primary');
        document.documentElement.style.removeProperty('--md-sys-color-primary-container');
      }
    };
    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, []);

  const getHeaders = useCallback(() => {
    const headers = { 'Content-Type': 'application/json' };
    const token = sessionStorage.getItem('pure_ping_token');
    if (token) headers['Authorization'] = `Bearer ${token}`;
    return headers;
  }, []);

  // Check Auth
  const checkAuth = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/auth/status`);
      const data = await res.json();
      setAuthRequired(Boolean(data.authRequired));
      if (data.authRequired) {
        const savedToken = sessionStorage.getItem('pure_ping_token');
        if (savedToken) {
          const verifyRes = await fetch(`${apiBase}/auth/verify`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ password: savedToken })
          });
          setAuthenticated(verifyRes.ok);
        } else {
          setAuthenticated(false);
        }
      } else {
        setAuthenticated(true);
      }
    } catch (err) {
      console.error('[pure-ping] Auth check error:', err);
    }
  }, [apiBase]);

  // Fetch Targets
  const fetchTargets = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/targets`, { headers: getHeaders() });
      if (res.status === 401) {
        setAuthenticated(false);
        return;
      }
      if (res.ok) {
        const data = await res.json();
        setTargets(data);
      }
    } catch (err) {
      console.error('[pure-ping] Failed to load targets:', err);
    } finally {
      setLoading(false);
    }
  }, [apiBase, getHeaders]);

  // Fetch Settings
  const fetchSettings = useCallback(async () => {
    try {
      const res = await fetch(`${apiBase}/settings`, { headers: getHeaders() });
      if (res.ok) {
        const data = await res.json();
        setSettings(data);
      }
    } catch (err) {
      console.error('[pure-ping] Failed to load settings:', err);
    }
  }, [apiBase, getHeaders]);

  useEffect(() => {
    checkAuth().then(() => {
      fetchTargets();
      fetchSettings();
    });

    // Auto-refresh targets every 10 seconds
    const interval = setInterval(fetchTargets, 10000);
    return () => clearInterval(interval);
  }, [checkAuth, fetchTargets, fetchSettings]);

  // Actions
  const handleAddTarget = async (newTargetData) => {
    try {
      const res = await fetch(`${apiBase}/targets`, {
        method: 'POST',
        headers: getHeaders(),
        body: JSON.stringify(newTargetData)
      });
      if (res.ok) {
        const created = await res.json();
        setTargets(prev => [...prev, created]);
      }
    } catch (err) {
      console.error('[pure-ping] Failed to add target:', err);
    }
  };

  const handleDeleteTarget = async (id) => {
    if (!confirm('Are you sure you want to stop monitoring this target?')) return;
    try {
      const res = await fetch(`${apiBase}/targets/${id}`, {
        method: 'DELETE',
        headers: getHeaders()
      });
      if (res.ok) {
        setTargets(prev => prev.filter(t => t.id !== id));
      }
    } catch (err) {
      console.error('[pure-ping] Failed to delete target:', err);
    }
  };

  const handleInstantProbe = async (id) => {
    try {
      const res = await fetch(`${apiBase}/targets/${id}/probe`, {
        method: 'POST',
        headers: getHeaders()
      });
      if (res.ok) {
        const updated = await res.json();
        setTargets(prev => prev.map(t => t.id === id ? updated : t));
      }
    } catch (err) {
      console.error('[pure-ping] Probe error:', err);
    }
  };

  const handleSaveSettings = async (e) => {
    e.preventDefault();
    try {
      await fetch(`${apiBase}/settings`, {
        method: 'PUT',
        headers: getHeaders(),
        body: JSON.stringify(settings)
      });
      setIsSettingsOpen(false);
    } catch (err) {
      console.error('[pure-ping] Failed to save settings:', err);
    }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setAuthError('');
    try {
      const res = await fetch(`${apiBase}/auth/verify`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password })
      });
      if (res.ok) {
        sessionStorage.setItem('pure_ping_token', password);
        setAuthenticated(true);
        fetchTargets();
        fetchSettings();
      } else {
        setAuthError('Invalid password.');
      }
    } catch {
      setAuthError('Connection error.');
    }
  };

  if (authRequired && !authenticated) {
    return (
      <div className="w-screen h-screen flex items-center justify-center p-4 bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)]">
        <form onSubmit={handleLogin} className="w-full max-w-sm p-6 rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] shadow-xl space-y-4">
          <div className="text-center">
            <div className="text-3xl mb-1">⏱️</div>
            <h2 className="text-lg font-bold">Pure Ping</h2>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Enter access password</p>
          </div>
          {authError && <div className="text-xs p-2 rounded bg-[var(--md-sys-color-error)]/20 text-[var(--md-sys-color-error)]">{authError}</div>}
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className="w-full px-3 py-2 rounded-lg text-sm bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            autoFocus
          />
          <button type="submit" className="w-full py-2 rounded-lg text-sm font-medium bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-opacity">
            Unlock Pure Ping
          </button>
        </form>
      </div>
    );
  }

  const upCount = targets.filter(t => t.status === 'up').length;
  const downCount = targets.filter(t => t.status === 'down').length;
  const pendingCount = targets.filter(t => t.status === 'pending').length;
  const allUp = downCount === 0 && targets.length > 0;

  return (
    <div className="min-h-screen w-full bg-[var(--md-sys-color-background)] text-[var(--md-sys-color-on-background)] flex flex-col">
      {/* Header */}
      <header className="border-b border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)] px-6 py-4">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4 flex-wrap">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] flex items-center justify-center font-bold shadow-sm">
              ⏱️
            </div>
            <div>
              <h1 className="text-base font-bold tracking-tight">Pure Ping</h1>
              <p className="text-xs text-[var(--md-sys-color-on-surface-variant)]">Homelab Uptime & Heartbeat</p>
            </div>
          </div>

          {/* Status Capsule */}
          <div className="flex items-center gap-3">
            <div
              className={`flex items-center gap-2 px-3 py-1.5 rounded-full text-xs font-medium border ${
                allUp
                  ? 'bg-[var(--md-sys-color-success)]/10 text-[var(--md-sys-color-success)] border-[var(--md-sys-color-success)]/30'
                  : downCount > 0
                  ? 'bg-[var(--md-sys-color-error)]/10 text-[var(--md-sys-color-error)] border-[var(--md-sys-color-error)]/30'
                  : 'bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border-[var(--md-sys-color-outline)]'
              }`}
            >
              {allUp ? (
                <>
                  <CheckCircle2 size={14} />
                  <span>All Systems Operational ({upCount}/{targets.length})</span>
                </>
              ) : downCount > 0 ? (
                <>
                  <AlertCircle size={14} />
                  <span>{downCount} Service{downCount > 1 ? 's' : ''} Experiencing Issues</span>
                </>
              ) : (
                <>
                  <Activity size={14} />
                  <span>Probing Endpoints ({targets.length})</span>
                </>
              )}
            </div>

            <button
              type="button"
              onClick={fetchTargets}
              className="p-2 rounded-lg bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] transition-colors cursor-pointer"
              title="Refresh All Targets"
            >
              <RefreshCw size={15} />
            </button>

            <SuiteMenu />

            <button
              type="button"
              onClick={() => setIsSettingsOpen(true)}
              className="p-2 rounded-lg bg-[var(--md-sys-color-surface-container-high)] hover:bg-[var(--md-sys-color-primary)]/15 text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] transition-colors cursor-pointer"
              title="Webhook Settings"
            >
              <Settings size={15} />
            </button>

            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
            >
              <Plus size={15} strokeWidth={2.5} />
              <span>Add Target</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Container */}
      <main className="flex-1 max-w-6xl w-full mx-auto p-6">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-16 text-sm text-[var(--md-sys-color-on-surface-variant)] gap-2">
            <RefreshCw size={24} className="animate-spin text-[var(--md-sys-color-primary)]" />
            <span>Discovering homelab targets...</span>
          </div>
        ) : targets.length === 0 ? (
          <div className="p-12 text-center rounded-2xl border border-dashed border-[var(--md-sys-color-outline)] bg-[var(--md-sys-color-surface-container)]/40 max-w-md mx-auto my-12">
            <Activity size={32} className="mx-auto mb-3 text-[var(--md-sys-color-primary)]" />
            <h3 className="text-base font-bold">No targets monitored</h3>
            <p className="text-xs text-[var(--md-sys-color-on-surface-variant)] mt-1 mb-4">
              Add HTTP endpoints or homelab containers to start real-time heartbeat monitoring.
            </p>
            <button
              type="button"
              onClick={() => setIsAddOpen(true)}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-lg text-xs font-medium bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-opacity cursor-pointer"
            >
              <Plus size={14} />
              <span>Add First Target</span>
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {targets.map((target) => (
              <TargetCard
                key={target.id}
                target={target}
                onProbe={handleInstantProbe}
                onDelete={handleDeleteTarget}
              />
            ))}
          </div>
        )}
      </main>

      {/* Add Target Modal */}
      <AddTargetModal
        isOpen={isAddOpen}
        onClose={() => setIsAddOpen(false)}
        onAddTarget={handleAddTarget}
      />

      {/* Settings Modal */}
      {isSettingsOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
          <div className="w-full max-w-md rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
            <div className="p-4 border-b border-[var(--md-sys-color-outline)] flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Bell size={18} className="text-[var(--md-sys-color-primary)]" />
                <h2 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
                  Webhook Alert Settings
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setIsSettingsOpen(false)}
                className="p-1 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] cursor-pointer"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleSaveSettings} className="p-4 space-y-4">
              <div className="flex items-center justify-between p-3 rounded-xl bg-[var(--md-sys-color-surface)] border border-[var(--md-sys-color-outline)]">
                <div>
                  <p className="text-xs font-semibold">Enable Webhook Alerts</p>
                  <p className="text-[11px] text-[var(--md-sys-color-on-surface-variant)]">
                    Dispatches alert payloads on service downtime & recovery
                  </p>
                </div>
                <input
                  type="checkbox"
                  checked={settings.webhookEnabled}
                  onChange={(e) => setSettings({ ...settings, webhookEnabled: e.target.checked })}
                  className="w-4 h-4 cursor-pointer accent-[var(--md-sys-color-primary)]"
                />
              </div>

              <div>
                <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1">
                  Webhook URL (ntfy.sh, Discord, Telegram, or custom)
                </label>
                <input
                  type="url"
                  placeholder="https://ntfy.sh/my-homelab-alerts"
                  value={settings.webhookUrl}
                  onChange={(e) => setSettings({ ...settings, webhookUrl: e.target.value })}
                  className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] focus:outline-none focus:border-[var(--md-sys-color-primary)] font-mono"
                />
                <p className="text-[10px] text-[var(--md-sys-color-on-surface-variant)] mt-1">
                  Sends a JSON POST payload when any target transitions down or recovers.
                </p>
              </div>

              <div className="pt-2 flex items-center justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsSettingsOpen(false)}
                  className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-opacity cursor-pointer shadow-sm"
                >
                  Save Settings
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
