var lumenize = require('lumenize');
var Client = require('node-rest-client').Client;
var _ = require('lodash');

// curl -H "Content-Type: application/json" -X POST -d ' 
//{ "accountName" : "wrackzone", "repoName" : "initiative-burnup-chart", 
// "fullName":"wrackzone/initiative-burnup-chart"}' http://localhost:3000/queue/enqueue

var queueUrl = "http://localhost:3000/queue/enqueue";

var repos = [
	// { "accountName" : "mbostock", "repoName" : "d3", "fullName" : "mbostock/d3" },
	{ "accountName" : "wrackzone", "repoName" : "psi-feature-burnup", "fullName" : "wrackzone/psi-feature-burnup" },
	{ "accountName" : "Famous", "repoName" : "famous", "fullName" : "Famous/famous" },
	{ "accountName" : "soundcloud", "repoName" : "roshi", "fullName" : "soundcloud/roshi" },
	{ "accountName" : "GitbookIO", "repoName" : "gitbook", "fullName" : "GitbookIO/gitbook" }
];

var argsTemplate = {
  		headers:{
  			"Content-Type" : "application/json",
  			"User-Agent" : "Chrome 36.0.1944.0",
  		} 
};

var client = new Client();

jasmine.getEnv().defaultTimeoutInterval = 10000;

describe("Queueing Test",function(){

	console.log("running...");

	_.each(repos,function(repo) {

		it('should add to queue', function(done) {
			var args = _.cloneDeep(argsTemplate);
			args.data = repo;
			client.post( queueUrl, args, function( data, response) {
				console.log(response.statusCode);
				expect(response.statusCode).toEqual(200);
				done();
			} );
		});
	});

});
