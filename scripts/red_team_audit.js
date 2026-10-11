const http = require('http');

const BASE_URL = 'http://localhost:5406/api';

// Helper: send HTTP request with optional cookie and json body
function request(method, path, body = null, cookie = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(BASE_URL + path);
    const headers = {
      'Content-Type': 'application/json',
    };
    if (cookie) {
      headers['Cookie'] = cookie;
    }

    const payload = body ? JSON.stringify(body) : null;
    if (payload) {
      headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(
      {
        hostname: url.hostname,
        port: url.port,
        path: url.pathname + url.search,
        method,
        headers,
      },
      (res) => {
        const chunks = [];
        res.on('data', (c) => chunks.push(c));
        res.on('end', () => {
          const buffer = Buffer.concat(chunks);
          let json = null;
          try {
            json = JSON.parse(buffer.toString('utf8'));
          } catch {
            // not json (e.g. binary PDF)
          }

          const setCookie = res.headers['set-cookie'];
          let tokenCookie = null;
          if (setCookie) {
            for (const sc of setCookie) {
              if (sc.startsWith('infinity_token=')) {
                tokenCookie = sc.split(';')[0];
              }
            }
          }

          resolve({
            status: res.statusCode,
            headers: res.headers,
            body: json,
            rawBody: buffer,
            cookie: tokenCookie,
          });
        });
      },
    );

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

async function runAudit() {
  console.log('====================================================');
  console.log('🔴 STARTING RED TEAM AUDIT ON FIDER / CARHUB OS API');
  console.log('====================================================\n');

  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    findings: [],
  };

  function assert(name, condition, details = '') {
    results.total++;
    if (condition) {
      results.passed++;
      console.log(`  ✅ PASS: ${name}`);
    } else {
      results.failed++;
      console.log(`  ❌ FAIL: ${name} — ${details}`);
      results.findings.push({ name, details });
    }
  }

  // ── 1. AUTHENTICATION & LOGIN ──
  console.log('--- 1. Authentication & Cookie Guards ---');

  const loginOwnerA = await request('POST', '/auth/login', {
    email: 'owner@carhub.os',
    password: 'admin123',
  });
  assert('Owner A login returns 200', loginOwnerA.status === 200, `Got ${loginOwnerA.status}`);
  assert('Owner A receives infinity_token cookie', !!loginOwnerA.cookie, 'No token cookie');
  assert(
    'Cookie has HttpOnly & SameSite=Lax flags',
    loginOwnerA.headers['set-cookie']?.some((c) => c.includes('HttpOnly') && c.includes('SameSite=Lax')),
    `Set-Cookie: ${JSON.stringify(loginOwnerA.headers['set-cookie'])}`,
  );
  const cookieOwnerA = loginOwnerA.cookie;

  const loginAgentA = await request('POST', '/auth/login', {
    email: 'agent@carhub.os',
    password: 'admin123',
  });
  assert('Agent A login returns 200', loginAgentA.status === 200, `Got ${loginAgentA.status}`);
  const cookieAgentA = loginAgentA.cookie;

  const loginOwnerB = await request('POST', '/auth/login', {
    email: 'owner@prestige.ma',
    password: 'admin123',
  });
  assert('Owner B login returns 200', loginOwnerB.status === 200, `Got ${loginOwnerB.status}`);
  const cookieOwnerB = loginOwnerB.cookie;

  const loginRoot = await request('POST', '/auth/login', {
    email: 'root@carhub.os',
    password: 'admin123',
  });
  assert('Root Admin login returns 200', loginRoot.status === 200, `Got ${loginRoot.status}`);
  const cookieRoot = loginRoot.cookie;

  const loginRenter = await request('POST', '/auth/login', {
    email: 'renter@carhub.os',
    password: 'admin123',
  });
  assert('Renter login returns 200', loginRenter.status === 200, `Got ${loginRenter.status}`);
  const cookieRenter = loginRenter.cookie;

  const loginBad = await request('POST', '/auth/login', {
    email: 'owner@carhub.os',
    password: 'wrongpassword',
  });
  assert('Bad credentials return 401 or 429 (rate-limited)', loginBad.status === 401 || loginBad.status === 429, `Got ${loginBad.status}`);

  const unauthMe = await request('GET', '/auth/me');
  assert('Unauthenticated /auth/me returns 401', unauthMe.status === 401, `Got ${unauthMe.status}`);

  const authMeOwnerA = await request('GET', '/auth/me', null, cookieOwnerA);
  assert('Owner A /auth/me returns role OWNER', authMeOwnerA.body?.user?.role === 'OWNER', `Body: ${JSON.stringify(authMeOwnerA.body)}`);

  // ── 2. MULTI-TENANT ISOLATION (PHASE 5 RED TEAM) ──
  console.log('\n--- 2. Multi-Tenant Red Team (IDOR Probing) ---');
  // Dynamically query cars and bookings from each tenant to get active IDs
  const carsARes = await request('GET', '/cars', null, cookieOwnerA);
  const carsBRes = await request('GET', '/cars', null, cookieOwnerB);
  const bookingsBRes = await request('GET', '/bookings', null, cookieOwnerB);

  const CAR_A_ID = carsARes.body?.[0]?.id || 'fake-car-a';
  const CAR_B_ID = carsBRes.body?.[0]?.id || 'fake-car-b';
  const BOOKING_B_ID = bookingsBRes.body?.[0]?.id || 'fake-booking-b';

  const getCarBAsOwnerA = await request('GET', `/cars/${CAR_B_ID}`, null, cookieOwnerA);
  assert(
    'Owner A GET foreign car (Agency B) returns 404 (IDOR guard)',
    getCarBAsOwnerA.status === 404,
    `Got ${getCarBAsOwnerA.status} (expected 404)`,
  );

  const patchCarBAsOwnerA = await request('PATCH', `/cars/${CAR_B_ID}`, { brand: 'HACKED' }, cookieOwnerA);
  assert(
    'Owner A PATCH foreign car (Agency B) returns 404',
    patchCarBAsOwnerA.status === 404,
    `Got ${patchCarBAsOwnerA.status} (expected 404)`,
  );

  const deleteCarBAsOwnerA = await request('DELETE', `/cars/${CAR_B_ID}`, null, cookieOwnerA);
  assert(
    'Owner A DELETE foreign car (Agency B) returns 404',
    deleteCarBAsOwnerA.status === 404,
    `Got ${deleteCarBAsOwnerA.status} (expected 404)`,
  );

  const getBookingBAsOwnerA = await request('GET', `/bookings/${BOOKING_B_ID}`, null, cookieOwnerA);
  assert(
    'Owner A GET foreign booking (Agency B) returns 404',
    getBookingBAsOwnerA.status === 404,
    `Got ${getBookingBAsOwnerA.status} (expected 404)`,
  );

  const postBookingForeignCar = await request(
    'POST',
    '/bookings',
    {
      carId: CAR_B_ID,
      customerId: 'some-customer',
      startDate: '2026-11-01T10:00:00Z',
      endDate: '2026-11-05T10:00:00Z',
      totalPrice: 2000,
    },
    cookieOwnerA,
  );
  assert(
    'Owner A booking foreign car (Agency B) is rejected (404/400)',
    postBookingForeignCar.status === 404 || postBookingForeignCar.status === 400,
    `Got ${postBookingForeignCar.status}`,
  );

  // Agency ID tampering in query string
  const queryOverride = await request(
    'GET',
    '/cars?agencyId=aa3f677d-6014-4ac5-9158-4e42b8d22a1c',
    null,
    cookieOwnerA,
  );
  const leakedCar = Array.isArray(queryOverride.body)
    ? queryOverride.body.find((c) => c.id === CAR_B_ID)
    : false;
  assert(
    'Query param ?agencyId=other cannot leak foreign agency fleet',
    !leakedCar,
    'Foreign car leaked into results!',
  );

  // ── 3. PRIVILEGE ESCALATION & CAPABILITY CHECKS (PHASE 6) ──
  console.log('\n--- 3. Authorization & Privilege Escalation ---');

  const rootMetricsAsAgent = await request('GET', '/saas-admin/metrics', null, cookieAgentA);
  assert(
    'Agent A calling ROOT_ADMIN /saas-admin/metrics returns 403',
    rootMetricsAsAgent.status === 403,
    `Got ${rootMetricsAsAgent.status}`,
  );

  const rootMetricsAsOwner = await request('GET', '/saas-admin/metrics', null, cookieOwnerA);
  assert(
    'Owner A calling ROOT_ADMIN /saas-admin/metrics returns 403',
    rootMetricsAsOwner.status === 403,
    `Got ${rootMetricsAsOwner.status}`,
  );

  const rootMetricsAsRoot = await request('GET', '/saas-admin/metrics', null, cookieRoot);
  assert(
    'Root Admin calling /saas-admin/metrics returns 200',
    rootMetricsAsRoot.status === 200,
    `Got ${rootMetricsAsRoot.status}`,
  );

  const agentAccessExpenses = await request('GET', '/expenses', null, cookieAgentA);
  assert(
    'Agent A calling /expenses (lacks finance capability) returns 403',
    agentAccessExpenses.status === 403,
    `Got ${agentAccessExpenses.status}`,
  );

  const ownerAccessExpenses = await request('GET', '/expenses', null, cookieOwnerA);
  assert(
    'Owner A calling /expenses returns 200',
    ownerAccessExpenses.status === 200,
    `Got ${ownerAccessExpenses.status}`,
  );

  const renterAccessCars = await request('GET', '/cars', null, cookieRenter);
  assert(
    'Renter calling agency ERP /cars returns 403/401',
    renterAccessCars.status === 403 || renterAccessCars.status === 401,
    `Got ${renterAccessCars.status}`,
  );

  // ── 4. SECURITY AUDIT (PHASE 7): SSRF, SQLI, XSS, PDF ──
  console.log('\n--- 4. Security Red Team: SSRF, SQLi, XSS, PDF ---');

  // SSRF Protection
  const ssrfLocalhost = await request(
    'POST',
    '/webhooks/subscribe',
    {
      url: 'https://127.0.0.1:5432/evil',
      event: 'BOOKING_CREATED',
    },
    cookieOwnerA,
  );
  assert(
    'Webhook SSRF to 127.0.0.1 blocked with 400',
    ssrfLocalhost.status === 400,
    `Got ${ssrfLocalhost.status}`,
  );

  const ssrfCloudMeta = await request(
    'POST',
    '/webhooks/subscribe',
    {
      url: 'https://169.254.169.254/latest/meta-data',
      event: 'BOOKING_CREATED',
    },
    cookieOwnerA,
  );
  assert(
    'Webhook SSRF to cloud metadata 169.254.169.254 blocked with 400',
    ssrfCloudMeta.status === 400,
    `Got ${ssrfCloudMeta.status}`,
  );

  // SQL Injection in search query
  const sqliTest = await request(
    'GET',
    `/cars?search=${encodeURIComponent("' OR '1'='1")}`,
    null,
    cookieOwnerA,
  );
  assert(
    'SQL injection in search returns 200 without SQL error',
    sqliTest.status === 200 && Array.isArray(sqliTest.body),
    `Got ${sqliTest.status}`,
  );

  // XSS & Accident Creation + PDF Generation
  console.log('Testing Accident creation with XSS payload and PDF generation...');
  const createXssAccident = await request(
    'POST',
    '/accidents',
    {
      carId: CAR_A_ID,
      description: '<script>alert("xss")</script> Damage report <iframe src="evil.com">',
      severity: 'MODERATE',
      occurredAt: '2026-10-10T14:00:00Z',
      location: 'Casablanca Corniche <img src=x onerror=alert(1)>',
      estimatedCost: 3500.5,
    },
    cookieOwnerA,
  );
  assert(
    'Owner A creates accident record returns 201',
    createXssAccident.status === 201 && !!createXssAccident.body?.id,
    `Got ${createXssAccident.status} ${JSON.stringify(createXssAccident.body)}`,
  );
  const accidentId = createXssAccident.body?.id;

  if (accidentId) {
    // Generate PDF for Owner A
    const pdfRes = await request('GET', `/accidents/${accidentId}/pdf`, null, cookieOwnerA);
    assert(
      'Owner A downloads accident PDF returns 200',
      pdfRes.status === 200,
      `Got ${pdfRes.status}`,
    );
    assert(
      'PDF response has Content-Type application/pdf',
      pdfRes.headers['content-type']?.includes('application/pdf'),
      `Content-Type: ${pdfRes.headers['content-type']}`,
    );
    const isPdfHeader = pdfRes.rawBody.slice(0, 5).toString('utf8') === '%PDF-';
    assert(
      'PDF binary begins with %PDF- magic bytes',
      isPdfHeader,
      `Header bytes: ${pdfRes.rawBody.slice(0, 10).toString('hex')}`,
    );

    // Cross-tenant access to this PDF by Owner B
    const pdfResOwnerB = await request('GET', `/accidents/${accidentId}/pdf`, null, cookieOwnerB);
    assert(
      'Owner B downloading Owner A accident PDF returns 404 (IDOR guard)',
      pdfResOwnerB.status === 404,
      `Got ${pdfResOwnerB.status} (expected 404)`,
    );
  }

  // ── 5. MONEY & DECIMAL INTEGRITY (PHASE 9) ──
  console.log('\n--- 5. Money & Decimal Integrity ---');
  const getCars = await request('GET', '/cars', null, cookieOwnerA);
  let moneyDecimalPass = true;
  if (Array.isArray(getCars.body)) {
    for (const car of getCars.body.slice(0, 20)) {
      if (typeof car.pricePerDay === 'number') {
        const parts = String(car.pricePerDay).split('.');
        if (parts[1] && parts[1].length > 2) {
          moneyDecimalPass = false;
          console.log(`Unsafe decimal precision on car ${car.id}: ${car.pricePerDay}`);
        }
      }
    }
  }
  assert('Cars pricePerDay respects max 2 decimal places (wire JSON format)', moneyDecimalPass);

  // ── 6. PERFORMANCE & LATENCY MEASUREMENT (PHASE 13) ──
  console.log('\n--- 6. Performance & Latency Measurements ---');
  const latencies = [];
  for (let i = 0; i < 20; i++) {
    const start = Date.now();
    await request('GET', '/cars', null, cookieOwnerA);
    latencies.push(Date.now() - start);
  }
  latencies.sort((a, b) => a - b);
  const p50 = latencies[Math.floor(latencies.length * 0.5)];
  const p95 = latencies[Math.floor(latencies.length * 0.95)];
  const avg = (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(1);
  console.log(`  📊 /cars Latency across 20 calls: avg=${avg}ms, p50=${p50}ms, p95=${p95}ms`);
  assert('/cars p95 latency is under 200ms', p95 < 200, `p95 was ${p95}ms`);

  console.log('\n====================================================');
  console.log(`AUDIT COMPLETE: ${results.passed}/${results.total} assertions passed.`);
  if (results.failed > 0) {
    console.log(`⚠️ ${results.failed} FINDINGS DETECTED:`);
    for (const f of results.findings) {
      console.log(` - ${f.name}: ${f.details}`);
    }
  } else {
    console.log('✅ ALL RED TEAM ATTACKS AND INVARIANTS VERIFIED!');
  }
  console.log('====================================================\n');
}

runAudit().catch(console.error);
