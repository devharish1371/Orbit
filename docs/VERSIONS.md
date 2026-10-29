# Installed versions

Recorded 2026-10-30 from installed tools, package metadata, and generated Android files.

| Tool | Version / status |
| --- | --- |
| OS | macOS (Darwin, arm64) |
| Node | 24.7.0 |
| npm | 11.5.1 |
| Python | 3.13.7 |
| Git | 2.51.0 |
| Java | Not installed; optional local APK compilation requires 21+ |
| Android Studio / SDK | Not verified locally; optional for M0 |
| Android min / compile / target SDK | 24 / 36 / 36 |
| Android Gradle Plugin | 8.13.0 |
| Gradle wrapper | 8.14.3 |
| Google Services Gradle Plugin | 4.4.4 (conditional; no Firebase config yet) |
| create-vite | 9.3.3 |
| Supabase CLI | 2.122.0 |

## Web direct dependencies

| Package | Pinned version |
| --- | --- |
| `@capacitor-community/background-geolocation` | 1.3.1 |
| `@capacitor/app` | 8.1.2 |
| `@capacitor/core` | 8.6.0 |
| `@capacitor/device` | 8.0.3 |
| `@capacitor/haptics` | 8.0.2 |
| `@capacitor/local-notifications` | 8.3.1 |
| `@capacitor/preferences` | 8.0.1 |
| `@capacitor/push-notifications` | 8.1.3 |
| `@capacitor/splash-screen` | 8.0.2 |
| `@capacitor/status-bar` | 8.0.4 |
| `@fontsource-variable/fraunces` | 5.3.0 |
| `@fontsource-variable/plus-jakarta-sans` | 5.3.0 |
| `@supabase/supabase-js` | 2.118.0 |
| `@tanstack/react-query` | 5.105.0 |
| `browser-image-compression` | 2.0.2 |
| `canvas-confetti` | 1.9.4 |
| `date-fns` | 4.4.0 |
| `idb-keyval` | 6.3.0 |
| `lucide-react` | 1.64.0 |
| `maplibre-gl` | 6.16.0 |
| `motion` | 14.8.0 |
| `react` | 19.3.1 |
| `react-dom` | 19.3.1 |
| `react-router-dom` | 7.18.5 |
| `zustand` | 5.0.16 |
| `@capacitor/android` | 8.6.0 |
| `@capacitor/cli` | 8.6.0 |
| `@eslint/js` | 10.0.1 |
| `@tailwindcss/vite` | 4.3.3 |
| `@testing-library/jest-dom` | 7.0.1 |
| `@testing-library/react` | 16.3.3 |
| `@testing-library/user-event` | 14.6.8 |
| `@types/canvas-confetti` | 1.9.0 |
| `@types/node` | 24.19.2 |
| `@types/react` | 19.3.0 |
| `@types/react-dom` | 19.3.0 |
| `@vitejs/plugin-react` | 6.1.2 |
| `@vitest/coverage-v8` | 5.0.5 |
| `eslint` | 10.13.0 |
| `eslint-config-prettier` | 10.1.8 |
| `eslint-plugin-react-hooks` | 7.1.1 |
| `eslint-plugin-react-refresh` | 0.5.7 |
| `globals` | 17.13.0 |
| `jsdom` | 29.1.1 |
| `prettier` | 3.9.10 |
| `tailwindcss` | 4.3.3 |
| `typescript` | 6.0.3 |
| `typescript-eslint` | 8.72.1 |
| `vite` | 8.3.5 |
| `vite-plugin-pwa` | 2.0.0 |
| `vitest` | 5.0.5 |

All npm transitive versions and integrity hashes: root and `web/package-lock.json`.
Python dependencies and all transitive versions: `tools/requirements.lock.txt`.
Install Python dependencies in `.venv`, never globally.

Production npm audit on 2026-10-30: zero vulnerabilities. The full install reported
four low-severity development dependency findings; no forced breaking updates were applied.
Provider quotas/account state remain unverified until their human setup gates.
