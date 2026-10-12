# Fider Mobile — Official Native Companion App

Official native mobile companion application for the **Fider** (CarHub OS) multi-tenant car-rental ERP platform, localized for Morocco (MAD currency, 20% VAT, CNDP Law 09-08 compliance, Arabic RTL + French + English).

- **Production Domain:** `https://www.carhub.codes`
- **Application ID (iOS / Android):** `codes.carhub.fider`
- **Architecture:** React Native 0.76.7 + Expo SDK 52 + TypeScript + Expo Router v4 + Reanimated + i18next

---

## 1. Quick Start

### Prerequisites
- Node.js 20+
- npm 10+
- Expo Go app on iOS/Android device, or iOS Simulator / Android Emulator

### Installation
```bash
# From workspace root
cd mobile
npm install
```

### Run Locally (Development)
```bash
# Start Expo development server
npm run start

# Launch on iOS Simulator (macOS only)
npm run ios

# Launch on Android Emulator / Connected Device
npm run android
```

---

## 2. Testing & Quality Checks

```bash
# Run TypeScript static typecheck (zero errors)
npm run typecheck

# Run Jest unit and component test suites
npm test

# Run Expo configuration validator
npx expo config --type public
```

---

## 3. Directory Layout

```
mobile/
├── app/                          # Expo Router v4 routes
│   ├── _layout.tsx               # Root navigation stack & providers
│   ├── index.tsx                 # Role gateway dispatcher
│   ├── (auth)/                   # Login & secure authentication
│   ├── (owner)/                  # Owner/Manager cockpit (Fleet, Bookings, Settings)
│   ├── (agent)/                  # Frontline operations (Handovers, Inspections, QR Scanner)
│   ├── (renter)/                 # Renter portal (Active rentals, Document Vault, QR Pass)
│   ├── inspection/wizard.tsx     # 3-step contradictory inspection modal
│   └── settings/delete-account.tsx # In-app compliant account deletion
├── assets/                       # High-resolution branded icons & splash screens
│   ├── icon.png                  # 1024x1024 App Icon
│   ├── adaptive-icon.png         # 1024x1024 Android Adaptive Icon
│   ├── splash.png                # 1242x2436 Launch Screen
│   └── favicon.png               # Web icon
├── src/
│   ├── api/client.ts             # Axios client with Bearer auth & 401 interception
│   ├── components/               # UI kit & domain components
│   │   ├── ui/                   # Button, Card, Badge, Header, Input, StatCard
│   │   └── inspection/           # FuelGaugePicker, PhotoEvidenceCapture, DigitalSignaturePad
│   ├── constants/theme.ts        # Fider Lux design tokens (graphite, brass, violet)
│   ├── context/                  # AuthContext, InspectionDraftContext
│   ├── i18n/                     # French, Arabic (RTL), and English dictionaries
│   ├── storage/                  # SecureStore hardware vault & offline draft queue
│   └── types/                    # Domain models & TypeScript interfaces
├── __tests__/                    # Jest automated test suites
├── app.json                      # Expo application manifest & store permissions
└── eas.json                      # EAS Build production release profiles
```

---

## 4. Production Build & Store Submission

### Android Production Build (`.aab`)
```bash
eas build --platform android --profile production
```

### iOS Production Build (Archive / TestFlight)
```bash
eas build --platform ios --profile production
```

For complete submission and store documentation, refer to:
- `docs/store/APP_STORE_METADATA.md`
- `docs/store/GOOGLE_PLAY_METADATA.md`
- `docs/store/APP_REVIEW_INSTRUCTIONS.md`
- `docs/store/SCREENSHOT_SPECIFICATION.md`
- `docs/mobile/RELEASE_PROCESS.md`
