import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() { }
}

export const API = {
  domain: 'http://localhost:8080', // dev
  url: {
    createMeeting: '/api/chimeAPI/aws_chime_routes/createMeeting',
    createAttendee: '/api/chimeAPI/aws_chime_routes/createAttendee',
    getMeetingDetails: '/api/chimeAPI/aws_chime_routes/getMeetingDetails',
    deleteMeeting: '/api/meetingsAPI/meetings_routes/deleteMeeting',
  }
};
