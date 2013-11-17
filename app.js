var express = require('express');
var redis = require('redis');
var db = redis.createClient(),
  client = redis.createClient();

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
      
     fs.writeFile("/tmp/" + profileid + '.lua', data, function(err) {
         if(err) {
             console.log(err);
         } else {
             console.log("The file was saved!");
         }
     }); 



    server  = spawn('/opt/osrm-indus/build-osrm-config.sh', ['/tmp/' + profileid + '.lua',  '5004'],  {
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



     // child = exec('/opt/osrm-indus/build-osrm-config.sh /tmp/' + profileid + '.lua  5004', function (error, stdout, stderr) {
     //   console.log('stdout: ' + stdout);
     //   console.log('stderr: ' + stderr);
     //   if (error !== null) {
     //         console.log('exec error ' + error);
     //   }

     // });

  done();


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
        
             client.set('profiles:' + profileid, req.rawBody, function (err, didSet) {

                  jobs.create('buildprofile', {
                    profileid: profileid
                  }).save();

                  res.end(JSON.stringify({created: 'ok'}));

             });

          });

      } else {

         res.end(JSON.stringify({created: 'ko, already exists'}));

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

