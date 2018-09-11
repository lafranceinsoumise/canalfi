from django.contrib import admin
from django.utils.translation import gettext as _

from canal.models import Video, List


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('yt_title', 'duration')
    readonly_fields = ('yt_title', 'yt_description', 'duration')
    exclude = ('yt_etag',)


@admin.register(List)
class ListAdmin(admin.ModelAdmin):
    filter_horizontal = ('videos',)
    readonly_fields = ('duration', 'end_date')
    list_display = ('name', 'start_date', 'duration', 'end_date')
    actions = ['auto_reschedule']

    def auto_reschedule(self, request, queryset):
        previous = List.objects.exclude(id__in=queryset.values('id')).first()
        if previous is None:
            return
        for video_list in queryset:
            video_list.start_date = previous.end_date
            video_list.save()
            previous = video_list

    auto_reschedule.short_description = _("Auto re-schedule")

    def duration(self, instance):
        return instance.duration
    duration.short_description = _("duration")
