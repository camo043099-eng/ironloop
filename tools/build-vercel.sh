#!/bin/bash
set -e
curl -sL https://johnvansickle.com/ffmpeg/releases/ffmpeg-release-amd64-static.tar.xz -o /tmp/ff.tar.xz
tar -xJf /tmp/ff.tar.xz -C /tmp
export PATH=$(ls -d /tmp/ffmpeg-*-amd64-static):$PATH
ffmpeg -version | head -1
git clone --depth 1 https://github.com/camo043099-eng/exercises-dataset.git dataset
python3 tools/preparar_media.py dataset
