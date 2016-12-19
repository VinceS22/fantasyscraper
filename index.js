// Takes in the response of the website and parses the table.
function parseResponse(playerDataResponse, res) {
    "use strict";
    playerCollection.push(playerDataResponse);
}

var express = require('express');
var app = express();
var http = require('http');
var playerCollection = [];
app.get('/', function (req, res) {
    
    "use strict";
    var hostname = req.query.hostname;
    var path = req.query.path;
    var startIndex = 0;
    if (!hostname) {
        //"http%3A%2F%2Fgames.espn.com%2Fffl%2Ftools%2Fprojections"
        hostname = 'games.espn.com';
        path = '/ffl/tools/projections?&startIndex=';
    }

    // responseBody is the actual meat of the response from the player data website
    var responseBody = '';
    for(var i = 0; i < 10; i++)
    {
        var calculatedPath = path + (i * 40).toString();
        http.get({
            hostname: hostname,
            port: 80,
            path: calculatedPath,
            agent: false  // create a new agent just for this one request
        }, function (playerDataResponse) {
            var body = '';
            playerDataResponse.on('data', function(d) {
                body += d;
            });
            playerDataResponse.on('end', function() {
                parseResponse(body, res)
            });
        });    
    }
    
});

app.listen(3000);
