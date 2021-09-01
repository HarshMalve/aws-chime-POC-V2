const AWS = require('aws-sdk');
const { v4: uuid } = require('uuid');
const dotenv = require('dotenv');
dotenv.config();
const chime = new AWS.Chime({ region: 'us-east-1' });
chime.endpoint = new AWS.Endpoint('https://service.chime.aws.amazon.com');

const SESConfig = {
    accessKeyId: process.env.AWS_ACCESS_KEY_ID,
    accessSecretKey: process.env.AWS_SECRET_KEY,
    region: 'ap-south-1'
}
AWS.config.update(SESConfig);

// Create AWS Chime meeting without any inital attendees
exports.createMeeting = async function(req, res) {
    console.log('Entered CM');
    try {
        let params = {
            id: req.body.Id, 
            ClientRequestToken: uuid(), 
            ExternalMeetingId: req.body.ExternalMeetingId, 
            MeetingHostId: req.body.MeetingHostId,
            MediaRegion: SESConfig.region //ap-south-1 is Mumbai // Specify the region in which to create the meeting.
        };
        chime.createMeeting(params, (err, result) => {
            if (err) {
                res.status(500).send(err);
            } else {
                let meeting = result.Meeting;
                const db = require('../../../../index').db;
                let query = 'call spCreateUpdateMeeting(?, ?, ?, ?, ?);';
                db.query(query, [params.ClientRequestToken, meeting.MeetingId, meeting.ExternalMeetingId, params.MeetingHostId, req.body.isActive], (mysqlErr, mysqlRes) => {
                    if(mysqlErr) {
                        console.log('mysqlRes ' + mysqlRes);
                        res.status(500).send(mysqlErr);
                    } else {
                        res.status(201).send(result);
                    }
                });
            }            
        });
    } catch (error) {
        res.status(500).send(error);
    }
};

// Create AWS Chime meeting attendee using MeetingId and ExternalUserId
exports.createAttendee = async function(req, res) {
    try {
        let params = { 
            MeetingId: req.body.MeetingId, 
            ExternalUserId: req.body.ExternalUserId };
        chime.createAttendee(params, (err, result) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(201).send(result);
            }
        });
    } catch (error) {
        res.status(500).send(error);
    }
};

// Create AWS Chime Meeting with attendees
exports.createMeetingWithAttendees = async function(req, res) {
    try {
        let { Attendees, ExternalMeetingId, MeetingHostId } = req.body;
        let params = {
            Attendees: Attendees,
            ClientRequestToken: uuid(),
            ExternalMeetingId: ExternalMeetingId,
            MeetingHostId: MeetingHostId,
            MediaRegion: SESConfig.region //ap-south-1 is Mumbai // Specify the region in which to create the meeting.
        }
        chime.createMeetingWithAttendees(params, (err, result) => {
            if (err) {
                res.status(500).send(err);
            } else {
                res.status(201).send(result);
            }
        });
    } catch (error) {
        res.status(500).send(error);
    }
};

// Get Meeting Details using MeetingId
exports.getMeetingDetails = async function(req, res) {
    try {
        let ExternalMeetingId = req.body.ExternalMeetingId;
        const db = require('../../../../index').db;
        let query = 'call spGetMeetingDetails(?)';
        db.query(query, [ExternalMeetingId], (mysqlErr, mysqlRes) => {
            if(mysqlErr) {
                res.status(500).send(mysqlErr);
            } else {
                console.log('mysqlRes ' + mysqlRes);
                let MeetingId = mysqlRes[0][0].aws_chime_meetings_meetingId;
                chime.getMeeting({ MeetingId }, (err, result) => {
                    if (err) {
                        res.status(404).send(err);
                    } else {
                        res.status(200).send(result);
                    }
                });
            }
        });
    } catch (error) {
        res.status(500).send(error);
    }
};


// Delete a Meeting using MeetingId. The operation deletes all attendees, disconnects all clients, and prevents new clients from joining the meeting. 
exports.deleteMeeting = async function (req, res) {
    try {
        let ExternalMeetingId = req.body.ExternalMeetingId;
        const db = require('../../../../index').db;
        let query = 'call spGetMeetingDetails(?)';
        db.query(query, [ExternalMeetingId], (mysqlErr, mysqlRes) => {
            if(mysqlErr) {
                res.status(500).send(mysqlErr);
            } else {
                let MeetingId = mysqlRes[0][0].aws_chime_meetings_meetingId;
                chime.deleteMeeting({ MeetingId }, (err, result) => {
                    if (err) {
                        res.status(404).send(err);
                    } else {
                        res.status(200).send(result);
                    }
                });
            }
        });
    } catch (error) {
        res.status(500).send(error);
    }
};

