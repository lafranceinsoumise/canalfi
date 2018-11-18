from django.contrib import admin
from django.db import transaction
from django.http import Http404, HttpResponseRedirect, HttpResponseBadRequest
from django.urls import path, reverse
from django.utils.html import format_html
from django.utils.safestring import mark_safe
from django.utils.translation import gettext as _
from ordered_model.admin import OrderedTabularInline, OrderedInlineModelAdminMixin

from canal.models import Video, List, ListedProgram, LiveStream


@admin.register(Video)
class VideoAdmin(admin.ModelAdmin):
    list_display = ('yt_title', 'duration')
    readonly_fields = ('yt_title', 'display_thumbnail', 'yt_description', 'duration')
    fields = ('id',) + readonly_fields
    exclude = ('yt_etag',)
    search_fields = ('yt_title',)

    def display_thumbnail(self, instance):
        return format_html("<img src={} />", instance.yt_thumbnail)
    display_thumbnail.short_description = _("Youtube thumbnail")


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


@admin.register(LiveStream)
class LiveStreamAdmin(admin.ModelAdmin):
    list_display = ('yt_title', 'estimated_start_time', 'estimated_end_time', 'is_live')
    readonly_fields = ('is_live', 'send_live_button', 'yt_title', 'display_thumbnail', 'yt_description')
    exclude = ('yt_etag',)
    fields = ('id', 'estimated_start_time', 'estimated_end_time', ) + readonly_fields

    def send_live_button(self, instance):
        if instance.id is None:
            return mark_safe('-')
        return format_html('<input type="submit" value="{}" name="send_live" />',
                           _("Send live")
                           )

    def display_thumbnail(self, instance):
        return format_html("<img src={} />", instance.yt_thumbnail)
    display_thumbnail.short_description = _("Youtube thumbnail")

    def change_view(self, request, object_id, form_url='', extra_context=None):
        if not request.POST.get('send_live'):
            return super().change_view(request, object_id, form_url, extra_context)

        live_stream = self.get_object(request, object_id)

        if live_stream is None:
            raise Http404(_("No live stream with this ID."))

        with transaction.atomic():
            LiveStream.objects.all().update(is_live=False)
            live_stream.is_live = True
            live_stream.save()

        return HttpResponseRedirect(reverse('admin:canal_livestream_changelist', args=[object_id]))
