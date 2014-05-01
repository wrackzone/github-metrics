var _ = require('lodash'),
    kue = require("kue");


var jobs = kue.createQueue();

jobs.process('chartdata', 1, function(job, done){
    var pending = 5
      , total = pending;

    var interval = setInterval(function(){
      job.log('sending!');
      job.progress(total - pending, total);
      --pending || done();
      pending || clearInterval(interval);
    }, 1000);
});