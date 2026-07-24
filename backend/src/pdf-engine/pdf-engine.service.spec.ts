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
