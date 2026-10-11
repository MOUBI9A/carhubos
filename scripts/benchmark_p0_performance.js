/**
 * P0 Performance & Pilot Latency Benchmark
 * Measures:
 * 1. Public page TTFB (Landing / Login / Signup)
 * 2. Auth latency (Registration + Token Generation + Password Hashing)
 * 3. Login latency (Bcrypt verify + JWT generation)
 * 4. Email verification latency (SHA-256 hash lookup + transaction + session issuance)
 * 5. Onboarding state & step persistence latency
 * 6. Command Centre Aggregation Latency (Parallel Promise.all + In-memory 15s TTL Cache)
 * 7. Server-Timing header instrumentation
 */
const http = require('http');

const BACKEND_URL = 'http://localhost:5406';
const FRONTEND_URL = 'http://localhost:3002';

function timedRequest(urlStr, options = {}, body = null) {
  return new Promise((resolve, reject) => {
    const url = new URL(urlStr);
    const start = performance.now();

    const reqOptions = {
      hostname: url.hostname,
      port: url.port,
      path: url.pathname + url.search,
      method: options.method || 'GET',
      headers: options.headers || {},
    };

    let payload = null;
    if (body) {
      payload = typeof body === 'string' ? body : JSON.stringify(body);
      reqOptions.headers['Content-Type'] = 'application/json';
      reqOptions.headers['Content-Length'] = Buffer.byteLength(payload);
    }

    const req = http.request(reqOptions, (res) => {
      let data = '';
      res.on('data', (chunk) => (data += chunk));
      res.on('end', () => {
        const totalDuration = Math.round((performance.now() - start) * 10) / 10;
        let json = null;
        try {
          json = JSON.parse(data);
        } catch (_) {}

        resolve({
          statusCode: res.statusCode,
          headers: res.headers,
          serverTiming: res.headers['server-timing'],
          durationMs: totalDuration,
          data: json || data,
        });
      });
    });

    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}

function parseCookie(setCookieHeaders) {
  if (!setCookieHeaders) return null;
  const cookies = Array.isArray(setCookieHeaders) ? setCookieHeaders : [setCookieHeaders];
  for (const c of cookies) {
    const match = c.match(/infinity_token=([^;]+)/);
    if (match) return `infinity_token=${match[1]}`;
  }
  return null;
}

async function runBenchmark() {
  console.log('================================================================');
  console.log('   FIDER OS (CARHUB) — PILOT PERFORMANCE BENCHMARK INSTRUMENTATION');
  console.log('================================================================\n');

  const stamp = Date.now();
  const testAccount = {
    email: `perf_${stamp}@benchmark.ma`,
    password: 'Password123!',
    name: 'Benchmark Owner',
    agencyName: `Benchmark Agency ${stamp}`,
  };

  // 1. FRONTEND PAGE LOAD TTFB
  console.log('1. FRONTEND PAGE LATENCY (Next.js SSR / Turbopack):');
  const landingRes = await timedRequest(`${FRONTEND_URL}/`);
  console.log(`   GET / (Root Landing)         : ${landingRes.durationMs}ms (Status: ${landingRes.statusCode})`);

  const loginPageRes = await timedRequest(`${FRONTEND_URL}/login`);
  console.log(`   GET /login                   : ${loginPageRes.durationMs}ms (Status: ${loginPageRes.statusCode})`);

  const signupPageRes = await timedRequest(`${FRONTEND_URL}/signup`);
  console.log(`   GET /signup                  : ${signupPageRes.durationMs}ms (Status: ${signupPageRes.statusCode})`);

  const verifyPageRes = await timedRequest(`${FRONTEND_URL}/verify-email`);
  console.log(`   GET /verify-email            : ${verifyPageRes.durationMs}ms (Status: ${verifyPageRes.statusCode})`);

  const onboardingPageRes = await timedRequest(`${FRONTEND_URL}/onboarding`);
  console.log(`   GET /onboarding              : ${onboardingPageRes.durationMs}ms (Status: ${onboardingPageRes.statusCode})\n`);

  // 2. AUTHENTICATION & SIGNUP LATENCY
  console.log('2. AUTHENTICATION & SECURITY PIPELINE LATENCY:');
  const regRes = await timedRequest(`${BACKEND_URL}/api/auth/register`, { method: 'POST' }, {
    email: testAccount.email,
    password: testAccount.password,
    name: testAccount.name,
    role: 'OWNER',
    agencyName: testAccount.agencyName,
  });
  console.log(`   POST /api/auth/register       : ${regRes.durationMs}ms (Server-Timing: ${regRes.serverTiming || 'n/a'})`);

  let authCookie = parseCookie(regRes.headers['set-cookie']);
  const token = regRes.data?.debugVerificationToken;

  // 3. EMAIL VERIFICATION LATENCY
  console.log('3. EMAIL VERIFICATION & TOKEN HASH TRANSACTION:');
  const verifyRes = await timedRequest(`${BACKEND_URL}/api/auth/verify-email`, {
    method: 'POST',
    headers: { Cookie: authCookie },
  }, { token });
  console.log(`   POST /api/auth/verify-email   : ${verifyRes.durationMs}ms (Server-Timing: ${verifyRes.serverTiming || 'n/a'})`);

  const updatedCookie = parseCookie(verifyRes.headers['set-cookie']) || authCookie;

  // 4. LOGIN LATENCY (BCRYPT + JWT)
  console.log('4. LOGIN LATENCY:');
  const loginRes = await timedRequest(`${BACKEND_URL}/api/auth/login`, { method: 'POST' }, {
    email: testAccount.email,
    password: testAccount.password,
  });
  console.log(`   POST /api/auth/login          : ${loginRes.durationMs}ms (Server-Timing: ${loginRes.serverTiming || 'n/a'})\n`);

  // 5. ONBOARDING WORKFLOW LATENCY
  console.log('5. MANDATORY ONBOARDING STEP LATENCIES:');
  const stateRes = await timedRequest(`${BACKEND_URL}/api/onboarding/state`, {
    headers: { Cookie: updatedCookie },
  });
  console.log(`   GET  /api/onboarding/state    : ${stateRes.durationMs}ms (Server-Timing: ${stateRes.serverTiming || 'n/a'})`);

  const step1Res = await timedRequest(`${BACKEND_URL}/api/onboarding/step`, {
    method: 'PATCH',
    headers: { Cookie: updatedCookie },
  }, {
    step: 2,
    agencyProfile: {
      businessPhone: '+212522123456',
      city: 'Casablanca',
      address: 'Boulevard d Anfa',
    },
  });
  console.log(`   PATCH /api/onboarding/step 1  : ${step1Res.durationMs}ms (Server-Timing: ${step1Res.serverTiming || 'n/a'})`);

  const addCarRes = await timedRequest(`${BACKEND_URL}/api/cars`, {
    method: 'POST',
    headers: { Cookie: updatedCookie },
  }, {
    brand: 'Dacia',
    model: 'Logan',
    year: 2024,
    licensePlate: `BENCH-${String(stamp).slice(-5)}`,
    pricePerDay: 300,
  });
  console.log(`   POST  /api/cars (Fleet Setup) : ${addCarRes.durationMs}ms (Server-Timing: ${addCarRes.serverTiming || 'n/a'})`);

  const completeOnbRes = await timedRequest(`${BACKEND_URL}/api/onboarding/complete`, {
    method: 'POST',
    headers: { Cookie: updatedCookie },
  }, {});
  console.log(`   POST  /api/onboarding/complete: ${completeOnbRes.durationMs}ms (Server-Timing: ${completeOnbRes.serverTiming || 'n/a'})\n`);

  const completedCookie = parseCookie(completeOnbRes.headers['set-cookie']) || updatedCookie;

  // 6. COMMAND CENTRE AGGREGATION & CACHE EFFICIENCY
  console.log('6. COMMAND CENTRE AGGREGATION QUERY (WARM VS COLD):');
  const coldCommandRes = await timedRequest(`${BACKEND_URL}/api/analytics/command-centre`, {
    headers: { Cookie: completedCookie },
  });
  console.log(`   Cold Aggregation (Promise.all): ${coldCommandRes.durationMs}ms (Server-Timing: ${coldCommandRes.serverTiming || 'n/a'})`);

  const warmCommandRes = await timedRequest(`${BACKEND_URL}/api/analytics/command-centre`, {
    headers: { Cookie: completedCookie },
  });
  console.log(`   Warm Request (15s In-Mem Cache): ${warmCommandRes.durationMs}ms (Server-Timing: ${warmCommandRes.serverTiming || 'n/a'})\n`);

  console.log('================================================================');
  console.log('   BENCHMARK COMPLETED SUCCESSFULLY');
  console.log('================================================================');
}

runBenchmark().catch(console.error);
