from django.urls import path
from . import views

app_name = 'fleet'

urlpatterns = [
    path('vehicles/', views.vehicle_list, name='vehicle_list'),
    path('vehicles/create/', views.vehicle_create, name='vehicle_create'),
    path('vehicles/<int:pk>/', views.vehicle_detail, name='vehicle_detail'),
    path('vehicles/<int:pk>/assign/', views.vehicle_assign, name='vehicle_assign'),
    path('vehicles/<int:pk>/fuel/', views.fuel_log_create, name='fuel_log'),
    path('vehicles/<int:pk>/maintenance/', views.maintenance_create, name='maintenance_create'),
    path('equipment/', views.equipment_list, name='equipment_list'),
    path('equipment/create/', views.equipment_create, name='equipment_create'),
]