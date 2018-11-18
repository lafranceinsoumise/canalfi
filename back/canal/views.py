from django.http import JsonResponse
from django.utils import timezone
from django.views import View

from canal.models import List, LiveStream


class Schedule(View):
    def get(self, request):
        current_schedule = List.objects.filter(start_date__lt=timezone.now())\
            .order_by('-start_date').prefetch_related('videos').first()
        next_schedules = List.objects.filter(start_date__gt=timezone.now()).prefetch_related('videos')
        schedules = [current_schedule, *next_schedules] if current_schedule else next_schedules
        live_stream = LiveStream.objects.filter(is_live=True).last()

        return JsonResponse({
            'liveStream': live_stream.id if live_stream is not None else None,
            'referenceDate': schedules[0].start_date if len(schedules) > 0 else None,
            'schedule': [
                {
                    'id': video.id,
                    'duration': video.duration,
                    'thumbnail': video.yt_thumbnail,
                    'title': video.yt_title,
                } for schedule in schedules for video in schedule.videos.all()
            ]
        })
