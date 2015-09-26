#!/bin/bash

TINY_DIR=tiny
SMALL_DIR=small
SMALL_WIDTH=120
TINY_WIDTH=60

if [[ $1 == '' || $1 == '-h' ]]; then
  echo "args: <base dir>"
  echo "Creates subdirs $SMALL_DIR and $TINY_DIR in <base dir>with smaller versions of images there"
  echo "of the images in <base dir> with widths equal to ${SMALL_WIDTH}px and ${TINY_WIDTH}px, respectively"
  echo "NOTE: Assumes system has ImageMagick 6.5.7-8 2010-12-02 Q16 http://www.imagemagick.org"
  echo "to use the convert utility"

  exit 1
fi

mkdir -p $1/tiny
mkdir -p $1/small

for f in $1/*.{jpg,JPG,JPEG,jpeg,png,PNG}; do
  if [[ ! "$f" =~ '*' ]]; then  # Skip missing file formats
    # imagemagick convert
    convert "$f" -thumbnail ${TINY_WIDTH}x8000 -unsharp 0x.5 -auto-orient "$1/$TINY_DIR/tiny-`basename $f`";
    convert "$f" -thumbnail ${SMALL_WIDTH}x8000 -unsharp 0x.5 -auto-orient "$1/$SMALL_DIR/small-`basename $f`";
  fi
done
