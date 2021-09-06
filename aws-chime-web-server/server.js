'use strict'

const fs = require('fs');
const compression = require('compression');
const url = require('url');
const http = require('http');
const app = process.env.npm_config_app || 'meetingV2';
const indexPagePath = `dist/${app}.html`;

console.info('Using index path', indexPagePath);

const indexPage = fs.readFileSync(indexPagePath);

function serve(host = '127.0.0.1:80') {
    http.createServer({}, async (request, response) => {
        try {
            compression({})(request, response, () => { });
            const requestUrl = url.parse(request.url, true);
            if (request.method === 'GET' && requestUrl.pathname === '/') {
                // Return the contents of the index page
                respond(response, 200, 'text/html', indexPage);
            }
        } catch (error) {

        }
    }).listen(host.split(':')[1], host.split(':')[0], () => {
        log(`server running at http://${host}/`);
    });
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