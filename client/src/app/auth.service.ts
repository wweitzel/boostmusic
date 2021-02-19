import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class AuthService {

  stravaClientId = '61624';
  stravaTokenExhangeUrl = 'http://localhost:8888/exchange-token/strava';

  constructor(private http: HttpClient) { }

  loginWithSpotify(): void {
    window.open('http://localhost:8888/login/spotify', '_self');
  }

  loginWithStrava(): void {
    const url = `http://www.strava.com/oauth/authorize?` +
      `client_id=${this.stravaClientId}&` +
      `response_type=code&` +
      `redirect_uri=http://localhost:4200/login&` +
      `approval_prompt=force&` +
      `scope=read,read_all,activity:read,activity:read_all`;
    window.open(url, '_self');
  }

  exchangeStravaToken(stravaAuthCode: string): Observable<any> {
    const url = this.stravaTokenExhangeUrl + `?code=${stravaAuthCode}`;
    return this.http.get<any>(url);
  }

  accountsLinked(): boolean {
    const spotifyAccessToken = sessionStorage.getItem('spotify_access_token');
    const stravaAccessToken = sessionStorage.getItem('strava_access_token');
    if (spotifyAccessToken && stravaAccessToken) {
      return true;
    } else {
      return false;
    }
  }

}
