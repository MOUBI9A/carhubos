# Telematics / GPS integration

How Fider connects to an agency's GPS trackers, what it will and will not do
with them, and how to operate it safely. Written 2026-08-09.

---

## 1. Position: we integrate, we don't resell

An agency **brings its own GPS account**. Their installer already sold them
trackers and a platform (Traccar, Wialon, a white-label Navixy portal…);
Fider connects to that account, translates it, and puts the result next to
the booking, the contract and the renter's trust record — which is the part
nobody else has.

We deliberately do **not**:

- sell or ship tracking hardware,
- become the system of record for raw position history (their provider keeps
  it; we read live state on demand),
- sit in the path between the device and its platform.

That keeps the blast radius small: if Fider is down, tracking still works.

## 2. Architecture

```
TelematicsController          capability-gated HTTP surface
        │
TelematicsService            tenant scoping · SAFETY INTERLOCK · audit
        │
TelematicsAdapter            one small interface, per-vendor implementations
   ├── MockTelematicsAdapter  demo/dev, no network
   └── TraccarAdapter         real REST + HTTP Basic
```

This mirrors the existing `payment-gateway` MOCK/STRIPE split, for the same
reason: every vendor speaks a different dialect (Traccar has numeric device
ids and `engineStop`; Wialon has unit ids and its own command vocabulary; a
Teltonika box behind Flespi is different again). The adapter normalizes all
of it to the two things the product needs:

- **"where and how is this vehicle right now"** → `getVehicleState()`
- **"prevent / allow it starting"** → `immobilize()` / `restoreMobility()`

### Adding a provider

1. Implement `TelematicsAdapter` in `backend/src/telematics/adapters/`.
2. Add its key to `TELEMATICS_PROVIDERS` in `dto/telematics.dto.ts`.
3. Add a `case` to `TelematicsService.buildAdapter()`.
4. Add it to the `PROVIDERS` list in `frontend/.../settings/TelematicsSettings.tsx`.

Nothing else changes. The safety interlock lives in the service, above the
adapter, so a new provider **cannot** opt out of it.

### Traccar notes

| Need | Call |
|---|---|
| credential check | `GET /api/devices` |
| live state | `GET /api/positions?deviceId=<id>` |
| immobilize | `POST /api/commands/send` `{type:"engineStop"}` |
| release | `POST /api/commands/send` `{type:"engineResume"}` |

Two traps worth knowing:

- **Traccar reports speed in knots**, not km/h. The adapter converts
  (`× 1.852`). Getting this wrong would make a car doing 50 km/h look like
  27 and could let the interlock pass when it should refuse.
- `engineStop` only does anything if the device protocol supports the digital
  output **and** the relay is physically wired. A command can be accepted by
  the platform and still do nothing on the vehicle — which is why we record
  every command's outcome instead of assuming success.

## 3. Safety model — read this before touching immobilization

**Immobilization is a starter interrupt. It blocks the NEXT start. It never
stops a running engine.**

This is not a limitation we can "improve" later — it is the design:

- Cutting power to a moving vehicle removes power steering and brake assist.
  People die that way. Starter-interrupt is the industry norm for rental and
  fleet precisely because the vehicle simply coasts to a normal stop on its
  own, under driver control.
- Reputable telematics vendors gate this the same way. See Navixy's
  "safe remote vehicle immobilization" guidance and Digital Matter's
  immobilizer notes.

### The interlock

`TelematicsService.immobilize()` refuses unless **all** of these hold, from a
live provider read taken at the moment of the request:

| Guard | Threshold | Why |
|---|---|---|
| Stationary | `speed ≤ 3 km/h` | 3 km/h absorbs GPS jitter at a standstill without admitting a rolling vehicle |
| **Fresh fix** | `≤ 180 s old` | **The most important guard here.** A "0 km/h" reading from 40 minutes ago says nothing about now. Without this, the speed check is theatre — the car could be at 120 km/h |
| Ignition off | `ignition !== true` | Belt-and-braces: engine off means nobody is driving |

