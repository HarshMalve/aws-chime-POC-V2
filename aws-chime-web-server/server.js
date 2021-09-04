'use strict'

const express = require('express');
const fs = require('fs');
const https = require('https');
const http = require('http');
const path = require('path');
const bodyParser = require('body-parser');

const app = express();
const directoryToServe = 'aws-chime-web-server/files/';
const httpsPort = 443;
const httpPort = 80;

app.use(bodyParser.urlencoded({ extended: true })); 
app.use('/static', express.static('files'));

app.get('/', function (req, res) {
    console.log('path ' + path.join(__dirname, '..', directoryToServe));
    res.sendFile(path.join(__dirname, '..', directoryToServe));
});


var httpsOptions = {
    cert: fs.readFileSync(path.join('/etc/letsencrypt/live/harshmalve.com/cert.pem')),
    key: fs.readFileSync(path.join('/etc/letsencrypt/live/harshmalve.com/privkey.pem'))
};


https.createServer(httpsOptions, app).listen(httpsPort, function () {
    console.log('Magic happens on port ' + httpsPort);
});

// Redirect from http port to https
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'].replace(httpPort, httpsPort) + req.url });
    console.log("http request, will go to >> ");
    console.log("https://" + req.headers['host'].replace(httpPort, httpsPort) + req.url);
    res.end();
}).listen(httpPort);