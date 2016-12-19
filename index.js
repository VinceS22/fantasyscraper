var express = require('express');
var app = express();

app.get('/', function (req, res) {
    "use strict";
    res.send('Please specify a website to scrape from.');
});

app.get('/url/:url', function (req, res) {
    "use strict";
    var siteUrl = req.params.url;

    res.send();
});

app.listen(8080);