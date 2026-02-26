# Specification

## Summary
**Goal:** Add a User Management page to the Workshop POS app where admins can view, add, and delete users with roles, accessibility levels, passwords, and profile photos.

**Planned changes:**
- Add a "Users" link in the main navigation routing to a new `UserDataPage`
- Display a table of all users with columns: Avatar, Name, Role, and Accessibility
- Add an "Add User" button that opens a modal with fields: Name, Role (Admin/Cashier/Technician), Accessibility (Full Access/POS Only/Reports Only), Password, and Profile Photo upload with inline preview
- Store user data (including profile photos as base64) in localStorage
- Add a delete button per user row with a confirmation dialog before removal
- Seed a default admin user (username: `admin`, password: `admin123`, Role: Admin, Accessibility: Full Access) that cannot be deleted
- Display profile photos as circular avatars; show initials placeholder if no photo is set
- Validate that Name and Password are not empty before saving a new user

**User-visible outcome:** Admins can navigate to a User Management page to view all users, add new users with roles, accessibility, passwords, and profile photos, and delete users (except the default admin).
