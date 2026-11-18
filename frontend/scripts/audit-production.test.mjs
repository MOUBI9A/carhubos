import { describe, it, expect } from 'vitest';
import {
  checkExpiry,
  checkNextConfig,
  checkLockfile,
  validateAuditReport,
  runAudit,
  EXCEPTION_EXPIRY_UTC,
  APPROVED_ADVISORY_SOURCE,
  APPROVED_ADVISORY_ID,
  EXPECTED_NODE_PATH,
  EXPECTED_PARENT_NODE,
} from './audit-production.mjs';

function createValidAuditJson() {
  return {
    auditReportVersion: 2,
    vulnerabilities: {
      '@parcel/watcher': {
        name: '@parcel/watcher',
        severity: 'high',
        isDirect: false,
        via: ['picomatch'],
        effects: [],
        range: '>=2.5.4',
        nodes: [EXPECTED_PARENT_NODE],
        fixAvailable: true,
      },
      picomatch: {
        name: 'picomatch',
        severity: 'high',
        isDirect: false,
        via: [
          {
            source: APPROVED_ADVISORY_SOURCE,
            name: 'picomatch',
            dependency: 'picomatch',
            title: 'picomatch vulnerable to ReDoS',
            url: `https://github.com/advisories/${APPROVED_ADVISORY_ID}`,
            severity: 'high',
            range: '<=4.0.7',
          },
        ],
        effects: ['@parcel/watcher'],
        range: '*',
        nodes: [EXPECTED_NODE_PATH],
        fixAvailable: true,
      },
    },
    metadata: {
      vulnerabilities: {
        info: 0,
        low: 0,
        moderate: 0,
        high: 2,
        critical: 0,
        total: 2,
      },
      dependencies: {
        prod: 91,
        dev: 718,
        optional: 134,
        peer: 10,
        peerOptional: 0,
        total: 871,
      },
    },
  };
}

function createValidLockfile() {
  return {
    packages: {
      'node_modules/next-intl': { version: '4.13.2' },
      'node_modules/@parcel/watcher': { version: '2.5.6' },
      'node_modules/@parcel/watcher/node_modules/picomatch': {
        version: '4.0.5',
      },
    },
  };
}

describe('audit-production fail-closed compensating controls', () => {
  // Test 1: exact-match pass
  it('1. exact-match pass: succeeds with valid audit JSON, valid lockfile, and no extractor', () => {
    const validAudit = createValidAuditJson();
    const result = validateAuditReport(validAudit);
    expect(result.allowed).toBe(true);
    expect(result.advisory).toBe(APPROVED_ADVISORY_ID);
    expect(result.expiry).toBe(EXCEPTION_EXPIRY_UTC);
  });

  // Test 2: expiry fail
  it('2. expiry fail: throws if current time is past EXCEPTION_EXPIRY_UTC', () => {
    const expiryMs = Date.parse(EXCEPTION_EXPIRY_UTC);
    // 1 millisecond before expiry should pass
    expect(() => checkExpiry(expiryMs - 1)).not.toThrow();
    // 1 millisecond after expiry must fail
    expect(() => checkExpiry(expiryMs + 1)).toThrow(
      /Dependency exception expired/
    );
  });

  // Test 3: path/version drift fail
  it('3. path/version drift fail: throws if lockfile or nodes path has drifted', () => {
    // 3a. Lockfile version drift
    const lockfileDrift = createValidLockfile();
    lockfileDrift.packages['node_modules/@parcel/watcher/node_modules/picomatch'].version = '4.0.6';
    expect(() => checkLockfile(lockfileDrift)).toThrow(/Lockfile version drift/);

    // 3b. Missing parent package in lockfile
    const lockfileMissingParent = createValidLockfile();
    delete lockfileMissingParent.packages['node_modules/@parcel/watcher'];
    expect(() => checkLockfile(lockfileMissingParent)).toThrow(/Lockfile version drift/);

    // 3c. Audit report node path drift
    const auditPathDrift = createValidAuditJson();
    auditPathDrift.vulnerabilities.picomatch.nodes = [
      'node_modules/some-other-pkg/node_modules/picomatch',
    ];
    expect(() => validateAuditReport(auditPathDrift)).toThrow(
      /picomatch node path drift/
    );
  });

  // Test 4: additional high fail
  it('4. additional high fail: throws if an additional high vulnerability exists', () => {
    const auditExtraHigh = createValidAuditJson();
    auditExtraHigh.metadata.vulnerabilities.high = 3;
    auditExtraHigh.vulnerabilities['axios'] = {
      name: 'axios',
      severity: 'high',
      via: [{ source: 99999, severity: 'high' }],
      nodes: ['node_modules/axios'],
    };
    expect(() => validateAuditReport(auditExtraHigh)).toThrow(
      /Audit failed: expected exactly 2 high vulnerabilities/
    );
  });

  // Test 5: critical fail
  it('5. critical fail: throws if any critical vulnerability is reported', () => {
    const auditWithCritical = createValidAuditJson();
    auditWithCritical.metadata.vulnerabilities.critical = 1;
    auditWithCritical.vulnerabilities['critical-pkg'] = {
      name: 'critical-pkg',
      severity: 'critical',
      via: [{ source: 88888, severity: 'critical' }],
      nodes: ['node_modules/critical-pkg'],
    };
    expect(() => validateAuditReport(auditWithCritical)).toThrow(
      /Audit failed: 1 critical vulnerability found/
    );
  });

  // Test 6: malformed-output fail
  it('6. malformed-output fail: throws if audit JSON is null, corrupted, or missing metadata', () => {
    expect(() => validateAuditReport(null)).toThrow(/Malformed audit output/);
    expect(() => validateAuditReport({})).toThrow(/Unsupported audit report version/);
    expect(() =>
      validateAuditReport({ auditReportVersion: 2 })
    ).toThrow(/missing metadata.vulnerabilities/);
    expect(() =>
      validateAuditReport({
        auditReportVersion: 2,
        metadata: { vulnerabilities: { high: 2, critical: 0 } },
      })
    ).toThrow(/missing vulnerabilities object/);
  });

  // Test 7: command-error fail
  it('7. command-error fail: throws if child process command fails or produces empty stdout', () => {
    expect(() =>
      runAudit({
        cwd: '/non/existent/path',
      })
    ).toThrow();
  });

  // Test 8: extractor-enabled fail
  it('8. extractor-enabled fail: throws if next.config.ts enables extraction or message watching', () => {
    const cleanConfig = `
      import createNextIntlPlugin from 'next-intl/plugin';
      const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts');
      export default withNextIntl({});
    `;
    expect(() => checkNextConfig(cleanConfig)).not.toThrow();

    const configWithExtract = `
      import createNextIntlPlugin from 'next-intl/plugin';
      const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts', {
        experimental: { extract: true }
      });
      export default withNextIntl({});
    `;
    expect(() => checkNextConfig(configWithExtract)).toThrow(
      /Potential next-intl message extraction\/watcher configuration detected/
    );

    const configWithMessages = `
      import createNextIntlPlugin from 'next-intl/plugin';
      const withNextIntl = createNextIntlPlugin('./src/i18n/request.ts', {
        experimental: { messages: './messages' }
      });
      export default withNextIntl({});
    `;
    expect(() => checkNextConfig(configWithMessages)).toThrow(
      /Potential next-intl message extraction\/watcher configuration detected/
    );
  });
});
