import { Injectable } from '@angular/core';

@Injectable({
  providedIn: 'root'
})
export class ApiService {

  constructor() { }
}

export const API = {
  // domain: 'http://localhost:8085', // dev
  domain: 'https://b226-2409-4042-238d-a50f-d8ec-78a3-4767-b3ae.ngrok.io', // dev
  url: {
    createMeeting: '/api/chimeAPI/aws_chime_routes/createMeeting',
    createAttendee: '/api/chimeAPI/aws_chime_routes/createAttendee',
    getMeetingDetails: '/api/chimeAPI/aws_chime_routes/getMeetingDetails',
    deleteMeeting: '/api/chimeAPI/aws_chime_routes/deleteMeeting',
  }
};
