// Default host/port is localhost:27017 (default port for mongodb).
// So, this path is just the database name to use
var databaseUrl = "cards-dev"; // "username:password@example.com/mydb"
var collections = ['states']
var mongojs = require("mongojs")
var db = mongojs(databaseUrl, collections);
var express = require('express');
var app = express();

// The root now serves stuff in the client dir as if it were the root
app.use(express.static(__dirname + '/client'));

app.get('/state/:id', function (req, res) {
  db.states.findOne({id: req.params.id}, function(err, state) {
    var output = {};
    if (err || !state) {
      console.log("Not found");
    } else {
      output = state;
    }
    res.json(output);
  });
})

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
