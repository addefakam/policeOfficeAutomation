"""
WSGI config for Police Department Automation System.
Auto-runs migrations and seeds data on first cold start (Vercel serverless).
"""

import os
import sys
import threading

os.environ.setdefault('DJANGO_SETTINGS_MODULE', 'config.settings')

# Auto-migrate + seed on Vercel (serverless) first cold start.
# Uses a /tmp flag so this runs at most once per container instance.
_migrate_lock = threading.Lock()
_migrate_done = False

def _ensure_db_ready():
    global _migrate_done
    if _migrate_done:
        return
    with _migrate_lock:
        if _migrate_done:
            return
        _flag = '/tmp/.pdms_migrated'
        if os.path.exists(_flag):
            _migrate_done = True
            return
        try:
            import django
            django.setup()
            from django.core.management import call_command
            print('[pdms] Running migrations...')
            call_command('migrate', verbosity=0, interactive=False)
            print('[pdms] Migrations complete. Seeding...')
            # Seed data
            import importlib
            seed = importlib.import_module('seed_data')
            seed.seed()
            with open(_flag, 'w') as f:
                f.write('done')
            print('[pdms] Database ready.')
        except Exception as e:
            print(f'[pdms] Migration/seed error: {e}')
        _migrate_done = True

_ensure_db_ready()

from django.core.wsgi import get_wsgi_application
application = get_wsgi_application()
