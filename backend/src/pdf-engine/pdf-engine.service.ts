import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfEngineService {
  private readonly logger = new Logger(PdfEngineService.name);

  /**
   * HTML-escape user-controlled values before interpolating them into the
   * contract template. Without this, a customer/car/agency field containing
   * markup (e.g. a name like `</div><script>…`) would be injected into the
   * rendered contract — tampering with the legal document and executing in the
   * Puppeteer page (setContent runs scripts). Applied to every user-editable
   * string below; numbers/dates are coerced/formatted and can't carry markup.
   */
  private esc(value: string | number | null | undefined): string {
    if (value === null || value === undefined) return '';
    return String(value)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  }

  /**
   * High-fidelity Digital Contract Generator
   */
  async generateContract(booking: any): Promise<Buffer> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: auto;">
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 4px solid #7c3aed; padding-bottom: 20px;">
          <div>
            <h1 style="text-transform: uppercase; font-weight: 900; color: #7c3aed; margin: 0; font-size: 32px;">${this.esc(booking.agency.name)}</h1>
            <p style="color: #64748b; font-size: 12px; margin-top: 5px;">${this.esc(booking.agency.address || 'Address Pending')}</p>
            <p style="color: #64748b; font-size: 11px; font-weight: bold;">${this.esc(booking.agency.taxId || '')}</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #1e293b; font-size: 18px;">CONTRAT DE LOCATION</h2>
            <p style="color: #94a3b8; font-size: 10px;">Ref: ${booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        
        <div style="margin-top: 30px; display: grid; grid-template-columns: 1fr 1fr; gap: 40px;">
          <div style="border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
            <h4 style="text-transform: uppercase; color: #94a3b8; font-size: 10px; margin-bottom: 10px;">Locataire (Customer)</h4>
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${this.esc(booking.customer.firstName)} ${this.esc(booking.customer.lastName)}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">CIN/Passport: ${this.esc(booking.customer.identityNumber)}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Phone: ${this.esc(booking.customer.phone)}</p>
          </div>
          <div style="border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
            <h4 style="text-transform: uppercase; color: #94a3b8; font-size: 10px; margin-bottom: 10px;">Véhicule (Asset)</h4>
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${this.esc(booking.car.brand)} ${this.esc(booking.car.model)}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Matricule: ${this.esc(booking.car.licensePlate)}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Kilométrage: ${this.esc(booking.car.mileage)} KM</p>
          </div>
        </div>

        <div style="margin-top: 30px; background: #f8fafc; padding: 25px; border-radius: 12px; border: 1px solid #e2e8f0;">
          <h4 style="text-transform: uppercase; color: #7c3aed; font-size: 11px; margin-bottom: 15px; letter-spacing: 1px;">Détails Financiers</h4>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b; font-size: 13px;">Période de Location:</span>
            <span style="font-weight: bold;">${new Date(booking.startDate).toLocaleDateString()} - ${new Date(booking.endDate).toLocaleDateString()}</span>
          </div>
          <div style="display: flex; justify-content: space-between; margin-bottom: 10px;">
            <span style="color: #64748b; font-size: 13px;">Montant Total:</span>
            <span style="font-weight: 900; font-size: 18px; color: #1e293b;">${Number(booking.totalPrice).toLocaleString()} MAD</span>
          </div>
          <div style="display: flex; justify-content: space-between; border-top: 1px dashed #cbd5e1; padding-top: 10px;">
            <span style="color: #64748b; font-size: 13px;">Caution (Security Deposit):</span>
            <span style="font-weight: bold; color: #ef4444;">${Number(booking.depositAmount).toLocaleString()} MAD</span>
          </div>
        </div>

        <div style="margin-top: 50px; display: flex; justify-content: space-between; gap: 50px;">
          <div style="flex: 1; text-align: center;">
            <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; margin-bottom: 60px;">Signature Agence</p>
            <div style="border-bottom: 1px solid #1e293b; width: 150px; margin: auto;"></div>
          </div>
          <div style="flex: 1; text-align: center;">
            <p style="font-size: 10px; font-weight: bold; text-transform: uppercase; color: #94a3b8; margin-bottom: 60px;">Signature Client</p>
            <div style="border-bottom: 1px solid #1e293b; width: 150px; margin: auto;"></div>
          </div>
        </div>

        <div style="margin-top: 80px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 20px;">
          <p style="font-size: 9px; color: #94a3b8; font-style: italic; line-height: 1.5;">
            Document généré numériquement par Fider OS. <br/>
            Identifiant Forensic: SHA256-${booking.id.slice(0, 12)} <br/>
            Horodatage: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    return this.renderHtmlToPdf(html, 'contract');
  }

  /**
   * Generates HTML for an official accident dossier.
   */
  buildAccidentHtml(accident: any): string {
    const occurredStr = accident.occurredAt
      ? new Date(accident.occurredAt).toLocaleString('fr-FR')
      : 'Date non spécifiée';
    const estimatedCostStr =
      accident.estimatedCost != null
        ? `${Number(accident.estimatedCost).toFixed(2)} MAD`
        : 'Non évalué';

    const agency = accident.agency || {};
    const car = accident.car || {};
    const booking = accident.booking || null;
    const customer = booking?.customer || null;

    return `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: auto; font-size: 13px;">
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 4px solid #dc2626; padding-bottom: 20px;">
          <div>
            <h1 style="text-transform: uppercase; font-weight: 900; color: #dc2626; margin: 0; font-size: 26px;">${this.esc(agency.name || 'Agence de Location')}</h1>
            <p style="color: #64748b; font-size: 12px; margin-top: 5px;">${this.esc(agency.address || '')}</p>
            <p style="color: #64748b; font-size: 11px; font-weight: bold;">Tél: ${this.esc(agency.phone || '')} · IF/ICE: ${this.esc(agency.taxId || 'N/A')}</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #1e293b; font-size: 18px;">DOSSIER DE SINISTRE</h2>
            <p style="color: #94a3b8; font-size: 11px; font-weight: bold; margin-top: 4px;">Réf: ACC-${accident.id.slice(0, 8).toUpperCase()}</p>
            <p style="color: #64748b; font-size: 11px;">Date d'édition: ${new Date().toLocaleDateString('fr-FR')}</p>
          </div>
        </div>

        <div style="margin-top: 25px; display: grid; grid-template-columns: 1fr 1fr; gap: 20px;">
          <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc;">
            <h4 style="text-transform: uppercase; color: #dc2626; font-size: 11px; margin: 0 0 10px 0; letter-spacing: 0.5px;">Détails du Sinistre</h4>
            <p style="margin: 3px 0;"><strong>Date du sinistre:</strong> ${occurredStr}</p>
            <p style="margin: 3px 0;"><strong>Gravité:</strong> <span style="font-weight: bold; color: ${accident.severity === 'TOTAL' || accident.severity === 'SEVERE' ? '#dc2626' : '#d97706'};">${this.esc(accident.severity)}</span></p>
            <p style="margin: 3px 0;"><strong>Statut:</strong> ${this.esc(accident.status)}</p>
            <p style="margin: 3px 0;"><strong>Lieu:</strong> ${this.esc(accident.location || 'Non précisé')}</p>
            <p style="margin: 3px 0;"><strong>Tiers impliqué:</strong> ${accident.thirdParty ? 'Oui' : 'Non'}</p>
            <p style="margin: 3px 0;"><strong>Coût estimé:</strong> <span style="font-weight: bold;">${estimatedCostStr}</span></p>
          </div>
          <div style="border: 1px solid #e2e8f0; padding: 15px; border-radius: 8px; background: #f8fafc;">
            <h4 style="text-transform: uppercase; color: #7c3aed; font-size: 11px; margin: 0 0 10px 0; letter-spacing: 0.5px;">Véhicule Impliqué</h4>
            <p style="margin: 3px 0;"><strong>Modèle:</strong> ${this.esc(car.brand)} ${this.esc(car.model)}</p>
            <p style="margin: 3px 0;"><strong>Immatriculation:</strong> ${this.esc(car.licensePlate)}</p>
            <p style="margin: 3px 0;"><strong>Kilométrage:</strong> ${car.mileage ? `${Number(car.mileage).toLocaleString()} KM` : '—'}</p>
            ${customer ? `
              <div style="margin-top: 10px; padding-top: 8px; border-top: 1px dashed #cbd5e1;">
                <p style="margin: 2px 0;"><strong>Conducteur:</strong> ${this.esc(customer.firstName)} ${this.esc(customer.lastName)}</p>
                <p style="margin: 2px 0;"><strong>CIN / Passeport:</strong> ${this.esc(customer.identityNumber || '—')}</p>
                <p style="margin: 2px 0;"><strong>Téléphone:</strong> ${this.esc(customer.phone || '—')}</p>
              </div>
            ` : '<p style="margin: 8px 0 0 0; color: #64748b; font-style: italic;">Hors contrat de location actif au moment du signalement.</p>'}
          </div>
        </div>

        <div style="margin-top: 25px; border: 1px solid #e2e8f0; border-radius: 8px; padding: 20px;">
          <h4 style="text-transform: uppercase; color: #1e293b; font-size: 11px; margin: 0 0 10px 0; letter-spacing: 0.5px;">Description des Faits et Constatations</h4>
          <p style="line-height: 1.6; color: #334155; margin: 0; white-space: pre-wrap;">${this.esc(accident.description)}</p>
        </div>

        <div style="margin-top: 40px; display: flex; justify-content: space-between; gap: 40px;">
          <div style="flex: 1; text-align: center; border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
            <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 50px;">Cachet & Signature Agence</p>
            <div style="border-bottom: 1px solid #cbd5e1; width: 140px; margin: auto;"></div>
          </div>
          <div style="flex: 1; text-align: center; border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
            <p style="font-size: 11px; font-weight: bold; text-transform: uppercase; color: #64748b; margin-bottom: 50px;">Expert / Compagnie d'Assurance</p>
            <div style="border-bottom: 1px solid #cbd5e1; width: 140px; margin: auto;"></div>
          </div>
        </div>

        <div style="margin-top: 50px; text-align: center; border-top: 1px solid #f1f5f9; padding-top: 15px;">
          <p style="font-size: 9px; color: #94a3b8; font-style: italic; line-height: 1.5; margin: 0;">
            Dossier d'incident certifié généré par Fider Platform · Référence Forensic: SHA256-${accident.id.slice(0, 12)} · Horodatage: ${new Date().toISOString()}
          </p>
        </div>
      </div>
    `;
  }

  /**
   * Official Accident / Damage Incident Dossier PDF Generator
   */
  async generateAccidentDossier(accident: any): Promise<Buffer> {
    const html = this.buildAccidentHtml(accident);
    return this.renderHtmlToPdf(html, 'accident dossier');
  }

  /**
   * Shared headless browser render helper with robust cleanup.
   */
  private async renderHtmlToPdf(html: string, contextName: string): Promise<Buffer> {
    this.logger.log(`[PUPPETEER] Spinning up headless browser to generate ${contextName} PDF...`);
    let browser: puppeteer.Browser | undefined;
    try {
      browser = await puppeteer.launch({
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage'],
      });
      const page = await browser.newPage();
      await page.setContent(html);

      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      this.logger.log(`[PUPPETEER] Successfully generated ${contextName} PDF buffer.`);
      return Buffer.from(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[PUPPETEER ERROR] Failed to generate ${contextName} PDF: ${message}`);
      throw new Error('PDF Generation failed');
    } finally {
      if (browser) {
        await browser.close().catch(() => undefined);
      }
    }
  }
}

