# BUILD: docker build --no-cache -t ubuntu_python3 .
# TEST: docker run --rm -it -v $(pwd):/content ubuntu_python3 /bin/bash 
# PROD: docker run -v $(pwd):/content ubuntu_python3

FROM ubuntu:16.04

COPY ./requirements.txt /
COPY ./mirrors/ubuntu16.04.source.list /etc/apt/sources.list
COPY ./mirrors/pip.conf /etc/pip.conf

RUN apt-get update && apt-get install -y \
    python3 \
    python3-setuptools \
    python3-pip \
    redis-server \
    wget \
    && apt-get purge -y --auto-remove \
    && pip3 install --upgrade pip \
    && pip3 install -r requirements.txt

VOLUME content
WORKDIR content
CMD ["bash", "start.sh"]
