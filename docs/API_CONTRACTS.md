# CarHub OS — API Contracts & Endpoints

This document specifies the primary REST and streaming API contracts for CarHub OS.

All endpoints are prefixed with `/api` and guarded via `AuthGuard` and `CapabilitiesGuard`.

---

## 1. Diagnostics & Automotive Telemetry

### Vehicle Management
- `GET /api/diagnostics/vehicles`: List all vehicles tracked for diagnostics in the tenant.
- `POST /api/diagnostics/vehicles`: Register a new diagnostic vehicle or link an existing fleet car.
  ```json
  {
    "brand": "Renault",
    "model": "Clio V",
    "year": 2022,
    "vin": "VF1RJA00000000001",
    "fleetCarId": "optional-uuid"
  }
  ```

### Diagnostic Sessions
- `GET /api/diagnostics/sessions`: List diagnostic sessions (paginated, filterable by status/vehicle).
- `POST /api/diagnostics/sessions`: Initiate a diagnostic session.
  ```json
  {
    "vehicleId": "vehicle-uuid",
    "symptoms": "Check engine light flashing on acceleration, loss of power"
  }
  ```
- `GET /api/diagnostics/sessions/:id`: Retrieve session details including normalized telemetry, detected DTCs, freeze frames, and AI findings.
- `POST /api/diagnostics/sessions/:id/events`: Ingest raw or decoded telemetry events (samples, DTCs, freeze frames).
- `POST /api/diagnostics/sessions/:id/simulate`: Run a deterministic simulation scenario on the session.
  ```json
  {
    "scenario": "MISFIRE_CYL1"
  }
  ```
- `POST /api/diagnostics/sessions/:id/analyze`: Trigger deterministic rule analysis and AI diagnostic reasoning.
- `POST /api/diagnostics/sessions/:id/confirm`: Technician root-cause confirmation and sign-off.
  ```json
  {
    "fault": "Ignition Coil Cylinder 1 Failure",
    "notes": "Swapped coil 1 with coil 2; misfire moved to cylinder 2. Confirmed coil defective."
  }
  ```
- `POST /api/diagnostics/sessions/:id/estimate`: Generate repair estimate with parts and labor items.
  ```json
  {
    "parts": [
      { "partNumber": "OEM-7701479177", "name": "Ignition Coil Pack", "quantity": 1, "unitPrice": 450.00 }
    ],
    "laborHours": 0.75,
    "hourlyRate": 300.00,
    "discount": 0.00
  }
  ```

---

## 2. Work Orders & Repair Execution

- `GET /api/work-orders`: List shop work orders (filterable by status: `SCHEDULED`, `IN_PROGRESS`, etc.).
- `POST /api/work-orders`: Create work order from approved estimate or diagnostic session.
- `PATCH /api/work-orders/:id/status`: Advance work order through state machine transitions.
  ```json
  {
    "status": "IN_PROGRESS",
    "bayNumber": "Bay 3",
    "notes": "Vehicle positioned on lift; parts received from supplier."
  }
  ```
- `POST /api/work-orders/:id/verify`: Record post-repair verification (DTC clearing, road test parameters).
