from django.db import models
from django.db.models import Sum
from django.utils.timezone import localtime
from django.utils.translation import gettext as _

from ordered_model.models import OrderedModel


class Video(models.Model):
    id = models.CharField(_("video ID"), max_length=11, primary_key=True)
    yt_etag = models.CharField(_("Youtube etag"), max_length=255)
    yt_title = models.CharField(_("Youtube title"), max_length=100)
    yt_description = models.TextField(_("Youtube description"), max_length=5000)
    yt_thumbnail = models.URLField(_("Youtube thumbnail"))
    duration = models.DurationField(_("duration"))

    def __str__(self):
        return self.yt_title

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
        return super().get_queryset().annotate(duration=Sum('videos__duration'))


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
