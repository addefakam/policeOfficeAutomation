from django import template
from ..models import ROLE_HIERARCHY, ROLE_CHOICES

register = template.Library()

ROLE_LABELS = {code: label for code, label in ROLE_CHOICES}
ROLE_COLORS = {
    'ADMIN': 'danger', 'STATION_COMMANDER': 'warning',
    'INVESTIGATOR': 'primary', 'CLERK': 'secondary',
}


@register.filter
def role_badge(role):
    """Return HTML badge for a role."""
    label = ROLE_LABELS.get(role, role)
    color = ROLE_COLORS.get(role, 'secondary')
    return f'<span class="badge bg-{color}">{label}</span>'


@register.filter
def has_role(user, min_role):
    """Check if user has at least the given role."""
    if not user or not user.is_authenticated:
        return False
    return user.has_min_role(min_role)


@register.simple_tag
def role_color(role):
    return ROLE_COLORS.get(role, 'secondary')


@register.filter
def get_item(dictionary, key):
    """Dictionary lookup by variable key in templates."""
    if dictionary is None:
        return None
    return dictionary.get(key)


@register.filter
def days_between(end_date, start_date):
    """Calculate the number of days between two dates (inclusive)."""
    if not end_date or not start_date:
        return 0
    return (end_date - start_date).days + 1
