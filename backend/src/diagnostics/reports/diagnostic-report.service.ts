import { Injectable } from '@nestjs/common';
import type { Browser } from 'puppeteer';
import type {
  Analysis,
  Confirmation,
  Estimate,
  TestResult,
} from '../obd/telemetry.types';
export function escapeReport(value: unknown): string {
  const text =
    value === null || value === undefined
      ? ''
      : typeof value === 'string'
        ? value
        : typeof value === 'number' || typeof value === 'boolean'
          ? String(value)
          : JSON.stringify(value);
  return text
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}
export function reportHtml(report: Record<string, unknown>): string {
  const e = escapeReport;
  const vehicle = report.vehicle as Record<string, unknown>;
  const analysis = report.analysis as Analysis;
  const estimate = report.estimate as Estimate;
  const confirmation = report.confirmation as Confirmation;
  const tests = report.testResults as TestResult[];
  return `<!doctype html><html><head><meta charset="utf-8"><meta http-equiv="Content-Security-Policy" content="default-src 'none'; style-src 'unsafe-inline'"><style>body{font-family:Arial,sans-serif;font-size:11px;color:#222;margin:30px}h1{font-size:22px}h2{margin-top:22px}.source{padding:14px;border:2px solid #555;font-weight:bold}table{border-collapse:collapse;width:100%}th,td{text-align:left;padding:7px;border-bottom:1px solid #ddd}.finding{break-inside:avoid}p,li,td{overflow-wrap:anywhere}footer{font-size:9px}</style></head><body>
 <h1>CarHub diagnostic assessment</h1><p class="source">${e(report.provenance)}</p>
 <p><b>Vehicle:</b> ${e(vehicle.brand)} ${e(vehicle.model)} ${e(vehicle.year)} · VIN ${e(vehicle.vin || 'not supplied')}</p>
 <p><b>Recorded:</b> ${e(report.createdAt)} · <b>Symptoms:</b> ${e(report.symptoms || 'not supplied')}</p>
 <p>${e(report.sampleCount)} validated samples; ${e(report.excludedSampleCount)} excluded due to timing quality. Rules ${e(analysis.rulesVersion)}; reasoning ${e(analysis.provider)}.</p>
 <h2>Evidence and diagnostic findings</h2>${analysis.findings.map((f) => `<div class="finding"><h3>${e(f.title)} (${e(f.severity)})</h3><p>${confirmation.findingIds.includes(f.id) ? 'Reviewed by technician' : 'Not selected in technician confirmation'} · ${e(f.confidenceBasis)}</p><ul>${f.evidence.map((x) => `<li>${e(x)}</li>`).join('')}</ul><p>${f.limitations.map(e).join(' ')}</p></div>`).join('')}
 <h2>Technician tests and assessment</h2><ul>${tests.map((t) => `<li>${e(t.testId)}: ${e(t.result)} — ${e(t.notes)}</li>`).join('')}</ul><p>${e(confirmation.notes)}</p><p>Confirmed ${e(confirmation.confirmedAt)} by authenticated technician ${e(confirmation.actorId)}.</p>
 <h2>Manual repair estimate · ${e(estimate.currency)}</h2><table><thead><tr><th>Item</th><th>Kind</th><th>Quantity</th><th>Unit price</th><th>Total</th></tr></thead><tbody>${estimate.items.map((i) => `<tr><td>${e(i.description)}</td><td>${e(i.kind)}</td><td>${e(i.quantity)}</td><td>${e(i.unitPrice)}</td><td>${e(i.total)}</td></tr>`).join('')}</tbody></table><p>Subtotal ${e(estimate.subtotal)} · VAT rate ${e(estimate.vatRate)} · VAT ${e(estimate.tax)} · <b>Estimated total ${e(estimate.total)} ${e(estimate.currency)}</b></p><ul>${estimate.assumptions.map((x) => `<li>${e(x)}</li>`).join('')}</ul>
 <h2>Scope and limitations</h2><ul>${analysis.limitations.map((x) => `<li>${e(x)}</li>`).join('')}${(report.limitations as string[]).map((x) => `<li>${e(x)}</li>`).join('')}</ul><footer>Report ${e(report.reportId)} · Session ${e(report.sessionId)} · Content SHA-256 ${e(report.contentHash)}</footer></body></html>`;
}
@Injectable()
export class DiagnosticReportService {
  async pdf(report: Record<string, unknown>): Promise<Buffer> {
    let browser: Browser | undefined;
    try {
      const puppeteer = await import('puppeteer');
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: [
          '--no-sandbox',
          '--disable-setuid-sandbox',
          '--disable-dev-shm-usage',
        ],
      });
      const page = await browser.newPage();
      await page.setJavaScriptEnabled(false);
      await page.setRequestInterception(true);
      page.on('request', (request) => {
        void request.abort();
      });
      await page.setContent(reportHtml(report), {
        waitUntil: 'domcontentloaded',
      });
      return Buffer.from(
        await page.pdf({ format: 'A4', printBackground: true }),
      );
    } finally {
      await browser?.close().catch(() => undefined);
    }
  }
}
