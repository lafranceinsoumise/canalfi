from django.conf import settings
from django.db.models.signals import pre_save
from django.dispatch import receiver
from django.utils.dateparse import parse_duration
from googleapiclient.discovery import build

from canal.models import Video


youtube = build('youtube', 'v3', developerKey=settings.YOUTUBE_API_KEY)


@receiver(pre_save, sender=Video, dispatch_uid='get_duration')
def get_duration(sender, instance, **kwargs):
    video = youtube.videos().list(
        part='contentDetails,snippet',
        id=instance.id
    ).execute()['items'][0]

    instance.duration = parse_duration(video['contentDetails']['duration'])
    instance.yt_title = video['snippet']['title']
    instance.yt_description = video['snippet']['description']
