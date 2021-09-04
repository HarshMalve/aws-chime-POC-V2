const fs = require('fs');
const http = require('http');
const https = require('https');
const express = require('express');
const path = require('path');
const hostname = 'harshmalve.com';
const httpPort = 80;
// const httpsPort = 443;

// const httpsOptions = {
//     // cert: fs.readFileSync('www_esselworldtictactot_in.crt'),
//     // ca: fs.readFileSync('www_esselworldtictactot_in.ca-bundle'),
//     // key: fs.readFileSync('www.esselworldtictactot.in.key')
//     cert: fs.readFileSync(path.join('/etc/letsencrypt/live/esselworldtictactot.in/cert.pem')),
//     key: fs.readFileSync(path.join('/etc/letsencrypt/live/esselworldtictactot.in/privkey.pem'))
// }

const app = express();
const httpServer = http.createServer(app);
// const httpsServer = https.createServer(httpsOptions, app);


app.use(express.static('./files'));

httpServer.listen(httpPort, hostname, () => {
    console.log(`Listening on ${hostname}:${httpPort}`)
});
// httpsServer.listen(httpsPort, hostname);
