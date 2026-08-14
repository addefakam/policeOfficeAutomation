#!/bin/bash
set -e

echo "=== Running migrations ==="
python manage.py migrate --no-input 2>&1 || {
  echo "WARNING: migrate failed, trying with --run-syncdb"
  python manage.py migrate --run-syncdb --no-input 2>&1
}

echo "=== Collecting static files ==="
python manage.py collectstatic --no-input 2>&1

echo "=== Build complete ==="