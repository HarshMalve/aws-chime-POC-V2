'use strict'

const fs = require('fs');
const compression = require('compression');
const url = require('url');
const https = require('https');

const path = require('path');
const app = process.env.npm_config_app || 'meetingV2';
const indexPagePath = `dist/${app}.html`;
const httpPort = 80;
const httpsPort = 443;
console.info('Using index path', indexPagePath);

const indexPage = fs.readFileSync(indexPagePath);

function serve() {
    const httpsOptions = {
        cert: fs.readFileSync(path.join('/etc/letsencrypt/live/harshmalve.com/cert.pem')),
        key: fs.readFileSync(path.join('/etc/letsencrypt/live/harshmalve.com/privkey.pem'))
      };
    https.createServer(httpsOptions, async (request, response) => {
        try {
            compression({})(request, response, () => { });
            const requestUrl = url.parse(request.url, true);
            if (request.method === 'GET' && requestUrl.pathname === '/') {
                // Return the contents of the index page
                respond(response, 200, 'text/html', indexPage);
            }
        } catch (error) {

        }
    }).listen(httpsPort, () => {
        log(`server running at port ${httpsPort}`);
    });

    // Redirect from http port to https
http.createServer(function (req, res) {
    res.writeHead(301, { "Location": "https://" + req.headers['host'].replace(httpPort, httpsPort) + req.url });
    console.log("http request, will go to >> ");
    console.log("https://" + req.headers['host'].replace(httpPort, httpsPort) + req.url);
    res.end();
}).listen(httpPort);
}

function respond(response, statusCode, contentType, body, skipLogging = false) {
    response.statusCode = statusCode;
    response.setHeader('Content-Type', contentType);
    response.setHeader('Access-Control-Allow-Origin', '*');
    response.end(body);
    if (contentType === 'application/json' && !skipLogging) {
        log(body);
    }
};

function log(message) {
    console.log(`${new Date().toISOString()} ${message}`);
}
serve();