# Specification

## Summary
**Goal:** Fix the admin login so that credentials (`admin` / `admin123`) work correctly and the login page always renders without errors.

**Planned changes:**
- Ensure the default admin account is seeded into localStorage before the login check runs in `useAuth.ts`
- Fix the authentication logic so that the `admin` / `admin123` credentials are found and validated successfully
- Wrap the LoginPage in an error boundary or add defensive checks to prevent blank pages or unhandled "something went wrong" errors

**User-visible outcome:** Users can log in with `admin` / `admin123` and are redirected to the dashboard. The login page always displays the login form, and any unexpected error shows a friendly message instead of a blank screen.
