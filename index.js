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
app.get('/newboard/:cardCollection', function (req, res) {
  var key = "board.latestId";
  getMeta(key, 0, function(boardId) {
    if (!boardId) {
      res.send("Couldn't create new board");
      return;
    }
    boardId.value += 1;
    db.meta.save(boardId);
    var board = Board.create(boardId.value);

    res.set('Content-Type', 'text/plain');
    db.cards.find({collection: req.params.cardCollection}, function(err, cards) {
      if (err) {
        res.send("Error looking up cards in collection: " + err);
      } else if (cards.length == 0) {
        res.send("Could not find cards for collection: " + req.params.cardCollection);
      } else {
        // console.log(JSON.stringify(cards));
        for (var i = 0; i < cards.length; ++i) {
          delete cards[i]._id;
          board.addCard(cards[i], 200, 200, true);
        }
        db.boards.insert(board);
        res.send("Created new board: " + "\n\n" + prettyJson(board));
      }
    });
  });
});

/*
 * Initalizes the database which tells us which cards exist
 * (their IDs, the images used for each card, etc).
 */
app.get('/initdb', function(req, res) {
  res.send("Initializing DB (clearing everything). Visit /loadcollection/<name>" +
    " to add cards to the database, then use /newboard/<name> to create a new" +
    " board with that collection");
  var bulk = db.cards.initializeOrderedBulkOp();
  bulk.find({}).remove()
});

// Load a given collection of cards into the database (doesn't create a board)
app.get('/loadcollection/:name', function(req, res) {
  var collection = req.params.name;
  var jsonString = fs.readFileSync("collections/" + collection + ".json");
  var cardList = JSON.parse(jsonString);
  var bulk = db.cards.initializeOrderedBulkOp();
  for (var i in cardList) {
    bulk.insert(cardList[i]); // Items assumed to be created with card.Create()
  }
  res.set('Content-Type', 'text/plain');
  bulk.execute(function(err, results) {
    if (!err) {
      res.send("Seeded cards: " + JSON.stringify(cardList, null, 2));
    } else {
      res.send("DB ERROR when seeding cards: " + err);
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
          if (toUpdate.hand != "")  {
            // If the client is setting the hand to null or to another
            // player's name, make the change.
            changes[keyPrefix + "hand"] = toUpdate.hand;
          } else if (card.hand != null && toUpdate.hand == "") {
            // When the server says the card is owned (has a hand) and
            // the client wants to say it doesn't have a hand, we must
            // explicitly set it to null so it gets deleted in the update below.
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
  dir_in_client = "new_deck_images/shrink";
  SIZE="medium";
  ERROR = "ERROR: Could not find files, did you upload files and run script/shrink-images.sh?"
  try {
    files = fs.readdirSync("client/" + dir_in_client);
  } catch (e) {
    res.send(ERROR);
  }
  images = []
  for (var i = 0; i < files.length; ++i) {
    if (files[i].toLowerCase().match(new RegExp("^" + SIZE + ".*\.(jpg|png|jpeg|gif)"))) {
      images.push(files[i]);
    }
  }
  if (images.length > 0) {
    res.render('new_deck', { dir: "../" /* To remove the showimgdir in path */ + dir_in_client,
                             images: images });
  } else {
    res.send(ERROR);
  }
});

/*
 * Input: {
 *   "copies-foo.jpg": "1",
 *   "is_cardback-foo.jpg: "default",
 *   "is_cardback-bar.jpg: "",
 *   "copies-bar.jpg: "", }
 *
 * Outputs a list of Cards with the appropriate front and back images
 *
 */
app.post('/new_deck', function(req, res) {
  if (req.body.collection == undefined || !req.body.collection.match(/[A-Za-z0-9_]+/)) {
    res.send("ERROR: MUST SET A COLLECTION NAME with only [A-Za-z0-9_] characters");
    return;
  }
  props = {}
  /* Create an intermediate variable like
   * { "copies" : {"bar.jpg" : "1", ...}
   *   "is_cardback" : {"foo.jpg" : "default", ...} }
   */
  PREFIXES = ['copies', 'which_cardback', 'is_cardback']
  for (var i in PREFIXES) {
    props[PREFIXES[i]] = {}
  }
  for (var key in req.body) {
    for (var i in PREFIXES) {
      var regex = new RegExp("^" + PREFIXES[i] + "-");
      if (key.match(regex)) {
        file = key.replace(regex, "");
        value = req.body[key];
        props[PREFIXES[i]][file] = value;
        break;
      }
    }
  }

  cardbacks = {}
  for (var file in props.is_cardback) {
    var name = props.is_cardback[file].trim();
    if (name != "" && name != undefined) {
      cardbacks[name] = file;
      if (!(file in props.copies)) {
        res.send("ERROR: file '"+ file +"' not found for cardback '" + name + "'");
      }
    }
  }

  // Now, create the cardsk
  var cardId = 0;
  output = []  //  A list of card.js objects
  for (var file in props.copies) {
    var num = parseInt(props.copies[file]);
    if (!isNaN(num) && num > 0) {
      if (num > 1000) {
        res.send("ERROR: too many copies: " + num);
      }

      var cardback = props.which_cardback[file];
      if (cardback == undefined || cardback == "") {
        res.send("ERROR: No cardback specified for card: " + file);
      }

      if (! (cardback in cardbacks)) {
        res.send("ERROR: Could not find cardback '" + cardback + "' for file " + file + ". Options are: " + JSON.stringify(cardbacks));
        return;
      }
      var cardbackFile = cardbacks[cardback];
      var collection = req.body.collection
      for (var i = 0; i < num; ++i) {
        var base = "img/" + collection + "/";
        output.push(Card.create(cardId, collection, base + file, base + cardbackFile));
        ++cardId;
      }
    }
  }
  var col = req.body.collection;
  var outDir = "client/img/" + col;
  MSG = "Please run the following:" +
    "\n\n    mkdir -p " + outDir +
    "\n    cp client/new_deck_images/shrink/* " + outDir +
    "\n\n\nThen paste the JSON below into: " +
    "\n\n    ./collections/" + col + ".json" +
    "\n\nThen visit \n\n    /loadcollection/" + col;

  res.set('Content-Type', 'text/plain');
  res.send(MSG + "\n\n" + prettyJson(output));
});

function prettyJson(obj) {
  return JSON.stringify(obj,
      null /* Print all fields */,
      2 /* 2 spaces for indenting */);
}

var server = app.listen(process.env.port || 3131, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
})
