# Generated by Django 2.1.1 on 2018-10-26 16:25

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('canal', '0002_auto_20180924_1542'),
    ]

    operations = [
        migrations.CreateModel(
            name='LiveStream',
            fields=[
                ('id', models.CharField(max_length=11, primary_key=True, serialize=False, verbose_name='identifiant de la vidéo')),
                ('yt_etag', models.CharField(max_length=255, verbose_name='Etag Youtube')),
                ('yt_title', models.CharField(max_length=100, verbose_name='titre Youtube')),
                ('yt_description', models.TextField(max_length=5000, verbose_name='description Youtube')),
                ('yt_thumbnail', models.URLField(verbose_name='Youtube thumbnail')),
                ('estimated_start_time', models.DateTimeField(blank=True, null=True, verbose_name='estimated start time')),
                ('estimated_end_time', models.DateTimeField(blank=True, null=True, verbose_name='estimated end time')),
                ('is_live', models.BooleanField(default=False, verbose_name='live now')),
            ],
            options={
                'verbose_name': 'live stream',
                'verbose_name_plural': 'live streams',
            },
        ),
    ]
