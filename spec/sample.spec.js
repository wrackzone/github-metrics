var lumenize = require('lumenize');
var Client = require('node-rest-client').Client;
var _ = require('lodash');
var GithubIssueProcessor = require('../githubIssueProcessor').GithubIssueProcessor;
var fs = require('fs');

var issuesUrl = "https://api.github.com/repos/mbostock/d3/issues";

var client = new Client();
var processor = new GithubIssueProcessor(client);

var args = {
	headers:{
		"Content-Type" : "application/json",
		"User-Agent" : "Chrome 36.0.1944.0",
		"Authorization" : "token 256421a6dda547ba2f943d39de5f230a97b409fa"
	} 
};

var issuesUrl = "https://api.github.com/repos/mbostock/d3/issues?state=all";
var fileName = "./issues.json";

jasmine.getEnv().defaultTimeoutInterval = 15000;

describe("githubIssueProcessor",function(){

	console.log("running...");

	it('should exist', function(done) {
		fs.exists(fileName, function (exists) {
			console.log("exists",exists);
			if(!exists) {
				console.log("reading issues");
				processor.readAllIssues( issuesUrl, function( results ) {
				console.log("results",results.length);
		    	expect(results.length).toBeGreaterThan(0);
	    		fs.writeFile(fileName, JSON.stringify(results,null,4), function(err) {
			    	if(err) {
				        console.log(err);
				        done();
				    } else {
				        console.log("The file was saved!");
				        done();
				    }
				}); 
	    		
	  			});
			} else {
				done();
			}
		});
	});

	it('issues request should return 30 items', function (done){

		fs.exists(fileName, function (exists) {
			expect(exists).toBeTruthy();
			if (exists) {
				fs.readFile(fileName, 'utf-8', function(err,data) {
					expect(data).toBeDefined();
					console.log("data len:",data.length);
					var arr = JSON.parse(data);
			    	expect(arr.length).toEqual(1856);
			    	console.log( _.uniq( _.pluck(arr,"id")).length );
			    	done();
				});
			} else { done(); }
		});

	});

	it('issues to snapshots',function(done){

		fs.exists(fileName, function (exists) {
			expect(exists).toBeTruthy();
			if (exists) {
				fs.readFile(fileName, 'utf-8', function(err,data) {
					var issues = JSON.parse(data);
					console.log( _.uniq(_.pluck(issues,"state")));
			    	expect(issues.length).toEqual(1856);
			    	var snapshots = processor.issuesToSnapshots(issues);
			    	console.log("snapshots:",snapshots.length);
			    	var keys = _.keys( _.groupBy(snapshots,"State"));
			    	console.log("state keys",keys);

			    	expect(keys.length).toEqual(3);
			    	expect( _.indexOf(keys,"created")).not.toEqual(-1);
					expect( _.indexOf(keys,"updated")).not.toEqual(-1);
					expect( _.indexOf(keys,"closed")).not.toEqual(-1);

					var s = JSON.stringify(snapshots,null,4);
					console.log("stringlen:",s.length);
					fs.exists("snapshots.json", function (exists) {
						if (!exists)
							fs.writeFileSync("snapshots.json", s);
					});


					var chartdata = processor.snapShotsToChartData(snapshots);
					fs.writeFileSync("chartdata.json", JSON.stringify(chartdata,null,4));


			    	done();
				});
			} else { done(); }
		});
	});

});
