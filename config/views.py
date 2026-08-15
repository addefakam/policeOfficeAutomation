"""Custom error handlers — so we can see 500 errors even with DEBUG=False."""
import logging
import traceback

logger = logging.getLogger(__name__)


def server_error(request, *args, **kwargs):
    """
    Custom 500 handler that logs the full traceback and returns an
    HTML page with the error details visible (for demo debugging).
    """
    import sys
    from django.http import HttpResponseServerError

    exc_info = sys.exc_info()
    tb_text = ''.join(traceback.format_exception(*exc_info)) if exc_info[1] else 'No exception info'
    logger.error('=== 500 SERVER ERROR ===\n%s', tb_text)

    html = f"""<!DOCTYPE html>
<html><head><title>Server Error (500)</title>
<style>
  body {{ font-family: monospace; background: #1a1a2e; color: #e0e0e0; padding: 2rem; }}
  h1 {{ color: #ff6b6b; }}
  pre {{ background: #16213e; padding: 1rem; border-radius: 8px;
        overflow-x: auto; white-space: pre-wrap; font-size: 0.85rem; }}
  .hint {{ color: #888; margin-top: 1rem; font-size: 0.9rem; }}
</style></head>
<body>
<h1>Server Error (500)</h1>
<p>The application encountered an error. Details below:</p>
<pre>{tb_text}</pre>
<p class="hint">If this page shows, set DJANGO_DEBUG=true in Vercel env vars for the standard Django debug page.</p>
</body></html>"""
    return HttpResponseServerError(html, content_type='text/html')
