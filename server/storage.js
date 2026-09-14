import fs from 'fs';
import fsPromises from 'fs/promises';
import path from 'path';

const DATA_DIR = process.env.DATA_DIR || (fs.existsSync('/data') ? '/data' : path.resolve(process.cwd(), 'data'));
const TARGETS_FILE = path.join(DATA_DIR, 'targets.json');
const SETTINGS_FILE = path.join(DATA_DIR, 'settings.json');

function ensureDataDir() {
  if (!fs.existsSync(DATA_DIR)) {
    fs.mkdirSync(DATA_DIR, { recursive: true });
  }
}

async function seedDefaultData() {
  ensureDataDir();
  if (!fs.existsSync(TARGETS_FILE)) {
    const initialTargets = [
      {
        id: 'pure-hub',
        name: 'Pure Hub',
        url: 'http://pure-app:80/',
        type: 'http',
        intervalSeconds: 30,
        timeoutMs: 5000,
        status: 'pending',
        uptimePercentage: 100,
        latencyHistory: [],
        incidents: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'pure-feed',
        name: 'Pure Feed',
        url: 'http://pure-feed:3000/api/health/live',
        type: 'http',
        intervalSeconds: 30,
        timeoutMs: 5000,
        status: 'pending',
        uptimePercentage: 100,
        latencyHistory: [],
        incidents: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'pure-otp',
        name: 'Pure OTP',
        url: 'http://pure-otp:80/',
        type: 'http',
        intervalSeconds: 30,
        timeoutMs: 5000,
        status: 'pending',
        uptimePercentage: 100,
        latencyHistory: [],
        incidents: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'pure-read',
        name: 'Pure Read',
        url: 'http://pure-read:3000/api/health',
        type: 'http',
        intervalSeconds: 30,
        timeoutMs: 5000,
        status: 'pending',
        uptimePercentage: 100,
        latencyHistory: [],
        incidents: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'pure-clone',
        name: 'Pure Clone',
        url: 'http://pure-clone:3000/api/health',
        type: 'http',
        intervalSeconds: 30,
        timeoutMs: 5000,
        status: 'pending',
        uptimePercentage: 100,
        latencyHistory: [],
        incidents: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'pure-note',
        name: 'Pure Note',
        url: 'http://pure-note:3000/api/health',
        type: 'http',
        intervalSeconds: 30,
        timeoutMs: 5000,
        status: 'pending',
        uptimePercentage: 100,
        latencyHistory: [],
        incidents: [],
        createdAt: new Date().toISOString()
      },
      {
        id: 'cloudflare-dns',
        name: 'Cloudflare DNS',
        url: 'https://1.1.1.1',
        type: 'http',
        intervalSeconds: 60,
        timeoutMs: 5000,
        status: 'pending',
        uptimePercentage: 100,
        latencyHistory: [],
        incidents: [],
        createdAt: new Date().toISOString()
      }
    ];

    await fsPromises.writeFile(TARGETS_FILE, JSON.stringify(initialTargets, null, 2), 'utf8');
  }

  if (!fs.existsSync(SETTINGS_FILE)) {
    const defaultSettings = {
      webhookUrl: '',
      webhookEnabled: false,
      maxHistoryPoints: 40
    };
    await fsPromises.writeFile(SETTINGS_FILE, JSON.stringify(defaultSettings, null, 2), 'utf8');
  }
}

export async function readTargets() {
  ensureDataDir();
  await seedDefaultData();
  try {
    const raw = await fsPromises.readFile(TARGETS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[pure-ping] Failed to read targets:', err);
    return [];
  }
}

export async function writeTargets(targets) {
  ensureDataDir();
  const tempFile = `${TARGETS_FILE}.tmp-${Date.now()}`;
  await fsPromises.writeFile(tempFile, JSON.stringify(targets, null, 2), 'utf8');
  await fsPromises.rename(tempFile, TARGETS_FILE);
}

export async function readSettings() {
  ensureDataDir();
  await seedDefaultData();
  try {
    const raw = await fsPromises.readFile(SETTINGS_FILE, 'utf8');
    return JSON.parse(raw);
  } catch (err) {
    console.error('[pure-ping] Failed to read settings:', err);
    return { webhookUrl: '', webhookEnabled: false, maxHistoryPoints: 40 };
  }
}

export async function writeSettings(settings) {
  ensureDataDir();
  const tempFile = `${SETTINGS_FILE}.tmp-${Date.now()}`;
  await fsPromises.writeFile(tempFile, JSON.stringify(settings, null, 2), 'utf8');
  await fsPromises.rename(tempFile, SETTINGS_FILE);
}
