# Project Guardrails & Stability Lock

This file documents the structural stability and core guardrails for **HiSee Pro**, as established on October 3, 2026.

## ⚠️ Strict Prohibitions (Lock Build)

1.  **Core Files Lock**: Modification or rewriting of the following core "kernel" files is strictly prohibited:
    *   `App.tsx`
    *   `index.tsx` (Entry Point)
    *   `src/lib/firebase.ts`
2.  **Authentication & Loading Logic**: The existing authentication flow and loading mechanisms are verified as stable and must not be altered.
3.  **Build Artifacts**: Ensure build options always target the `dist` directory.

## 🛠️ Feature Development Guidelines

1.  **Modularity**: All new features, components, or UI designs must be created in **new, independent files** within the `src/components/` directory.
2.  **Zero-Impact**: New additions must not interfere with the core structural integrity or existing stable features.
3.  **Stability First**: Before any deployment or build, run `npm run lint` (tsc) and `npm run build` to verify no regressions were introduced.

## 🚀 Build & Deployment

*   **Output Directory**: `dist`
*   **Command**: `npm run build`
