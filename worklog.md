# Work Log

---
Task ID: 1
Agent: Main Agent
Task: Fix seed data not inserting on Vercel PostgreSQL (0 users despite 26 tables)

Work Log:
- Identified root cause: middleware set `_MIGRATED = True` even when seed() failed silently
- Fixed middleware to NOT set `_MIGRATED = True` if seed fails (allows retry on next request)
- Added `_SEED_ERROR` module variable to capture seed failure details
- Added `transaction.commit()` after seed for explicit commit
- Updated `/diag/` view to show captured seed error and auto-run progressive diagnostics when 0 users detected
- Added raw-SQL fallback: if ORM-based seed fails, creates admin user directly via INSERT … ON CONFLICT
- Fixed raw SQL to include `is_superuser` (NOT NULL from PermissionsMixin)
- Fixed raw SQL to use Python `timezone.now().isoformat()` instead of `NOW()` (PostgreSQL-only)
- Verified both paths work locally: normal seed (5 users) and raw-SQL fallback (admin user with correct password)

Stage Summary:
- 3 commits pushed to GitHub: fix seed-migrated flag, add raw SQL fallback, fix is_superuser + cross-db timestamp
- Vercel will auto-deploy; user needs to test login after deployment completes
- Key files changed: `core/middleware.py`, `core/views.py`
