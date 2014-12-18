#!/bin/bash

# This lets us run the server with auto-reloading after code changes
# ./node_modules/forever/bin/forever index.js -w --watchDirectory `pwd`
./node_modules/nodemon/bin/nodemon.js
