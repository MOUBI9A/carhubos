// Standalone Playwright script (NOT part of the e2e suite) to screenshot every
// page.tsx route at mobile/tablet/desktop widths for a manual responsive audit.
// Run with: node _tmp_shoot.mjs >> /tmp/ui-shots/log.txt 2>&1
import { chromium } from 'playwright';

const FRONTEND = 'http://localhost:3002';
const API = 'http://localhost:5406/api';
const OUT = '/tmp/ui-shots';
const WIDTHS = [375, 768, 1280];

const ROLES = {
  owner: { email: 'owner@carhub.os', password: 'admin123' },
  root: { email: 'root@carhub.os', password: 'admin123' },
  agent: { email: 'agent@carhub.os', password: 'admin123' },
  renter: { email: 'renter@carhub.os', password: 'admin123' },
};

function withTimeout(promise, ms, label) {
  let t;
  const timeout = new Promise((_, reject) => {
    t = setTimeout(() => reject(new Error(`TIMEOUT after ${ms}ms: ${label}`)), ms);
  });
  return Promise.race([promise, timeout]).finally(() => clearTimeout(t));
}

async function main() {
  const browser = await chromium.launch();
  const contexts = {};

  for (const [key, creds] of Object.entries(ROLES)) {
    const ctx = await browser.newContext();
    try {
      const res = await withTimeout(ctx.request.post(`${API}/auth/login`, { data: creds }), 10000, `login ${key}`);
      if (!res.ok()) {
        console.error(`LOGIN FAILED for ${key}: ${res.status()} ${await res.text()}`);
        continue;
      }
      contexts[key] = ctx;
      console.log(`login ok: ${key}`);
    } catch (e) {
      console.error(`LOGIN ERROR for ${key}: ${e.message}`);
    }
  }

  let customerId = null;
  let carId = null;
  if (contexts.owner) {
    try {
      const custRes = await withTimeout(contexts.owner.request.get(`${API}/customers`), 10000, 'get customers');
      if (custRes.ok()) {
        const body = await custRes.json();
        const list = Array.isArray(body) ? body : body.items;
        if (list && list.length) customerId = list[0].id;
      }
      const carRes = await withTimeout(contexts.owner.request.get(`${API}/cars`), 10000, 'get cars');
      if (carRes.ok()) {
        const body = await carRes.json();
        const list = Array.isArray(body) ? body : body.items;
        if (list && list.length) carId = list[0].id;
      }
    } catch (e) {
      console.error(`dynamic id fetch error: ${e.message}`);
    }
  }
  console.log('customerId:', customerId, 'carId:', carId);

  const pages = [
    { path: '/', ctx: null, name: 'root' },
    { path: '/landing', ctx: null, name: 'landing' },
    { path: '/login', ctx: null, name: 'login' },
    { path: '/signup', ctx: null, name: 'signup' },
    { path: '/agency/prestige-casa', ctx: null, name: 'agency-subdomain' },

    { path: '/dashboard', ctx: 'owner', name: 'owner-dashboard' },
    { path: '/dashboard/erp', ctx: 'owner', name: 'owner-erp' },
    { path: '/dashboard/reports', ctx: 'owner', name: 'owner-reports' },
    { path: '/dashboard/fleet', ctx: 'owner', name: 'owner-fleet' },
    { path: '/dashboard/fleet-map', ctx: 'owner', name: 'owner-fleet-map' },
    { path: '/dashboard/bookings', ctx: 'owner', name: 'owner-bookings' },
    { path: '/dashboard/customers', ctx: 'owner', name: 'owner-customers' },
    { path: '/dashboard/vault', ctx: 'owner', name: 'owner-vault' },
    { path: '/dashboard/hub', ctx: 'owner', name: 'owner-hub' },
    { path: '/dashboard/accidents', ctx: 'owner', name: 'owner-accidents' },
    { path: '/dashboard/finance', ctx: 'owner', name: 'owner-finance' },
    { path: '/dashboard/waitlist', ctx: 'owner', name: 'owner-waitlist' },
    { path: '/dashboard/blacklist', ctx: 'owner', name: 'owner-blacklist' },
    { path: '/dashboard/search', ctx: 'owner', name: 'owner-search' },
    { path: '/dashboard/staff', ctx: 'owner', name: 'owner-staff' },
    { path: '/dashboard/billing', ctx: 'owner', name: 'owner-billing' },
    { path: '/dashboard/settings', ctx: 'owner', name: 'owner-settings' },
    { path: '/dashboard/ai-vision', ctx: 'owner', name: 'owner-ai-vision' },
    { path: '/dashboard/automations', ctx: 'owner', name: 'owner-automations' },
    ...(customerId ? [{ path: `/dashboard/customers/${customerId}`, ctx: 'owner', name: 'owner-customer-detail' }] : []),
    ...(carId ? [{ path: `/dashboard/fleet/${carId}`, ctx: 'owner', name: 'owner-fleet-detail' }] : []),

    { path: '/admin', ctx: 'root', name: 'admin-pulse-home' },
    { path: '/admin/logs', ctx: 'root', name: 'admin-logs' },
    { path: '/admin/provision', ctx: 'root', name: 'admin-provision' },
    { path: '/admin/pulse', ctx: 'root', name: 'admin-infra-pulse' },
    { path: '/admin/settings', ctx: 'root', name: 'admin-settings' },
    { path: '/admin/agencies', ctx: 'root', name: 'admin-agencies' },

    { path: '/agent', ctx: 'agent', name: 'agent-home' },
    { path: '/agent/inspections', ctx: 'agent', name: 'agent-inspections' },
    { path: '/agent/tasks', ctx: 'agent', name: 'agent-tasks' },

    { path: '/portal', ctx: 'renter', name: 'renter-portal' },
    { path: '/portal/book', ctx: 'renter', name: 'renter-book' },
    { path: '/portal/history', ctx: 'renter', name: 'renter-history' },
  ];

  const noCtx = await browser.newContext();

  for (const p of pages) {
    const ctx = p.ctx ? contexts[p.ctx] : noCtx;
    if (!ctx) {
      console.error(`SKIP ${p.name}: no context for role ${p.ctx}`);
      continue;
    }
    const page = await ctx.newPage();
    page.setDefaultTimeout(30000);
    for (const width of WIDTHS) {
      try {
        await withTimeout((async () => {
          await page.setViewportSize({ width, height: 900 });
          await page.goto(`${FRONTEND}${p.path}`, { waitUntil: 'load', timeout: 30000 });
          await page.waitForTimeout(1200);
          await page.screenshot({ path: `${OUT}/${p.name}-${width}.png`, fullPage: true, timeout: 15000 });
        })(), 40000, `${p.name}@${width}`);
        console.log(`OK ${p.name} @ ${width}`);
      } catch (e) {
        console.error(`FAIL ${p.name} @ ${width}: ${e.message}`);
      }
    }
    await page.close().catch(() => {});
  }

  await browser.close();
  console.log('ALL DONE');
}

main().catch((e) => { console.error('FATAL', e); process.exit(1); });
