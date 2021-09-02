import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() { }
}

export const API = {
  // domain: 'http://localhost:8085', // dev
  domain: 'https://b8fe-103-143-8-246.ngrok.io', // dev
  url: {
    createMeeting: '/api/chimeAPI/aws_chime_routes/createMeeting',
    createAttendee: '/api/chimeAPI/aws_chime_routes/createAttendee',
    getMeetingDetails: '/api/chimeAPI/aws_chime_routes/getMeetingDetails',
    deleteMeeting: '/api/chimeAPI/aws_chime_routes/deleteMeeting',
  }
};
