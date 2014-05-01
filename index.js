var http = require('http'),
    express = require('express'),
    path = require('path'),
    connect = require("connect"),
    Client = require('node-rest-client').Client,
    _ = require('lodash'),
    kue = require("kue"),
    cluster = require('cluster');



cluster.on('online',function(worker) {
	console.log('Worker ' + worker.process.pid + ' is online.');
});

MongoClient = require('mongodb').MongoClient,
Server = require('mongodb').Server,
CollectionDriver = require('./collectionDriver').CollectionDriver;
client = new Client();

var mongoHost = 'localHost'; //A
var mongoPort = 27017; 
var collectionDriver;

var mongoClient = new MongoClient(new Server(mongoHost, mongoPort)); //B
mongoClient.open(function(err, mongoClient) { //C
  if (!mongoClient) {
      console.error("Error! Exiting... Must start MongoDB first");
      process.exit(1); //D
  }
  var db = mongoClient.db("test");  //E
  collectionDriver = new CollectionDriver(db); //F
});

// comment

if (cluster.isMaster) {

	kue.app.listen(3001);
	var jobs = kue.createQueue();
	var app = express();
	app.set('port', process.env.PORT || 3000); 
	app.set('views', path.join(__dirname, 'views'));
	app.set('view engine', 'jade');

	console.log("Running");

	app.use(connect.json());
	app.use(express.static(path.join(__dirname, 'public')));
	 
	app.get('/', function (req, res) {
	  res.send('<html><body><h1>Hello World</h1></body></html>');
	});

	app.get('/:collection', function(req, res) { //A
	   var params = req.params; //B
	   console.log(req.params.collection);
	   collectionDriver.findAll(req.params.collection, function(error, objs) { //C
	    	  if (error) { res.send(400, error); } //D
		      else { 
		          if (req.accepts('html')) { //E
	    	          res.render('data',{objects: objs, collection: req.params.collection}); //F
	              } else {
		          res.set('Content-Type','application/json'); //G
	                  res.send(200, objs); //H
	              }
	         }
	   	});
	});

	app.post('/queue/:operation',function(req,res) {
		var object = req.body;
		console.log("queue/"+req.params.operation+"["+object.fullName+"]");
		if (req.params.operation==="enqueue") {
			object["title"] = object.fullName;
			object["id"] = guid();
			var job = jobs.create("chartdata",object);
			job.save();
			console.log("id:",object.id);
			res.send(200,job.id);
		} else {
			res.send(200,"");
		}

	});

	app.get('/chartdata/:accountName/:repoName', function(req,res) {

		var accountName = req.params.accountName;
		var repoName = req.params.repoName;
		var fullName = accountName + "/" + repoName;
		console.log("chartdata/"+accountName+"/"+repoName);
		var query = { fullName : fullName };

		if (fullName) {
			collectionDriver.find( "chartdata", query, function(error, objs) { //J
				if (error) { res.send(400, error); }
				else { res.send(200, objs); } //K
			});
		} else {
			res.send(400, {error: 'bad url', url: req.url});
		}
	});

	app.post('/chartdata/:accountName/:repoName', function(req, res) { //A
		console.log("")
	    var object = req.body;
	    console.log("post object:",object);
	    collectionDriver.save("chartdata", object, function(err,docs) {
	          if (err) { res.send(400, err); } 
	          else { res.send(201, docs); } //B
	     });
	});

	app.get('/account/:entity', function(req, res) { //I
		var params = req.params;
		console.log(params.entity);

		var args = {
	  		headers:{
	  			"Content-Type" : "application/json",
	  			"User-Agent" : "Chrome 36.0.1944.0"

	  		} 
		};

		client.get("https://api.github.com/users/"+params.entity, args, function(data, response){
	            console.log(data);
	            res.send(200,data);
	    });
	});

	app.get('/account/:entity/repos', function(req, res) { //I
		var params = req.params;
		console.log(params.entity);
		
		var args = {
	  		headers:{
	  			"Content-Type" : "application/json",
	  			"User-Agent" : "Chrome 36.0.1944.0"
	  		} 
		};

		var s = "https://api.github.com/users/"+params.entity+"/repos";
		var objs = [];

		var readApi = function(url) {
			client.get(url, args, function(data, response){
				console.log("headers:"+_.keys(response.headers));
				console.log("link:"+(response.headers["link"]));

				var arr = JSON.parse(data);
				_.each( arr, function(a) {
					objs.push(a);
				});
				res.render("repos",{objects: objs, collection: req.params.collection });
			});
		};

		readApi(s);

	});

	app.get('/account/:entity/repo/:repo', function(req, res) { //I
		var params = req.params;
		console.log("Account:",params.entity, " Repo:",params.repo);

		var s = "https://api.github.com/users/"+params.entity+"/repo" + params.repo;
		var objs = [];

		res.send(200,"");

	});

	app.get('/:collection/:entity', function(req, res) { //I
	   var params = req.params;
	   var entity = params.entity;
	   var collection = params.collection;
	   if (entity) {
	       collectionDriver.get(collection, entity, function(error, objs) { //J
	          if (error) { res.send(400, error); }
	          else { res.send(200, objs); } //K
	       });
	   } else {
	      res.send(400, {error: 'bad url', url: req.url});
	   }
	});

	app.post('/:collection', function(req, res) { //A
	    var object = req.body;
	    var collection = req.params.collection;
	    collectionDriver.save(collection, object, function(err,docs) {
	          if (err) { res.send(400, err); } 
	          else { res.send(201, docs); } //B
	     });
	});

	app.put('/:collection/:entity', function(req, res) { //A
	    var params = req.params;
	    var entity = params.entity;
	    var collection = params.collection;
	    if (entity) {
	       collectionDriver.update(collection, req.body, entity, function(error, objs) { //B
	          if (error) { res.send(400, error); }
	          else { res.send(200, objs); } //C
	       });
	   } else {
	       var error = { "message" : "Cannot PUT a whole collection" };
	       res.send(400, error);
	   }
	});

	app.delete('/:collection/:entity', function(req, res) { //A
	    var params = req.params;
	    var entity = params.entity;
	    var collection = params.collection;
	    if (entity) {
	       collectionDriver.delete(collection, entity, function(error, objs) { //B
	          if (error) { res.send(400, error); }
	          else { res.send(200, objs); } //C 200 b/c includes the original doc
	       });
	   } else {
	       var error = { "message" : "Cannot DELETE a whole collection" };
	       res.send(400, error);
	   }
	});

	app.use(function (req,res) {
	    res.render('404', {url:req.url});
	});
	 
	http.createServer(app).listen(app.get('port'), function(){
	  console.log('Express server listening on port ' + app.get('port'));
	});

	cluster.fork();

} else {

	// queue processor process
	var mongoHost = 'localHost'; //A
	var mongoPort = 27017; 
	var collectionDriver;
	var jobs = kue.createQueue();


	var mongoClient = new MongoClient(new Server(mongoHost, mongoPort)); //B
	mongoClient.open(function(err, mongoClient) { //C
	  if (!mongoClient) {
	      console.error("Error! Exiting... Must start MongoDB first");
	      process.exit(1); //D
	  }
	  var db = mongoClient.db("test");  //E
	  collectionDriver = new CollectionDriver(db); //F

		// var client = new Client();
		GithubIssueProcessor = require('./githubIssueProcessor').GithubIssueProcessor;

		
		var githubIssueProcessor = new GithubIssueProcessor( client );

		setInterval(function() { 
			jobs.process('chartdata', function(job, done){
				console.log("Processing Job:",job.id);
	  			githubIssueProcessor.process(job, function(obj) {
					collectionDriver.save("chartdata", obj, function(err,docs) {
						if (err) {
							console.log("Error:",JSON.stringify(err));
						}
						console.log("Wrote mongo id:",docs["_id"]);
						done();
					});
	  			});
	  		});
		}, 5000);


	});


}

var guid = function() {
	return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
		var r = Math.random()*16|0, v = c == 'x' ? r : (r&0x3|0x8);
    	return v.toString(16);
	});
}


