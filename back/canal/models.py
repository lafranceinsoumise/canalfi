from datetime import timedelta

from django.conf import settings
from django.core.exceptions import ValidationError
from django.db import models
from django.db.models import Sum
from django.db.models.functions import Coalesce
from django.utils.dateparse import parse_duration
from django.utils.timezone import localtime
from django.utils.translation import gettext as _
from googleapiclient.discovery import build

from ordered_model.models import OrderedModel

youtube = build('youtube', 'v3', developerKey=settings.YOUTUBE_API_KEY)


class YTVideoDoesNotExist(ValidationError):
    pass


class YTVideoIsNotLiveStream(ValidationError):
    pass


class YTVideoIsLiveStream(ValidationError):
    pass


class AbstractVideo(models.Model):
    id = models.CharField(_("video ID"), max_length=11, primary_key=True)
    yt_etag = models.CharField(_("Youtube etag"), max_length=255)
    yt_title = models.CharField(_("Youtube title"), max_length=100)
    yt_description = models.TextField(_("Youtube description"), max_length=5000)
    yt_thumbnail = models.URLField(_("Youtube thumbnail"))

    def clean(self):
        super().clean()

        try:
            yt_infos = youtube.videos().list(
                part='contentDetails,snippet',
                id=self.id
            ).execute()['items'][0]
        except IndexError:
            raise YTVideoDoesNotExist(_('This video does not exist.'))

        self.yt_title = yt_infos['snippet']['title']
        self.yt_description = yt_infos['snippet']['description']
        t = yt_infos['snippet']['thumbnails']
        self.yt_thumbnail = t.get('high', t.get('standard', t.get('medium', t.get('default'))))['url']

        return yt_infos

    class Meta:
        abstract = True


class Video(AbstractVideo):
    duration = models.DurationField(_("duration"))

    def __str__(self):
        return self.yt_title

    def clean(self):
        yt_infos = super().clean()

        self.duration = parse_duration(yt_infos['contentDetails']['duration'])
        if self.duration == timedelta():
            raise YTVideoIsLiveStream(_('This video is a live stream.'))

    class Meta:
        verbose_name = _("video")
        verbose_name_plural = _("videos")


class ListedProgram(OrderedModel):
    video = models.ForeignKey('Video', on_delete=models.CASCADE, related_name='programs')
    list = models.ForeignKey('List', on_delete=models.CASCADE, related_name='programs')
    order_with_respect_to = 'list'

    def __str__(self):
        return str(self.video)

    class Meta(OrderedModel.Meta):
        verbose_name = _('listed program')
        verbose_name_plural = _('listed programs')
        ordering =('list', 'order')


class ListManager(models.Manager):
    def get_queryset(self):
        return super().get_queryset().annotate(duration=Coalesce(Sum('videos__duration'), 0))


class List(models.Model):
    objects = ListManager()
    name = models.CharField(_("name"), max_length=255)
    videos = models.ManyToManyField('Video', verbose_name=_("videos"), through=ListedProgram)
    start_date = models.DateTimeField(_("starting time"), blank=True, null=True)

    @property
    def end_date(self):
        if self.start_date is None:
            return None
        return localtime(self.start_date + self.duration)
    end_date.fget.short_description = _("end date")

    def __str__(self):
        return self.name

    class Meta:
        ordering = ['-start_date']
        verbose_name = _("list")
        verbose_name_plural = _("lists")


class LiveStream(AbstractVideo):
    estimated_start_time = models.DateTimeField(_("estimated start time"), blank=True, null=True)
    estimated_end_time = models.DateTimeField(_("estimated end time"), blank=True, null=True)
    is_live = models.BooleanField(_("live now"), default=False)

    def clean(self):
        yt_infos = super().clean()

    class Meta:
        verbose_name = _("live stream")
        verbose_name_plural = _("live streams")
