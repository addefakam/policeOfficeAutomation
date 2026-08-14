from django import forms
from .models import FIR, InvestigationNote, EvidenceItem, CaseTeamMember, ConsultationRequest, Officer
from django.conf import settings


class FIRForm(forms.ModelForm):
    class Meta:
        model = FIR
        fields = [
            'complaint_date', 'complainant_name', 'complainant_phone', 'complainant_address',
            'crime_type', 'crime_description', 'incident_location', 'incident_date',
            'priority', 'assigned_to',
        ]
        widgets = {
            'complaint_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'complainant_name': forms.TextInput(attrs={'class': 'form-control'}),
            'complainant_phone': forms.TextInput(attrs={'class': 'form-control'}),
            'complainant_address': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'crime_type': forms.Select(attrs={'class': 'form-select'}),
            'crime_description': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'incident_location': forms.Textarea(attrs={'class': 'form-control', 'rows': 2}),
            'incident_date': forms.DateInput(attrs={'class': 'form-control', 'type': 'date'}),
            'priority': forms.Select(attrs={'class': 'form-select'}),
            'assigned_to': forms.Select(attrs={'class': 'form-select'}),
        }


class NoteForm(forms.ModelForm):
    class Meta:
        model = InvestigationNote
        fields = ['content', 'note_type']
        widgets = {
            'content': forms.Textarea(attrs={'class': 'form-control', 'rows': 4}),
            'note_type': forms.Select(attrs={'class': 'form-select'}),
        }


class EvidenceForm(forms.ModelForm):
    class Meta:
        model = EvidenceItem
        fields = ['description', 'item_type', 'storage_location']
        widgets = {
            'description': forms.Textarea(attrs={'class': 'form-control', 'rows': 3}),
            'item_type': forms.TextInput(attrs={'class': 'form-control'}),
            'storage_location': forms.TextInput(attrs={'class': 'form-control'}),
        }


class TeamMemberForm(forms.Form):
    officer = forms.ModelChoiceField(
        queryset=Officer.objects.filter(is_active=True),
        widget=forms.Select(attrs={'class': 'form-select'})
    )
    role = forms.CharField(max_length=50, initial='Investigator',
                           widget=forms.TextInput(attrs={'class': 'form-control'}))


class FIRStatusForm(forms.ModelForm):
    class Meta:
        model = FIR
        fields = ['status', 'assigned_to']
        widgets = {
            'status': forms.Select(attrs={'class': 'form-select'}),
            'assigned_to': forms.Select(attrs={'class': 'form-select'}),
        }
