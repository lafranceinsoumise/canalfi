from django.http import JsonResponse
from django.utils import timezone
from django.views import View

from canal.models import List


class Schedule(View):
    def get(self, request):
        schedules = List.objects.filter(start_date__lt=timezone.now()).prefetch_related('videos')

        response = JsonResponse({
            'referenceDate': schedules.first().start_date,
            'schedule': [
                {
                    'id': video.id,
                    'duration': video.duration,
                    'thumbnail': video.yt_thumbnail
                } for schedule in schedules for video in schedule.videos.all()
            ]
        })
        response["Access-Control-Allow-Origin"] = "*"

        return response
