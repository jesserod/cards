// Default host/port is localhost:27017 (default port for mongodb).
// So, this path is just the database name to use
var databaseUrl = "cards-dev"; // "username:password@example.com/mydb"
var collections = ['boards', 'meta', 'cards']
var mongojs = require("mongojs")
var db = mongojs(databaseUrl, collections);
var express = require('express');
var app = express();
var Card = require('./card');
var Board = require('./board');

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
    board.addCard(1, 0, 0);
    board.addCard(1, 60, 0);
    board.addCard(1, 120, 0);
    db.boards.insert(board);
    res.send("" + board.id);
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

// Prints JSON version of one item (if ID is specified) or a whole collection
app.get('/show/:collection/:id?', function(req, res) {
  var collection = db[req.params.collection]
  if (!collection) {
    res.send("Collection not found: " + req.params.collection);
    return;
  }
  var filter = {}
  if (req.params.id) {
    filter = {id: parseInt(req.params.id)};
  }
  collection.find(filter, function(err, results) {
    if (err) {
      res.json(err);
    } else {
      res.json(results);
    }
  });
});

// Removes an item (if ID is specified) or a whole collection
app.get('/drop/:collection/:id?', function(req, res) {
  var collection = db[req.params.collection]
  if (!collection) {
    res.send("Collection not found: " + req.params.collection);
    return;
  }
  var bulk = collection.initializeOrderedBulkOp();
  var filter = {}
  if (req.params.id) {
    filter = {id: parseInt(req.params.id)};
  }
  bulk.find(filter).remove();
  bulk.execute(function(err, results) {
    if (err) {
      res.json(err);
    } else {
      res.json(results);
    }
  })
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

/*

app.get('/users', function (req, res) {
  // res.send('Got a GET request');
  var resp = {bar: "asdf"}
  db.users.find({}, function(err, users) {
    if( err || !users) console.log("No users found");
    else users.forEach( function(maleUser) {
      resp.bar = resp.bar + JSON.stringify(maleUser);
    } );
    console.log(resp.bar);
    res.send(resp.bar);
  });
})

app.get('/getuser/:id', function (req, res) {
  res.send("Finding with id " + req.params.id)
  db.users.find({id: req.params.id}, function(err, users) {
    console.log("here... " + req.params.id)
    console.log(users);
    if( err || !users || users.length == 0) {
      res.send("No matching users found");
    }
    else {
    console.log("foreach");
    users.forEach( function(maleUser) {
      res.send(maleUser);
    } );
    console.log("done foreach");
    }
  });
})

// accept POST (create) request
// app.post('/createuser', function (req, res) {
app.get('/createuser/:id', function (req, res) {
  res.send('Got a POST request');
  db.users.save({id: req.params.id, email: "srirangan@gmail.com", password: "iLoveMongo", sex: "male"}, function(err, saved) {
    if( err || !saved ) console.log("User not saved");
    else console.log("User saved");
  });

})

// accept PUT (update) request
// app.put('/update', function (req, res) {
app.get('/update', function (req, res) {
  res.send('Got a PUT request at /user');
  db.users.update({email: "srirangan@gmail.com"}, {$set: {password: "iReallyLoveMongo"}}, {multi: true}, function(err, updated) {
    if( err || !updated ) console.log("User not updated");
      else console.log("User updated");
  });

})

// accept DELETE request at /user
// app.delete('/deleteuser', function (req, res) {
app.get('/deleteuser', function (req, res) {
  res.send('Got a DELETE request at /user');
  db.users.find({sex: "male"}, function(err, users) {
    if( err || !users) console.log("No male users found");
    else users.forEach( function(maleUser) {
      console.log(maleUser);
    });
  }).remove();
})
*/

var server = app.listen(process.env.port || 3000, function () {
  var host = server.address().address
  var port = server.address().port
  console.log('App listening at http://%s:%s', host, port)
})
