import { PdfEngineService } from './pdf-engine.service';

/**
 * Guards the contract-PDF injection fix. Every user-editable field
 * (customer/car/agency name, plate, CIN, phone…) is passed through esc() before
 * being interpolated into the contract HTML that Puppeteer renders — without it,
 * a value like `</div><script>…` would tamper with the legal document and execute
 * in the page (setContent runs scripts). Testing esc directly keeps this fast (no
 * headless browser); the template's use of it is visible in the source.
 */
describe('PdfEngineService.esc — contract HTML-injection guard', () => {
  const svc = new PdfEngineService();
  const esc = (v: unknown): string => (svc as any).esc(v);

  it('escapes every character that enables HTML/script injection', () => {
    expect(esc('</div><script>alert(1)</script>')).toBe(
      '&lt;/div&gt;&lt;script&gt;alert(1)&lt;/script&gt;',
    );
    expect(esc(`a & b "c" 'd'`)).toBe('a &amp; b &quot;c&quot; &#39;d&#39;');
    // & is escaped first so an already-safe entity isn't double-broken oddly.
    expect(esc('<b>&')).toBe('&lt;b&gt;&amp;');
  });

  it('renders null/undefined as empty (no literal "undefined" in the contract)', () => {
    expect(esc(null)).toBe('');
    expect(esc(undefined)).toBe('');
  });

  it('coerces non-strings safely', () => {
    expect(esc(12345)).toBe('12345');
    expect(esc(0)).toBe('0');
  });
});

describe('PdfEngineService.buildAccidentHtml — dossier generation & escaping', () => {
  const svc = new PdfEngineService();

  it('escapes malicious markup in accident description, agency name, and car details', () => {
    const maliciousAccident = {
      id: 'acc-12345678-abcd',
      occurredAt: '2026-04-10T14:30:00.000Z',
      severity: 'SEVERE',
      status: 'INVESTIGATING',
      description: '<script>alert("pwned")</script> Damage to rear bumper',
      location: 'Route de Rabat <img src=x onerror=alert(1)>',
      thirdParty: true,
      estimatedCost: 3500.5,
      agency: {
        name: 'Auto Prestige <iframe src="evil.com">',
        address: '12 Boulevard Hassan II & Fils',
        phone: '+212600112233',
        taxId: 'IF-123456',
      },
      car: {
        brand: 'Mercedes',
        model: 'Classe A <b>AMG</b>',
        licensePlate: '12345-A-26',
        mileage: 45000,
      },
      booking: {
        customer: {
          firstName: 'Karim',
          lastName: 'Benali <script>',
          identityNumber: 'AB123456',
          phone: '+212611223344',
        },
      },
    };

    const html = svc.buildAccidentHtml(maliciousAccident);

    expect(html).not.toContain('<script>');
    expect(html).toContain('&lt;script&gt;alert(&quot;pwned&quot;)&lt;/script&gt;');
    expect(html).not.toContain('<iframe');
    expect(html).toContain('&lt;iframe src=&quot;evil.com&quot;&gt;');
    expect(html).not.toContain('<img src=x');
    expect(html).toContain('3500.50 MAD');
    expect(html).toContain("Dossier d'incident certifié");
  });
});
