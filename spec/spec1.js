require('lumenize');
require('node-rest-client').Client;

describe('GET /user', function(){

	var issuesUrl = "https://api.github.com/repos/mbostock/d3/issues";

	var client = new Client();

	var args = {
	  		headers:{
	  			"Content-Type" : "application/json",
	  			"User-Agent" : "Chrome 36.0.1944.0",
	  			"Authorization" : "token 256421a6dda547ba2f943d39de5f230a97b409fa"
	  		} 
	};


	it("should return 30 records", function(done) {
		client.get(issuesUrl, args, function(data, response){
			var arr = JSON.parse(data);
	    	expect(arr.length).toEqual(30);
	    	done();
	  	});
	});
});