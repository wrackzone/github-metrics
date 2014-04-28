var _ = require('lodash'),
	linkParse = require('parse-link-header'),
	moment = require('moment');


GithubIssueProcessor = function( collectionDriver, httpClient) {

	this.collectionDriver = collectionDriver;
	this.httpClient = httpClient;

};

GithubIssueProcessor.prototype.issuesToSnapshots = function(issues) {

	var snapshots = _.map( issues, function(issue) {
		var snaps = [];

		// created_at, updated_at, closed_at
		var fields = ['created_at','updated_at','closed_at'];
		var states = ['created','updated','closed'];

		_.each(fields, function(field,i) {
			if (i>0) {
				var dateFrom = issue[fields[i-1]];
				var dateTo = issue[fields[i]];
				if (dateFrom!==null||dateTo!==null) {
					snaps.push({
						"_ValidFrom" : dateFrom,
						"_ValidTo" : dateTo ? moment(dateTo).subtract("second",1)
							.format("YYYY-MM-DDTHH:mm:ssZ") : "9999-01-01T00:00:00Z",
						"State" : states[i-1],
						"id" : issue["id"]
					});
				}
			}
		});
		return snaps;

	});
	return _.flatten(snapshots);
};

GithubIssueProcessor.prototype.process = function(job, callback) {

	var that = this;

	var args = {
  		headers:{
  			"Content-Type" : "application/json",
  			"User-Agent" : "Chrome 36.0.1944.0",
  			"Authorization" : "token 256421a6dda547ba2f943d39de5f230a97b409fa"
  		} 
	};

	// https://api.github.com/repos/wrackzone/initiative-burnup-chart/issues
	var s = "https://api.github.com/repos/"+job.data.accountName+"/"+job.data.repoName+"/issues";
	var objs = [];

	var readApi = function(url,cb) {
		that.httpClient.get(url, args, function(data, response){
			var links = linkParse(response.headers["link"]);
			
			var arr = JSON.parse(data);
			_.each( arr, function(a) {
				objs.push(a);
			});

			if (links===null || _.isUndefined(links["next"])) {
				cb(null,objs);
			} else {
				readApi(links.next.url,cb);
			}

		});
	};

	readApi(s,function(err,results){
		var snapshots = that.issuesToSnapshots(results);
		var object = {
			"fullName" : job.data.fullName,
			"accountName" : job.data.accountName,
			"repoName" : job.data.repoName,
			"queue-job-id" : job.id,
			"job-id" : job.data.id,
			"snapshots" : snapshots,
			"created_at" : moment().toISOString()
		};

		that.collectionDriver.save("chartdata", object, function(err,docs) {
			if (err) {
				console.log("Error:",JSON.stringify(err));
			}
			callback();
		});
	});

};

exports.GithubIssueProcessor = GithubIssueProcessor;
