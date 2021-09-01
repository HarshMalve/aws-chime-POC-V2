import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { API } from '../api/api.service';
import 'rxjs/add/operator/map';

@Injectable({
  providedIn: 'root'
})
export class WebAPIServiceService {
  private headers = new HttpHeaders();
  
  createMeeting = API.domain + API.url.createMeeting;
  getMeeting = API.domain + API.url.getMeetingDetails;
  createAttendee = API.domain + API.url.createAttendee;
  constructor(public http: HttpClient) {

  }

  async createMeet(data: any): Promise<any> {
    try {
      const response = await this.http.post(this.createMeeting, data, { headers: this.headers }).toPromise();
      return response;
    } catch (error) {
      return this.handleError(error);
    }
  };

  async getMeet(data: any): Promise<any> {
    try {
      const response = await this.http.post(this.getMeeting, data, { headers: this.headers }).toPromise();
      return response;
    } catch (error) {
      return this.handleError(error);
    }
  };

  async createAtt(data: any): Promise<any> {
    try {
      const response = await this.http.post(this.createAttendee, data, { headers: this.headers }).toPromise();
      return response;
    } catch (error) {
      return this.handleError(error);
    }
  }

  private handleError(error: Response | any) {
    return Promise.reject(error.message || error);
  };
}
