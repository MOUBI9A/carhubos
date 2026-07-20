import { Injectable, Logger } from '@nestjs/common';
import * as puppeteer from 'puppeteer';

@Injectable()
export class PdfEngineService {
  private readonly logger = new Logger(PdfEngineService.name);

  /**
   * High-fidelity Digital Contract Generator
   */
  async generateContract(booking: any): Promise<Buffer> {
    const html = `
      <div style="font-family: Arial, sans-serif; padding: 40px; color: #1e293b; max-width: 800px; margin: auto;">
        <div style="display: flex; justify-content: space-between; align-items: start; border-bottom: 4px solid #7c3aed; padding-bottom: 20px;">
          <div>
            <h1 style="text-transform: uppercase; font-weight: 900; color: #7c3aed; margin: 0; font-size: 32px;">${booking.agency.name}</h1>
            <p style="color: #64748b; font-size: 12px; margin-top: 5px;">${booking.agency.address || 'Address Pending'}</p>
            <p style="color: #64748b; font-size: 11px; font-weight: bold;">${booking.agency.taxId || ''}</p>
          </div>
          <div style="text-align: right;">
            <h2 style="margin: 0; color: #1e293b; font-size: 18px;">CONTRAT DE LOCATION</h2>
            <p style="color: #94a3b8; font-size: 10px;">Ref: ${booking.id.slice(0, 8).toUpperCase()}</p>
          </div>
        </div>
        
        <div style="margin-top: 30px; display: grid; grid-template-cols: 1fr 1fr; gap: 40px;">
          <div style="border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
            <h4 style="text-transform: uppercase; color: #94a3b8; font-size: 10px; margin-bottom: 10px;">Locataire (Customer)</h4>
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${booking.customer.firstName} ${booking.customer.lastName}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">CIN/Passport: ${booking.customer.identityNumber}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Phone: ${booking.customer.phone}</p>
          </div>
          <div style="border: 1px solid #f1f5f9; padding: 15px; border-radius: 8px;">
            <h4 style="text-transform: uppercase; color: #94a3b8; font-size: 10px; margin-bottom: 10px;">Véhicule (Asset)</h4>
            <p style="margin: 0; font-weight: bold; font-size: 16px;">${booking.car.brand} ${booking.car.model}</p>
            <p style="margin: 5px 0 0 0; font-size: 12px; color: #64748b;">Matricule: ${booking.car.licensePlate}</p>
            <p style="margin: 2px 0 0 0; font-size: 12px; color: #64748b;">Kilométrage: ${booking.car.mileage} KM</p>
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
            Document généré numériquement par **Infinity OS v2.0**. <br/>
            Identifiant Forensic: SHA256-${booking.id.slice(0, 12)} <br/>
            Horodatage: ${new Date().toLocaleString()}
          </p>
        </div>
      </div>
    `;

    this.logger.log(`[PUPPETEER] Spinning up headless browser to generate contract PDF...`);
    try {
      const browser = await puppeteer.launch({ 
        headless: true,
        executablePath: process.env.PUPPETEER_EXECUTABLE_PATH || undefined,
        args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
      });
      const page = await browser.newPage();
      await page.setContent(html);
      
      const pdfBuffer = await page.pdf({
        format: 'A4',
        printBackground: true,
      });

      await browser.close();
      this.logger.log(`[PUPPETEER] Successfully generated PDF buffer.`);
      
      return Buffer.from(pdfBuffer);
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      this.logger.error(`[PUPPETEER ERROR] Failed to generate PDF: ${message}`);
      throw new Error('PDF Generation failed');
    }
  }
}

