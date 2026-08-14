from django.contrib import admin
from django.urls import path, include

urlpatterns = [
    path('admin/', admin.site.urls),
    path('', include('core.urls')),
    path('cases/', include('cases.urls')),
    path('staff/', include('staff.urls')),
    path('fleet/', include('fleet.urls')),
    path('reports/', include('reports.urls')),
]
