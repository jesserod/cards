#!/bin/bash

if [[ $1 == '-h' ]]; then
  echo "usage: [port=1234] ./run.sh"
  exit 1
fi

# This lets us run the server with auto-reloading after code changes
# ./node_modules/forever/bin/forever index.js -w --watchDirectory `pwd`
./node_modules/nodemon/bin/nodemon.js --ignore client