A refusal returns **409 Conflict** (the request was valid and authorized —
the *vehicle's current state* is what makes it unsafe), and is **persisted
and audit-logged** exactly like a successful command. A refusal to immobilize
is precisely the kind of event a later dispute turns on; it must never be
silent.

`restoreMobility()` has **no interlock, deliberately.** Releasing is the safe
direction, and gating it on a fresh fix would strand a renter exactly when
their tracker has poor signal — the moment they most need it undone.

### Legal / contractual

Remote immobilization of a customer's vehicle is a serious act and is
regulated differently across jurisdictions. Before enabling it in production:

- **Disclose it in the rental contract** the renter signs. The UI says as
  much at the point of use, but the contract is what protects the agency.
- Treat `telematics.command` as a privileged grant — it defaults to OWNER
  only for this reason.
- The mandatory free-text reason and the persisted telemetry snapshot exist
  so the agency can reconstruct *what was known at the time*. Keep them.

## 4. Security

| Concern | Handling |
|---|---|
| Provider credentials at rest | AES-256-GCM (`backend/src/common/crypto.ts`), versioned `v1:` blob. Fail-fast if `CREDENTIALS_ENCRYPTION_KEY` is unset — no default key, ever |
| Credential exposure | The `credentials` column is never selected into an API response (explicit select list, asserted by a test) and never written to the audit log |
| SSRF | The agency supplies `baseUrl` and we make server-side calls to it. Screened with the **same** host guard the webhooks module already hardened (loopback / link-local / RFC1918 / IPv6 ULA), https-only. Redirects are **not followed** — a redirect could bounce us off the screened host onto an internal address *after* the check passed |
| Tenant isolation | Every query is scoped by the caller's JWT `agencyId`; a cross-tenant car is a 404, never a 403 |
| Authorization | `telematics.view` (see position — AGENT/MANAGER/OWNER) vs `telematics.command` (immobilize — **OWNER only** by default). Split by consequence, not convenience |
| Audit | Every command *and every refusal* writes both a `TelematicsCommand` row and an `AuditLog` entry |

### Key rotation

`CREDENTIALS_ENCRYPTION_KEY` is not rotatable in place today: changing it
makes every stored provider credential undecryptable and each agency must
re-enter theirs. The `v1:` prefix on the blob exists so a future dual-key
rotation can be added without a data migration. Treat the key like
`JWT_SECRET`.

## 5. Operating it

**Setup (per agency, by the owner):**
1. Settings → *GPS & tracking* → pick provider, enter server URL + credentials.
   Credentials are verified against the live provider *before* being stored,
   so a bad key fails immediately rather than during an incident.
2. Fleet → a vehicle → *Live tracking* → paste that vehicle's device ID from
   the provider.

**Server prerequisite:** set `CREDENTIALS_ENCRYPTION_KEY` in `backend/.env`
(`openssl rand -base64 48`). Without it the module refuses to store or read
credentials.

**Demo without hardware:** pick provider *Demo (simulated)*. It reports a
deterministic parked vehicle around Casablanca — stationary, ignition off,
fresh fix — so the happy path is demoable. It always reports stationary, so
it cannot demonstrate a safety refusal; those paths are covered by unit
tests.

## 6. Known gaps / follow-ups

- **UI is English-only.** The two new surfaces (`TelematicsPanel`,
  `TelematicsSettings`) use hardcoded English rather than next-intl, matching
  the fleet-detail page they sit on (which is itself still largely English —
  "Rental history", "Asset specs", "Compliance score"). The settings page
  around `TelematicsSettings` *is* translated, so that one is a genuine
  inconsistency. Wiring both through next-intl with FR/AR is a tracked
  follow-up, ideally alongside finishing the fleet-detail page.
- **No geofencing / trip history / alerts.** Live state and mobility only.
  Position history stays in the agency's provider.
- **One integration per agency.** `TelematicsIntegration.agencyId` is unique.
  An agency running two provider accounts is not supported.
- **No polling/webhook ingestion.** State is read on demand (the UI polls
  every 20s while the panel is open). Fine at current scale; a provider
  webhook would be the next step for real-time alerting.
- **Traccar is the only real adapter.** Wialon is the obvious next one for
  this market.

## Sources

- [Traccar REST API — commands](https://www.traccar.org/api-reference/)
- [Navixy — Safe remote vehicle immobilization: best practices for rental and fleet](https://navixy.com/blog/safe-remote-vehicle-immobilization-best-practices/)
- [Digital Matter — Remote vehicle immobilizer system](https://www.digitalmatter.com/blog/remote-vehicle-immobilizer-system)
