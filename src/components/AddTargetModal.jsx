import React, { useState } from 'react';
import { X, Plus, Server } from 'lucide-react';

export default function AddTargetModal({ isOpen, onClose, onAddTarget }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [intervalSeconds, setIntervalSeconds] = useState(30);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !url) return;
    onAddTarget({ name, url, intervalSeconds });
    setName('');
    setUrl('');
    setIntervalSeconds(30);
    onClose();
  };

  const presets = [
    { name: 'Pure Hub', url: 'http://pure-app:80/' },
    { name: 'Pure Feed', url: 'http://pure-feed:3000/api/health/live' },
    { name: 'Pure OTP', url: 'http://pure-otp:80/' },
    { name: 'Pure Read', url: 'http://pure-read:3000/api/health' },
    { name: 'Pure Clone', url: 'http://pure-clone:3000/api/health' },
    { name: 'Pure Note', url: 'http://pure-note:3000/api/health' },
    { name: 'Google DNS', url: 'https://8.8.8.8' }
  ];

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs">
      <div className="w-full max-w-md rounded-2xl bg-[var(--md-sys-color-surface-container)] border border-[var(--md-sys-color-outline)] shadow-2xl overflow-hidden animate-in fade-in zoom-in-95 duration-150">
        <div className="p-4 border-b border-[var(--md-sys-color-outline)] flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Server size={18} className="text-[var(--md-sys-color-primary)]" />
            <h2 className="text-sm font-bold text-[var(--md-sys-color-on-surface)]">
              Add Monitoring Target
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1 rounded-md text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-4 space-y-4">
          <div>
            <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1">
              Target Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Nextcloud or Pure Read"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1">
              Endpoint URL (HTTP / HTTPS)
            </label>
            <input
              type="url"
              required
              placeholder="https://example.com/health or http://host:port/"
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] focus:outline-none focus:border-[var(--md-sys-color-primary)] font-mono"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1">
              Probe Interval
            </label>
            <select
              value={intervalSeconds}
              onChange={(e) => setIntervalSeconds(Number(e.target.value))}
              className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            >
              <option value={15}>Every 15 seconds</option>
              <option value={30}>Every 30 seconds</option>
              <option value={60}>Every 1 minute</option>
              <option value={300}>Every 5 minutes</option>
            </select>
          </div>

          {/* Quick Presets */}
          <div>
            <span className="block text-[11px] text-[var(--md-sys-color-on-surface-variant)] mb-1.5 font-medium">
              Quick Homelab Presets:
            </span>
            <div className="flex flex-wrap gap-1.5">
              {presets.map((p) => (
                <button
                  key={p.name}
                  type="button"
                  onClick={() => {
                    setName(p.name);
                    setUrl(p.url);
                  }}
                  className="px-2 py-1 rounded bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-primary)]/15 border border-[var(--md-sys-color-outline)] text-[10.5px] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-colors cursor-pointer"
                >
                  {p.name}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2 flex items-center justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-3 py-1.5 rounded-lg text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] cursor-pointer"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-1.5 rounded-lg text-xs font-medium bg-[var(--md-sys-color-primary)] text-[var(--md-sys-color-on-primary)] hover:opacity-90 transition-opacity flex items-center gap-1 cursor-pointer shadow-sm"
            >
              <Plus size={14} />
              <span>Add Target</span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
