from django.urls import path
from . import views

app_name = 'reports'

urlpatterns = [
    path('', views.dashboard_report, name='dashboard_report'),
    path('export/<str:report_type>/', views.export_report, name='export'),
]