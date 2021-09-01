const express = require('express');
const cors = require('cors');
const config = require('./config');
const mysql = require('mysql');
const app = express();

const db = mysql.createPool(config.db);
db.getConnection((err, connection) => {
    if (connection) {
        console.log('Db Connection Established');
    } else {
        console.log(err);
    }
});

app.use(cors());
app.use(express.json());
app.use(express.urlencoded({
    extended: true
}));

app.use(function(req, res, next){
    res.header("Access-Control-Allow-Origin", "*");
    res.header('Access-Control-Allow-Methods', 'GET,PUT,POST,DELETE');
    res.header('Access-Control-Allow-Headers', "Origin, X-Requested-With, Content-Type, Accept, Authorization");
    return next();
});

const server = require('http').createServer(app);
server.listen(config.app.port, () => {
    console.log(`Server listening on port ${config.app.port}`);
});

const mainRoutes = require('./app/main_routes');
app.use('/api', mainRoutes);

module.exports = {app, db};
