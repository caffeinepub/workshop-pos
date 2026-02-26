# Specification

## Summary
**Goal:** Fix the admin role check that incorrectly blocks logged-in admin users from adding new products.

**Planned changes:**
- Fix the role verification logic in `ProductsPage.tsx` and/or `useUserRole.ts` so it correctly identifies the current user as admin
- Ensure the "Add New Product" action is allowed for admin users without showing the "only admin can add new products" error
- Verify the backend authorization check correctly recognizes the admin caller and allows the product addition to proceed
- Ensure non-admin users (kasir/user roles) still see the appropriate restriction message

**User-visible outcome:** An admin user can successfully click "Add New Product" and add products without being incorrectly blocked by the role restriction error.
