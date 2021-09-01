const app = require('express')();

const chimeAPI = require('./modules/aws_chime/aws_chime_main_routes');
app.use('/chimeAPI', chimeAPI);

module.exports = app;