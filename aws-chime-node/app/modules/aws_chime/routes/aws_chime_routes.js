const app = require('express')();
const controller = require('../controllers/aws_chime_controller');

app.route('/createMeeting').post(controller.createMeeting);
app.route('/createAttendee').post(controller.createAttendee);
app.route('/createMeetingWithAttendees').post(controller.createMeetingWithAttendees);
app.route('/getMeetingDetails').post(controller.getMeetingDetails);
app.route('/deleteMeeting').post(controller.deleteMeeting);
module.exports = app;