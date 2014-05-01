var _ = require('lodash'),
	linkParse = require('parse-link-header'),
	moment = require('moment');
var lumenize = require('lumenize');
// var TimeSeriesCalculator = require('TimeSeriesCalculator');

// console.log("lumenize",lumenize.TimeSeriesCalculator);

GithubIssueProcessor = function( httpClient) {

	this.httpClient = httpClient;

	this.args = {
  		headers:{
  			"Content-Type" : "application/json",
  			"User-Agent" : "Chrome 36.0.1944.0",
  			"Authorization" : "token 256421a6dda547ba2f943d39de5f230a97b409fa"
  		} 
	};

	this.fields = ['created_at','updated_at','closed_at'];
	this.states = ['created','updated','closed'];
	this.infinityDate = "9999-01-01T00:00:00.000Z";

};

GithubIssueProcessor.prototype.issuesToSnapshots = function(issues) {

	var that = this;

	var snapshots = _.map( issues, function(issue) {
		var snaps = [];

		var transitions = _.compact(_.map( that.fields,function(field,index) {
			if ( issue[field] !== null) {
				return({"_ValidFrom":issue[field], "State":that.states[index]});
			} else {
				return null;
			}
		}));

		// need to figure out how to deal with issues updated after being closed.

		_.each( transitions, function(transition,index) {

			var _ValidTo = (index < transitions.length-1) ? 
				moment(transitions[index+1]["_ValidFrom"]).subtract("second",1).toISOString() :
				that.infinityDate;

			snaps.push({
				"_ValidFrom" : moment(transition["_ValidFrom"]).toISOString(),
				"_ValidTo" : _ValidTo,
				"State" : transition["State"],
				"id" : issue["id"]
			});

		});
		// if (issue["id"]===32409708) {
		// 	console.log(JSON.stringify(transitions,null,4));
		// 	console.log(JSON.stringify(snaps,null,4));
		// }

		return snaps;

	});
	return _.flatten(snapshots);
};

GithubIssueProcessor.prototype.getSnapshotsExtent = function(snapshots) {

	var min = _.min(_.map(_.pluck( snapshots,"_ValidFrom"),function(d) { return moment(d);}));
	// var max = _.max(_.pluck( snapshots,"_ValidTo"));

	return ( {
		start:min.toISOString()
		// end:max
	} );

};

GithubIssueProcessor.prototype.snapShotsToChartData = function(snapshots) {

	var states = _.uniq( _.pluck(snapshots,"State"));

	var metrics = _.map(states,function(s) {
		return {
			as: s, f: 'filteredCount', filterField: 'State', filterValues: [s]
		};
	});

	config = {
		uniqueIDField : "id",
		deriveFieldsOnInput: [],
  		metrics: metrics,
  		summaryMetricsConfig: [],
  		deriveFieldsAfterSummary: [],
  		granularity: lumenize.Time.DAY,
  		tz: 'America/Chicago',
  		holidays: [],
  		workDays: 'Sunday,Monday,Tuesday,Wednesday,Thursday,Friday'
  	}

	var calculator = new lumenize.TimeSeriesCalculator(config);
	var extent = this.getSnapshotsExtent(snapshots);
	
	calculator.addSnapshots(snapshots, extent.start, moment().toISOString());
	var keys = _.union("label",states);

	var csv = lumenize.arrayOfMaps_To_CSVStyleArray(calculator.getResults().seriesData, keys);

	var configs = _.union([{"name":"label"}], 
		_.map(keys, function(key) { return {"name":key};}));

	var hc = lumenize.arrayOfMaps_To_HighChartsSeries(calculator.getResults().seriesData,configs);

	// console.log(csv);

	return {csv:csv,hc:hc};

};

GithubIssueProcessor.prototype.readAllIssues = function(url, callback) {

	var objs = [];
	var that = this;

	var readApi = function(url,cb) {
		console.log("reading:",url);
		// console.log("args:",JSON.stringify(that.args));
		that.httpClient.get(url, that.args, function(data, response){

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

	readApi( url, function(err,results ) {
		console.log("read " + results.length + " issues.");
		callback(results);
	});

};


GithubIssueProcessor.prototype.process = function(job, callback) {

	var that = this;

	// https://api.github.com/repos/wrackzone/initiative-burnup-chart/issues
	var url = "https://api.github.com/repos/"+job.data.accountName+"/"+job.data.repoName+"/issues?state=all";

	that.readAllIssues( url, function( results ) {
		console.log("read " + results.length + " issues.")
		var snapshots = that.issuesToSnapshots(results);
		var chartdata = that.snapShotsToChartData(snapshots);

		var object = {
			"fullName" : job.data.fullName,
			"accountName" : job.data.accountName,
			"repoName" : job.data.repoName,
			"queue-job-id" : job.id,
			"job-id" : job.data.id,
			"snapshots" : snapshots,
			"chartdata" : chartdata,
			"created_at" : moment().toISOString()
		};

		callback(object);

	});

};

exports.GithubIssueProcessor = GithubIssueProcessor;
