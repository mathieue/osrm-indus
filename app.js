var express = require('express');
var redis = require('redis');
var db = redis.createClient(),
  client = redis.createClient();

var app = express();
app.set('api key', '42h4ckcess');
app.use(checkAuth);

app.configure(function () {
  
  app.set('view engine', 'jade');
  app.set('view options', { layout: false });

});


client.on("error", function (err) {
    console.log("Error on redis ! " + err);
});

function checkAuth (req, res, next) {
  console.log('checkAuth ' + req.url);
 
  // don't serve /secure to those not logged in
  // you should add to this list, for each and every secure url
  if (req.query.apikey != 42) {
    res.end('unauthorised');
    return;
  }
 
  next();
}
 
app.get('/', function(req, res){
  var body = {msg: 'hello osm world !' };
  res.end(JSON.stringify(body));

});

app.listen(3000);
console.log('Listening on port 3000');