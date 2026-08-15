"""
Django settings for Police Department Automation System.

Proposal-specified stack: Python (Django) + PostgreSQL + HTML5/CSS3/JS
"""

import os
from pathlib import Path

BASE_DIR = Path(__file__).resolve().parent.parent

SECRET_KEY = os.environ.get(
    'DJANGO_SECRET_KEY',
    'django-insecure-police-dept-automation-x9$k2m!f8n@q7w#j4p'
)

DEBUG = os.environ.get('DJANGO_DEBUG', '').lower() in ('true', '1', 'yes')
ALLOWED_HOSTS = os.environ.get('DJANGO_ALLOWED_HOSTS', '*').split(',')

# Apps
INSTALLED_APPS = [
    'django.contrib.admin',
    'django.contrib.auth',
    'django.contrib.contenttypes',
    'django.contrib.sessions',
    'django.contrib.messages',
    'django.contrib.staticfiles',
    # Local apps
    'core',
    'cases',
    'staff',
    'fleet',
    'reports',
]

MIDDLEWARE = [
    'core.middleware.AutoMigrateMiddleware',
    'django.middleware.security.SecurityMiddleware',
    'django.contrib.sessions.middleware.SessionMiddleware',
    'django.middleware.common.CommonMiddleware',
    'django.middleware.csrf.CsrfViewMiddleware',
    'django.contrib.auth.middleware.AuthenticationMiddleware',
    'django.contrib.messages.middleware.MessageMiddleware',
    'django.middleware.clickjacking.XFrameOptionsMiddleware',
    # Custom audit middleware
    'core.middleware.AuditMiddleware',
]

ROOT_URLCONF = 'config.urls'

TEMPLATES = [{
    'BACKEND': 'django.template.backends.django.DjangoTemplates',
    'DIRS': [BASE_DIR / 'templates'],
    'APP_DIRS': True,
    'OPTIONS': {
        'context_processors': [
            'django.template.context_processors.debug',
            'django.template.context_processors.request',
            'django.contrib.auth.context_processors.auth',
            'django.contrib.messages.context_processors.messages',
            'core.context_processors.global_context',
        ],
    },
}]

WSGI_APPLICATION = 'config.wsgi.application'

# ============================================================
# Database — PostgreSQL (proposal spec) with SQLite fallback
# ============================================================
DATABASES = {
    'default': {
        'ENGINE': 'django.db.backends.sqlite3',
        'NAME': BASE_DIR / 'db.sqlite3',
    }
}

# Override with DATABASE_URL if set (PostgreSQL for production)
# Only use recognized schemes (postgres, mysql, sqlite)
_db_url = os.environ.get('DATABASE_URL', '')
if _db_url and not _db_url.startswith('file:'):
    import dj_database_url
    DATABASES['default'] = dj_database_url.config()

# ============================================================
# Custom Auth — use our CustomUser model
# ============================================================
AUTH_USER_MODEL = 'core.CustomUser'

# ============================================================
# Password validation — relaxed for demo, tighten in production
# ============================================================
AUTH_PASSWORD_VALIDATORS = [
    {'NAME': 'django.contrib.auth.password_validation.MinimumLengthValidator',
     'OPTIONS': {'min_length': 6}},
]

# ============================================================
# Internationalization
# ============================================================
LANGUAGE_CODE = 'en-us'
TIME_ZONE = 'Africa/Addis_Ababa'
USE_I18N = True
USE_TZ = True

# ============================================================
# Static files
# ============================================================
STATIC_URL = '/static/'
STATICFILES_DIRS = [BASE_DIR / 'static']
STATIC_ROOT = BASE_DIR / 'staticfiles'

# ============================================================
# Media files
# ============================================================
MEDIA_URL = '/media/'
MEDIA_ROOT = BASE_DIR / 'media'

# ============================================================
# Login / Logout
# ============================================================
LOGIN_URL = '/login/'
LOGIN_REDIRECT_URL = '/'
LOGOUT_REDIRECT_URL = '/login/'

# ============================================================
# Default auto field
# ============================================================
DEFAULT_AUTO_FIELD = 'django.db.models.BigAutoField'

# ============================================================
# Logging — critical for debugging Vercel serverless 500 errors
# ============================================================
LOGGING = {
    'version': 1,
    'disable_existing_loggers': False,
    'formatters': {
        'verbose': {
            'format': '[%(asctime)s] %(levelname)s [%(name)s] %(message)s',
        },
    },
    'handlers': {
        'console': {
            'class': 'logging.StreamHandler',
            'formatter': 'verbose',
        },
    },
    'root': {
        'handlers': ['console'],
        'level': 'INFO',
    },
    'loggers': {
        'django': {'level': 'WARNING'},
        'core': {'level': 'DEBUG'},
    },
}

# Custom 500 handler so we can see errors even with DEBUG=False
handler500 = 'config.views.server_error'
