var express = require('express');
var redis = require('redis');
var db = redis.createClient(),
  client = redis.createClient();

var http = require('http');

var util  = require('util'),
    spawn = require('child_process').spawn;

var fs = require('fs');

var exec = require('child_process').exec;

var kue = require('kue')
  , jobs = kue.createQueue();

var app = express();
app.set('api key', '42h4ckcess');
app.use(checkAuth);



jobs.process('buildprofile', function(job, done){
  console.log('processing ' + job.data.profileid);
  
  var profileid = job.data.profileid;

  client.get('profiles:' + profileid, function (err, data) {

    client.get('ports:' + profileid, function (err, port) {
  
      console.log('port on : ' + port);
       
        
       fs.writeFile("/tmp/" + profileid + '.lua', data, function(err) {
           if(err) {
               console.log(err);
           } else {
               console.log("The file was saved!");
           }
       }); 
   


       server  = spawn('/opt/osrm-indus/build-osrm-config.sh', ['/tmp/' + profileid + '.lua',  port],  {
       detached: true});
    
          server.stdout.on('data', function (data) {
            console.log('stdout: ' + data);
       });
    
          server.stderr.on('data', function (data) {
            console.log('stderr: ' + data);
       });
    
          server.on('exit', function (code) {
            console.log('child process exited with code ' + code);
       });
    
    
      done();

   });

  });



});


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
  console.log(req.path.substring(0, 6));
  if (req.query.apikey != 42 && req.path.substring(0, 6) != "/osrm/"  ) {
    res.end('unauthorised');
    return;
  }
 
  next();
}
 
app.get('/', function(req, res){
  var body = {msg: 'hello osm world !' };
  res.end(JSON.stringify(body));

});

app.get('/profiles', function(req, res){
       client.keys("profiles:*", function (err, arrayOfKeys) {
         var profiles = [];
         arrayOfKeys.forEach( function (key) {
             profiles.push({ profile: key });
         });
         res.end(JSON.stringify(profiles));
       });
});

app.post('/profiles/:profileid', function(req, res){
  
  var profileid = req.params.profileid;

  client.exists('profiles:' + profileid, function (err, exists) {
      console.log(exists);

      if (exists == 0) {

          var data = '';
          req.setEncoding('utf8');
          req.on('data', function(chunk) { 
              data += chunk;
          });
        
          req.on('end', function() {
             req.rawBody = data;
        
             console.log("creating a profile: profileid: " + profileid);
             // console.log(req.rawBody);



            client.incr('port', function (err, portNumber) {


                 client.set('profiles:' + profileid, req.rawBody, function (err, didSet) {


                     client.set('ports:' + profileid, portNumber, function (err, didSet) {


                          jobs.create('buildprofile', {
                            profileid: profileid
                          }).save();
    
                          res.end(JSON.stringify({created: 'ok', port: portNumber}));

                     });

                 });


            });



          });

      } else {

         res.end(JSON.stringify({created: 'ko, already exists'}));

      }

   });
    
});



app.get('/osrm/:profileid/*', function(req, res){
    var profileid = req.params.profileid;

    client.exists('profiles:' + profileid, function (err, exists) {
      console.log(exists);

      if (exists == 0) {

         res.end(JSON.stringify({call: 'ko, does not exists'}));
         
      } else {


        client.get('ports:' + profileid, function (err, port) {


          var url =  'http://localhost:' + port + req.originalUrl.replace('/osrm/' + profileid, '')
          .replace('apikey=' + req.query.apikey + '&', '');

          http.get(url, function(resmessage) {
            var body = '';

            resmessage.on('data', function(chunk) {
              body += chunk;
            });

            resmessage.on('end', function() {
              res.send(body);
            });
          }).on('error', function(e) {
            console.log("Got error: ", e);
          });


        });

      }

    });

});



app.get('/profiles/:profileid', function(req, res){
    var profileid = req.params.profileid;

    client.exists('profiles:' + profileid, function (err, exists) {
      console.log(exists);

      if (exists == 0) {

         res.end(JSON.stringify({created: 'ko, does not exists'}));
         
      } else {
        client.get('profiles:' + profileid, function (err, data) {
            res.end(data);
        });

      }

    });

});

app.listen(3000);
console.log('Listening on port 3000');

