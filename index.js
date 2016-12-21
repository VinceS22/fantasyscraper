var playerHttpRequestCount = 10;
var playerHttpRequestCompleteCount = 0;
var express = require('express');
var app = express();
var http = require('http');
var cheerio = require('cheerio');
var playerCollection = [];
var playerJSON = BuildEmptyPlayerJSON();
var response = {};
var allStatuses = ['Q', 'SSPD', 'IR'];
var allPositions = ['QB', 'RB', 'D/ST', 'TE', 'WR', 'K'];
var teams = ["NYJ", "SF", "DEN" , "MIA" ,"CLE", "MIN", "PHI", "HOU", "JAX", "ARI", "KC", "BAL", 
"SEA", "CHI", "CIN", "SD", "LA", "PIT", "NYG", "TEN", "DAL", "IND", "CAR", "BUF", "TB", "GB", "DET", 
"NO", "OAK", "ATL", "WSH", "NE"];

Array.prototype.contains = function(element){
    return this.indexOf(element) > -1;
};

// Takes an HTML page and extracts player info from it.
// @param playerTable A string containing the html which contains a player table.
function extractPlayerInfo(playerHtmlPage) {
    "use strict";
        var $ = cheerio.load(playerHtmlPage);
        // Gets all of the rows of players in the table
        var rowCollection = $("tr[id^='plyr']");

        for(var i = 0; i < rowCollection.length; i++)
        {
            var playerNamePosTeamCombo = $(rowCollection[i]).find(".playertablePlayerName").text();
            var projectedPoints = $(rowCollection[i]).find('.appliedPoints').html();
            // If we got a name and team combo, split it and try to extract the name, team, and position. 
            // As of right now, that's as atomic I could get the info before having to split it into an array and extract everything.
            // Passing in filter(Boolean) filters out any posibilty of empty strings in our array.
            // Reasoning found here: http://stackoverflow.com/questions/10346722/how-can-i-split-a-javascript-string-by-white-space-or-comma
            var wordArray = playerNamePosTeamCombo.split(/[\s,]+/).filter(Boolean);

            hydratePlayer(wordArray, playerNamePosTeamCombo, projectedPoints);
        }
}

// Given an array and original string, fetch me the name.
// For example, dealing with the string Cam Newton, Car QB.
// ....Gaaaatttoooorrrraaaaaddeee
// @param wordArray Array of words containing the original string split up, usually by space and comma. e.g. ['Cam', 'Newton', 'Car', QB]
// @param originalString Used for mostly debugging purposes. "Cam Newton, Car QB" 
// @param projectedPoints Double value which we estimate the amount of points a given player is going to get in a week
function hydratePlayer(wordArray, originalString, projectedPoints)
{
    var name = '';
    var team = '';
    var positions = [];
    var status = '';
    for(var i = 0; i < wordArray.length; i++)
    {
        //Makes shorthand easier
        var word = wordArray[i];

        // Since we have D/ST appear twice in the string (EX: Jaguars D/ST D/ST), we gotta
        // treat it nice and special
        if(word == "D/ST" && positions.length == 0)
        {
            name += ' D/ST'
            positions.push('D/ST')
        }
        // Turns out people can have more than one position. EX: RB / WR
        if(allPositions.contains(word.toUpperCase()))
        {
            positions.push(word);
        }
        else if(allStatuses.contains(word.toUpperCase()))
        {
            status = word;
        }
        else if(teams.contains(word.toUpperCase()))
        {
            team = word;
        }
        else
        {
            if(name)
            {
                name += ' ';
            }

            name += word;
        }
    }

    if(positions.length == 0)
    {
        console.log("No positions found in " + originalString + " in the hydratePlayer function.");
    }
    if(!name)
    {
        console.log("Name not found in " + originalString);
        throw "Name not found in hydratePlayer function";
    }
    if(positions.length == 0)
    {
        console.log("Position not found in " + originalString);
        throw "Position not found in hydratePlayer function";
    }

    var player = new Player(name, projectedPoints, team, positions, status);
    for(var j = 0; j < player.positions.length; j++)
    {
        switch(player.positions[j]){
        case "RB":
            playerJSON.RBs.push(player);
            break;
        case "QB":
            playerJSON.QBs.push(player);
            break;
        case "TE":
            playerJSON.TEs.push(player);
            break;
        case "WR":
            playerJSON.WRs.push(player);
            break;
        case "K":
            playerJSON.Ks.push(player);
            break;
        case "D/ST":
            playerJSON.DSTs.push(player);
            break;
        default:
            console.log("unknown position encountered actual: " + player.positions[j] + " string extracted from " + originalString);
        }
    }
}

function BuildEmptyPlayerJSON()
{
    return { "RBs" : [], "QBs" : [], "TEs" : [], "WRs" : [], "Ks" : [], "DSTs" : []};
}

function Player(name, projected, team, positions, status)
{
    // TODO: Make some of these into enums instead of straight strings.
    // ex: Rob Kelley
    this.name = name;
    // ex: 12 points
    this.projected = projected;
    // ex: Redskins
    this.team = team;
    // ex: "RB"
    this.positions = positions;
    // ex: "Q" for Questionable
    this.status = status;
}
function Team()
{

}


// When we make a request to the website for players we need to add
// events to handle data event and when end is called.
// @playerDataResponse Playerdataresponse is a http.incomingmessage object which can be investigated on node's website.
// https://nodejs.org/api/http.html#http_class_http_incomingmessage
function handleGetRequestForPlayers(playerDataResponse) {
    var body = '';
    playerDataResponse.on('data', function(d) {
        body += d;
    });
    playerDataResponse.on('end', function() {
        extractPlayerInfo(body);
        playerHttpRequestCompleteCount++;
        if(playerHttpRequestCompleteCount >= playerHttpRequestCount-1)
        {
            response.send(playerJSON);
        }
    });
}


app.get('/', function (req, res) {
    response = res;
    playerHttpRequestCompleteCount = 0;
    var hostname = req.query.hostname;
    var path = req.query.path;
    if (!hostname) {
        //"http%3A%2F%2Fgames.espn.com%2Fffl%2Ftools%2Fprojections"
        hostname = 'games.espn.com';
        path = '/ffl/tools/projections?&startIndex=';
    }

    for(var i = 0; i < playerHttpRequestCount; i++)
    {
        var calculatedPath = path + (i * 40).toString();
        http.get({
            hostname: hostname,
            port: 80,
            path: calculatedPath,
            agent: false  // create a new agent just for this one request
        }, handleGetRequestForPlayers);    
    }
});

app.listen(3000);
