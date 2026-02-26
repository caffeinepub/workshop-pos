# Specification

## Summary
**Goal:** Fix the broken admin login authentication so that credentials `admin` / `admin123` work correctly and redirect to the dashboard.

**Planned changes:**
- Investigate and fix credential validation logic in `useAuth.ts` and `LoginPage.tsx` (credential mismatch, hashing inconsistency, or state initialization issue)
- Ensure successful login redirects the user to the authenticated layout/dashboard
- Ensure wrong credentials display a clear error message without crashing the app
- Preserve existing session persistence via localStorage

**User-visible outcome:** The admin can log in with username `admin` and password `admin123` without errors and is taken to the main dashboard. Invalid credentials show a clear error message.
