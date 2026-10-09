import React, { useState } from 'react';
import { X, Plus, Server, Globe, Cpu, Radio, Network } from 'lucide-react';

export default function AddTargetModal({ isOpen, onClose, onAddTarget }) {
  const [name, setName] = useState('');
  const [url, setUrl] = useState('');
  const [protocol, setProtocol] = useState('http');
  const [intervalSeconds, setIntervalSeconds] = useState(30);

  if (!isOpen) return null;

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!name || !url) return;
    onAddTarget({ name, url, protocol, intervalSeconds });
    setName('');
    setUrl('');
    setProtocol('http');
    setIntervalSeconds(30);
    onClose();
  };

  const protocolOptions = [
    { id: 'http', label: 'HTTP / HTTPS', icon: Globe, desc: 'Web apps, APIs, REST' },
    { id: 'tcp', label: 'TCP Port', icon: Cpu, desc: 'SSH (22), DBs (5432), Redis' },
    { id: 'dns', label: 'DNS Lookup', icon: Network, desc: 'Resolve domains & nameservers' },
    { id: 'ping', label: 'ICMP Ping', icon: Radio, desc: 'Low-level network reachability' }
  ];

  const presets = [
    { name: 'Pure Hub', url: 'http://pure-app:80/', protocol: 'http' },
    { name: 'Pure Feed', url: 'http://pure-feed:3000/api/health/live', protocol: 'http' },
    { name: 'Pure Read', url: 'http://pure-read:3000/api/health', protocol: 'http' },
    { name: 'SSH Server', url: '127.0.0.1:22', protocol: 'tcp' },
    { name: 'PostgreSQL DB', url: '127.0.0.1:5432', protocol: 'tcp' },
    { name: 'Cloudflare DNS', url: '1.1.1.1', protocol: 'ping' },
    { name: 'Google DNS Resolve', url: 'google.com', protocol: 'dns' }
  ];

  const getPlaceholder = () => {
    switch (protocol) {
      case 'tcp': return 'e.g. 192.168.1.50:22 or db.lan:5432';
      case 'dns': return 'e.g. pure.mcnarya.com or github.com';
      case 'ping': return 'e.g. 192.168.1.1 or 8.8.8.8';
      case 'http':
      default: return 'e.g. https://example.com/health or http://host:port/';
    }
  };

  const getUrlLabel = () => {
    switch (protocol) {
      case 'tcp': return 'Target Host:Port (TCP)';
      case 'dns': return 'Domain / Hostname (DNS)';
      case 'ping': return 'Target Host or IP (ICMP Ping)';
      case 'http':
      default: return 'Endpoint URL (HTTP / HTTPS)';
    }
  };

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
          {/* Protocol Selector Tabs */}
          <div>
            <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1.5">
              Probe Protocol
            </label>
            <div className="grid grid-cols-2 gap-1.5 sm:grid-cols-4">
              {protocolOptions.map((opt) => {
                const Icon = opt.icon;
                const isSelected = protocol === opt.id;
                return (
                  <button
                    key={opt.id}
                    type="button"
                    onClick={() => setProtocol(opt.id)}
                    className={`flex flex-col items-center justify-center p-2 rounded-xl border text-center transition-all cursor-pointer ${
                      isSelected
                        ? 'bg-[var(--md-sys-color-primary-container)] border-[var(--md-sys-color-primary)] text-[var(--md-sys-color-primary)] font-bold shadow-xs'
                        : 'bg-[var(--md-sys-color-surface)] border-[var(--md-sys-color-outline)] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)]'
                    }`}
                  >
                    <Icon size={16} className="mb-1" />
                    <span className="text-[11px] font-semibold">{opt.label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1">
              Target Name
            </label>
            <input
              type="text"
              required
              placeholder="e.g. My Nextcloud or Home Gateway"
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3 py-2 rounded-lg text-xs bg-[var(--md-sys-color-surface-container-high)] text-[var(--md-sys-color-on-surface)] border border-[var(--md-sys-color-outline)] focus:outline-none focus:border-[var(--md-sys-color-primary)]"
            />
          </div>

          <div>
            <label className="block text-xs font-medium text-[var(--md-sys-color-on-surface-variant)] mb-1">
              {getUrlLabel()}
            </label>
            <input
              type="text"
              required
              placeholder={getPlaceholder()}
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
                    setProtocol(p.protocol);
                  }}
                  className="px-2 py-1 rounded bg-[var(--md-sys-color-surface)] hover:bg-[var(--md-sys-color-primary)]/15 border border-[var(--md-sys-color-outline)] text-[10.5px] text-[var(--md-sys-color-on-surface-variant)] hover:text-[var(--md-sys-color-on-surface)] transition-colors cursor-pointer"
                >
                  {p.name} <span className="opacity-60 text-[9px]">({p.protocol.toUpperCase()})</span>
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
