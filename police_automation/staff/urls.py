from django.urls import path
from . import views

app_name = 'staff'

urlpatterns = [
    path('officers/', views.officer_list, name='officer_list'),
    path('attendance/', views.mark_attendance, name='attendance'),
    path('leaves/', views.leave_request_list, name='leave_list'),
    path('leaves/create/', views.leave_request_create, name='leave_create'),
    path('leaves/<int:pk>/<str:action>/', views.leave_request_respond, name='leave_respond'),
    path('duty/', views.duty_assignment_list, name='duty_list'),
    path('duty/create/', views.duty_assignment_create, name='duty_create'),
]