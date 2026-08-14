from django.urls import path
from . import views

app_name = 'cases'

urlpatterns = [
    path('', views.fir_list, name='fir_list'),
    path('create/', views.fir_create, name='fir_create'),
    path('<int:pk>/', views.fir_detail, name='fir_detail'),
    path('<int:pk>/edit/', views.fir_update, name='fir_update'),
    path('<int:pk>/delete/', views.fir_delete, name='fir_delete'),
    path('<int:pk>/notes/add/', views.add_note, name='add_note'),
    path('<int:pk>/team/add/', views.add_team_member, name='add_team_member'),
    path('<int:pk>/team/<int:member_id>/remove/', views.remove_team_member, name='remove_team_member'),
    path('<int:pk>/evidence/add/', views.add_evidence, name='add_evidence'),
    path('<int:pk>/evidence/<int:evidence_id>/transfer/', views.transfer_evidence, name='transfer_evidence'),
    path('consultations/', views.consultation_list, name='consultation_list'),
    path('consultations/<int:fir_id>/request/', views.request_consultation, name='request_consultation'),
    path('consultations/<int:pk>/respond/', views.respond_consultation, name='respond_consultation'),
]