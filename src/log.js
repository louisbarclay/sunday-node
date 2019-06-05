var winston = require('winston');

require('winston-papertrail').Papertrail;

var winstonPapertrail = new winston.transports.Papertrail({
    host: 'logs6.papertrailapp.com',
    port: 18410,
    inlineMeta: true
})

winstonPapertrail.on('error', function (err) {
    // Handle, report, or silently ignore connection errors and failures
});

var log = winston.createLogger({
    transports: [winstonPapertrail]
});

export default log;