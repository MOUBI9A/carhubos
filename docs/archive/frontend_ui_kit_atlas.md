# FORENSIC UI KIT ATLAS: CarHub Design System

**Status**: 🔵 High-Fidelity UI/UX  
**Language**: React (TSX) + Tailwind + Framer Motion  
**Typography**: Inter (UI), Outfit (Brand), JetBrains Mono (Forensics)

---

## 🎨 1. CORE DESIGN TOKENS (HSL)
The platform uses a curated color palette designed for high visibility in dark-mode environments.

### Status Colors
| Status | HSL Token | UI Utility |
|:---|:---|:---|
| **AVAILABLE / VALID / COMPLETED** | `142, 70%, 45%` | `text-emerald-400 bg-emerald-400/10` |
| **RENTED / CONFIRMED / ACTIVE** | `221, 83%, 53%` | `text-blue-400 bg-blue-400/10` |
| **MAINTENANCE / EXPIRING_SOON**| `38, 92%, 50%` | `text-amber-400 bg-amber-400/10` |
| **EXPIRED / CANCELLED** | `0, 72%, 51%` | `text-rose-400 bg-rose-400/10` |
| **PENDING / DRAFT** | `215, 16%, 47%` | `text-slate-400 bg-slate-400/10` |

### Glassmorphism Logic
All interactive cards use the following composite layer:
- **Background**: `bg-white/5`
- **Blur**: `backdrop-blur-md`
- **Border**: `border border-white/10`
- **Shadow**: `shadow-[0_8px_32px_0_rgba(0,0,0,0.3)]`

---

## 🏗️ 2. COMPONENT ANATOMY & HIERARCHY

### 2.1 Layout Wrappers
- **Path**: `src/app/(dashboard)/layout.tsx`
- **Structure**: 
  - `ImpersonationBanner`: Logic-driven visibility.
  - `Sidebar`: Core navigation + Role-based hiding.
  - `GlobalErrorBoundary`: Component-level safety net.
  - `AnimatePresence`: Framer Motion orchestrator.
  - `CommandPalette`: Overlay system (CMD+K).

### 2.2 Featured Interactive Units
- **GlassCard**: Primitive base for all dashboard widgets.
- **StatsGrid**: 4-column responsive grid for financial MRR and fleet pulse.
- **BookingModal**: Complex multi-step form with validation hooks.
- **ForensicLogTable**: Optimized data table for `AuditLog` visualization.

---

## ⚡ 3. CLIENT-SIDE FLOW & HYDRATION

### 3.1 Forensic API Client (`api.ts`)
- **Base URL**: `http://localhost:5001/api`
- **Interceptors**: 
  - **Request**: Injects the `Authorization: Bearer <token>` into every outgoing request.
  - **Response**: Listens for `401 Unauthorized` errors and triggers an automatic `logout()` if the session expires.

### 3.2 State Management (`AuthContext`)
The "Heart" of the frontend:
- **Initialization**: Hydrates state from `localStorage` (`autoflow_token`, `autoflow_user`) to prevent flicker.
- **Stabilization**: Uses `useMemo` to stabilize context values, preventing expensive dashboard re-renders.

---

## 🎭 4. ANIMATION SPECIFICATION
Standardized motion variants for a premium feel.

### Page Transition (Scale-Up)
```json
{
  "initial": { "opacity": 0, "y": 20, "scale": 0.98 },
  "animate": { "opacity": 1, "y": 0, "scale": 1 },
  "exit": { "opacity": 0, "scale": 1.02 }
}
```

### Pulse Effect (Loading)
Implemented via custom CSS Keyframes in `index.css`:
```css
@keyframes skeleton-pulse {
  0%, 100% { opacity: 0.1; }
  50% { opacity: 0.3; }
}
```

---

## 🏁 5. LOGIC UTILITIES (`utils.ts`)
- `cn()`: Conditional class merger (via `clsx` and `tailwind-merge`).
- `formatCurrency()`: Moroccan Dirham (MAD) formatting via `Intl.NumberFormat`.
- `getComplianceColor()`: Returns the HSL variant based on the numeric `complianceScore`.

**This UI Kit Atlas documents the visual and client-side logic of the CarHub platform.** **VOILA.** 🏎️💨
