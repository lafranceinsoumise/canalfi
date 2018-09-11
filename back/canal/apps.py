from django.apps import AppConfig


class CanalConfig(AppConfig):
    name = 'canal'

    def ready(self):
        from . import signals
