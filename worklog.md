---
Task ID: 1
Agent: Super Z (main)
Task: Implement Real Police System - Authentication, RBAC, Audit Trail, Case Teams, Evidence Chain of Custody, Consultation Requests

Work Log:
- Added User, AuditLog, CaseTeamMember, EvidenceItem, EvidenceCustody, ConsultationRequest models to Prisma schema with Role enum
- Created auth.ts with bcrypt password hashing, role hierarchy (CLERK=1, INVESTIGATOR=2, STATION_COMMANDER=3, ADMIN=4)
- Created audit.ts with logAudit utility recording timestamp, user, IP, user agent, and change details
- Created rbac.ts with requireAuth, requireRole, and requireCaseAccess (need-to-know enforcement)
- Upgraded from next-auth v4 to v5 (Auth.js v5 beta.32) to fix Next.js 16 compatibility
- Created login page at /login with demo account autofill and Suspense boundary
- Added SessionProvider via auth-provider.tsx wrapper component
- Added middleware.ts for route protection (redirects to /login or returns 401)
- Updated ALL 12+ API routes with authentication checks
- Implemented need-to-know: investigators see only their assigned cases in /api/firs and /api/dashboard
- Investigation notes are now append-only (no PUT/DELETE endpoints), officer name set from session
- Created /api/case-team (POST/DELETE) for managing case team members
- Created /api/evidence (POST/PUT) for evidence items and custody transfer chain
- Created /api/consultations (GET/POST/PATCH) for requesting and approving temporary case access
- Created /api/audit-logs (GET) with pagination and filtering (commander+ only)
- Created /api/users (GET/POST/PATCH) for admin-only user management
- Seeded 5 demo user accounts with unique bcrypt-hashed passwords
- Fixed build errors (Google Fonts timeout, Suspense boundary, deprecated middleware warning)
- Fixed CSRF validation (AUTH_TRUST_HOST=true, proper cookie forwarding in Auth.js v5)
- Verified all tests pass: admin sees 8 cases, investigator sees 2 cases, audit logs recorded
- Pushed to GitHub

Stage Summary:
- Full real police system implemented and tested
- 5 demo accounts: admin/admin123, commander/cmd123, abebe/abebe123, haile/haile123, clerk1/clerk123
- Who registers actors: ONLY the System Admin (via /api/users) — verified and enforced
- All changes pushed to https://github.com/addefakam/policeOfficeAutomation
