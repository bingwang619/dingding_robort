#! /bin/sh

nohup redis-server &
nohup celery -A celery_worker worker -B &
