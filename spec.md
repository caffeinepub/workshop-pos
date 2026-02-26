# Specification

## Summary
**Goal:** Add an edit menu for user authorization on the User Data page and fix the Add Product authorization bug on the Products page.

**Planned changes:**
- Add an Edit button/menu action to each user row in UserDataPage that opens a modal dialog pre-filled with the user's current role and permissions
- The edit dialog allows an Admin to change the user's role (Admin, User, Kasir) and update their permissions checklist using the existing PermissionsChecklist component
- Saving the dialog updates the user's authorization data via the existing useAuth hook and reflects changes immediately in the user list
- Fix the authorization check in ProductsPage so that clicking "Add Product" correctly recognizes an Admin user as authorized and opens the add-product dialog without errors

**User-visible outcome:** Admins can now edit any user's role and permissions directly from the User Data page, and the Add Product button on the Products page works correctly for Admin users without showing a false authorization error.
