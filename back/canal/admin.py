from django.contrib import admin
from django.utils.translation import gettext as _
from ordered_model.admin import OrderedTabularInline, OrderedInlineModelAdminMixin

from canal.models import Video, List, ListedProgram


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('yt_title', 'duration')
    readonly_fields = ('yt_title', 'yt_description', 'duration')
    exclude = ('yt_etag',)
    search_fields = ('yt_title',)


class ListedProgramInline(OrderedTabularInline):
    model = ListedProgram
    fields = ('video', 'video_duration', 'order', 'move_up_down_links')
    readonly_fields = ('video_duration', 'order', 'move_up_down_links',)
    extra = 1
    autocomplete_fields = ('video',)
    ordering = ('order',)

    def video_duration(self, instance):
        return instance.video.duration
    video_duration.short_description = _("video duration")


@admin.register(List)
class ListAdmin(OrderedInlineModelAdminMixin, admin.ModelAdmin):
    filter_horizontal = ('videos',)
    readonly_fields = ('duration', 'end_date')
    list_display = ('name', 'start_date', 'duration', 'end_date')
    actions = ['auto_reschedule']
    inlines = [ListedProgramInline]

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
