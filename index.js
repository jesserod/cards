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

// Allow retriving params from post requests
app.use( express.bodyParser() )
// The root now serves stuff in the client dir as if it were the root
app.use(express.static(__dirname + '/client'));

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
    db.cards.findOne({id: 1}, function(err, card) {
      if (err) {
        res.send(err);
      } else {
        delete card._id;
        console.log(JSON.stringify(card));
        board.addCard(card, 0, 0, true);
        board.addCard(card, 20, 0, true);
        board.addCard(card, 40, 0, false);
        board.addCard(card, 60, 0, true, "foo");
        board.addCard(card, 80, 0, true, "bar");
        db.boards.insert(board);
        res.send("" + board.id);
      }
    });
  });
});

// Initalizes the database
app.get('/initdb', function(req, res) {
  res.send("Initializing DB");
  var bulk = db.cards.initializeOrderedBulkOp();
  bulk.find({}).remove()
  bulk.insert(Card.create(1));
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

var server = app.listen(process.env.port || 3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
})
