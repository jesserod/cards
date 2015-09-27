#!/bin/bash

SHRINK_DIR=shrink
MEDIUM_WIDTH=180
SMALL_WIDTH=120
TINY_WIDTH=60

if [[ $1 == '' || $1 == '-h' ]]; then
  echo "args: <base dir>"
  echo "Creates subdir $SHRINK_DIR in <base dir>with smaller versions of images there"
  echo "of the images in <base dir> with widths equal to"
  echo "${MEDIUM_WIDTH}px (medium) ${SMALL_WIDTH}px (small) and ${TINY_WIDTH}px (tiny)."
  echo "NOTE: Assumes system has ImageMagick 6.5.7-8 2010-12-02 Q16 http://www.imagemagick.org"
  echo "to use the convert utility"

  exit 1
fi

mkdir -p $1/$SHRINK_DIR

for f in $1/*.{jpg,JPG,JPEG,jpeg,png,PNG}; do
  if [[ ! "$f" =~ '*' ]]; then  # Skip missing file formats
    # imagemagick convert
    convert "$f" -thumbnail ${TINY_WIDTH}x8000 -unsharp 0x.5 -auto-orient "$1/$SHRINK_DIR/tiny-`basename $f`";
    convert "$f" -thumbnail ${SMALL_WIDTH}x8000 -unsharp 0x.5 -auto-orient "$1/$SHRINK_DIR/small-`basename $f`";
    convert "$f" -thumbnail ${MEDIUM_WIDTH}x8000 -unsharp 0x.5 -auto-orient "$1/$SHRINK_DIR/medium-`basename $f`";
  fi
done
