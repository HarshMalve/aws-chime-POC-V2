const app = require('express')();
const aws_chime_routes = require('./routes/aws_chime_routes');

app.use('/aws_chime_routes', aws_chime_routes);

module.exports = app;