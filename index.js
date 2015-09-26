// Default host/port is localhost:27017 (default port for mongodb).
// So, this path is just the database name to use...
var databaseUrl = "cards-dev"; // "username:password@example.com/mydb"
var collections = ['boards', 'meta', 'cards']
var mongojs = require("mongojs")
var db = mongojs(databaseUrl, collections);
var express = require('express');
var app = express();
var Card = require('./card');
var Board = require('./board');
var fs = require('fs')

// Allow retriving params from post requests
app.use( express.bodyParser() )
// The root now serves stuff in the client dir as if it were the root
app.use(express.static(__dirname + '/client'));

// Use jade for templating and expect to find jade template files in ./views
app.set('view engine', 'jade');
app.set('views', './views');

// Creates a new game with some dummy data
app.get('/newboard', function (req, res) {
  var key = "board.latestId";
  getMeta(key, 0, function(boardId) {
    if (!boardId) {
      res.send("Couldn't create new board");
      return;
    }
    boardId.value += 1;
    db.meta.save(boardId);
    var board = Board.create(boardId.value);

    db.cards.find({collection: "playing"}, function(err, cards) {
      if (err) {
        res.send(err);
      } else {
        // console.log(JSON.stringify(cards));
        for (var i = 0; i < cards.length; ++i) {
          delete cards[i]._id;
          board.addCard(cards[i], 200, 200, true);
        }
        db.boards.insert(board);
        res.send("" + board.id);
      }
    });
  });
});

/*
 * Initalizes the database which tells us which cards exist
 * (their IDs, the images used for each card, etc).
 */
app.get('/initdb', function(req, res) {
  res.send("Initializing DB");
  var bulk = db.cards.initializeOrderedBulkOp();
  bulk.find({}).remove()
  // Insert playing cards into DB
  var cardCollection = "playing";
  for (var i = 0; i < 54; i++) {
    bulk.insert(Card.create(i, cardCollection, "img/" + cardCollection, (i+1) + ".png", "b2fv.png"));
  }
  bulk.execute(function(err, results) {
    if (!err) {
      console.log("Cards seeded");
    } else {
      console.log("Error seeding cards: " + err);
    }
  });
});

app.post('/updateboard/:id', function(req, res) {
  console.log("Update request:");
  console.log(req.body);
  var boardId = parseInt(req.params.id);
  db.boards.findOne({id: boardId}, function(err, board) {
    if (err) {
      console.log("error getting board " + boardId);
      res.json({status: "error"});
    } else {
      // Find cards that changed
      var changes = {};
      for (var c in board.cardInstances) {
        var card = board.cardInstances[c];
        var toUpdate = req.body[c];
        if (!toUpdate) {
          continue;
        }

        // TODO: Use util.Diff and then "flatten" to create dots in between
        // TODO: Use util.Diff and then "flatten" to create dots in between
        // TODO: Use util.Diff and then "flatten" to create dots in between
        var keyPrefix = "cardInstances." + c + ".";
        if (card.frontUp && toUpdate.frontUp == 'false') {
          changes[keyPrefix + "frontUp"] = false;
        }
        if (!card.frontUp && toUpdate.frontUp == 'true') {
          changes[keyPrefix + "frontUp"] = true;
        }
        // TODO: Add max boundaries on the cards
        if (parseInt(toUpdate.top) != card.top) {
          changes[keyPrefix + "top"] = parseInt(toUpdate.top);
        }
        if (parseInt(toUpdate.left) != card.left) {
          changes[keyPrefix + "left"] = parseInt(toUpdate.left);
        }
        if (parseInt(toUpdate.zIndex) != card.zIndex) {
          changes[keyPrefix + "zIndex"] = parseInt(toUpdate.zIndex);
        }
        if (toUpdate.hand != card.hand) {
          changes[keyPrefix + "hand"] = toUpdate.hand;
          if (changes[keyPrefix + "hand"] == "") {
            changes[keyPrefix + "hand"] = null;
          }
        }
      }
      console.log("Changes:");
      console.log(changes);
      if (Object.keys(changes).length > 0) {
        db.boards.update({id: boardId}, {$set: changes});
      }
      res.json({status: "ok"});
    }
  });
});

// Prints JSON version of one item (if ID is specified) or a whole collection
app.get('/show/:collection/:id?', function(req, res) {
  var collection = db[req.params.collection]
  if (!collection) {
    res.send("Collection not found: " + req.params.collection);
    return;
  }
  var callback = function(err, result) {
    if (err) {
      res.json(err);
    } else {
      res.json(result);
    }
  }
  if (req.params.id) {
    collection.findOne({id: parseInt(req.params.id)}, callback);
  } else {
    collection.find({}, callback);
  }
});

// Removes an item (if ID is specified) or a whole collection
app.get('/drop/:collection/:id?', function(req, res) {
  var collection = db[req.params.collection]
  if (!collection) {
    res.send("Collection not found: " + req.params.collection);
    return;
  }
  var filter = {}
  if (req.params.id) {
    filter = {id: parseInt(req.params.id)};
  }
  collection.remove(filter, function(err, results) {
    if (err) {
      res.json(err);
    } else {
      res.json(results);
    }
  });
});

function getMeta(key, defaultValue, callback) {
  db.meta.findOne({key: key}, function(err, kv) {
    if (err) {
      callback(null);
    } else if (!kv) {
      callback({key: key, value: defaultValue});
    } else {
      callback(kv);
    }
  });
}

app.get('/showimagedir', function(req, res) {
  dir_in_client = "new_deck_images/tiny";
  ERROR = "ERROR: Could not find files, did you upload files and run script/shrink-images.sh?"
  try {
    files = fs.readdirSync("client/" + dir_in_client);
  } catch (e) {
    res.send(ERROR);
  }
  images = []
  for (var i = 0; i < files.length; ++i) {
    if (files[i].toLowerCase().match(/.*\.(jpg|png|jpeg|gif)/)) {
      images.push(files[i]);
    }
  }
  if (images.length > 0) {
    res.render('new_deck', { dir: dir_in_client, images: images });
  } else {
    res.send(ERROR);
  }
});

app.post('/new_deck', function(req, res) {
  res.send(req.body);
});

var server = app.listen(process.env.port || 3131, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
})
