const dotenv = require('dotenv');
dotenv.config();

const loadEnvVariable = envName => {
    const env = process.env[envName];
    if(env == null) {
        throw new Error(`Environment Variable ${envName} is undefined`);
    }
    return env;
};

const config = {
    app: {
        port: loadEnvVariable('port') || 8080
    },
    db: {
        host: '65.0.63.113',
        user: 'harsh', //'moodles',
        password: 'Harsh@261193',
        database: 'aws_chime', //devDB
        // database: 'illumeFEEDBACK',
        multipleStatements: true,
        port: '3306',
        connectTimeout: 100000,
    }
};

module.exports = config;