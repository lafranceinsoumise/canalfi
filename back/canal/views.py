from django.http import JsonResponse
from django.utils import timezone
from django.views import View

from canal.models import List


class Schedule(View):
    def get(self, request):
        schedule = List.objects.filter(start_date__lt=timezone.now()).prefetch_related('videos').first()

        response = JsonResponse({
            'referenceDate': schedule.start_date,
            'schedule': [
                {'id': video.id, 'duration': video.duration} for video in schedule.videos.all()
            ]
        })
        response["Access-Control-Allow-Origin"] = "*"

        return response
