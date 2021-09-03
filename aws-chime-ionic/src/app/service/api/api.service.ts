import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() { }
}

export const API = {
  // domain: 'http://localhost:8085', // dev
  domain: 'https://15aa-152-57-160-23.ngrok.io', // dev
  url: {
    createMeeting: '/api/chimeAPI/aws_chime_routes/createMeeting',
    createAttendee: '/api/chimeAPI/aws_chime_routes/createAttendee',
    getMeetingDetails: '/api/chimeAPI/aws_chime_routes/getMeetingDetails',
    deleteMeeting: '/api/chimeAPI/aws_chime_routes/deleteMeeting',
  }
};
