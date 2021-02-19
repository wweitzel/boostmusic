import { HttpClient, HttpHeaders, HttpParams } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';
import { Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  effortsWithSongs = [];
  userInfo;

  constructor(
    private http: HttpClient,
    private router: Router,
    private authService: AuthService) { }

  ngOnInit(): void {
    if (!this.authService.accountsLinked()) {
      this.router.navigate(['login']);
      return;
    }
    this.getUserInfo();
  }

  getUserInfo(): void {
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + sessionStorage.getItem('spotify_access_token'));
    this.http.get<any>('https://api.spotify.com/v1/me', {
      headers
    }).subscribe(
      resp => {
        this.userInfo = resp;
      },
      error => {
        this.handleError(error);
      }
    );
  }

  analyzeNewestActivity(): void {
    let params = new HttpParams();
    params = params.set('spotify_access_token', sessionStorage.getItem('spotify_access_token'));
    params = params.set('strava_access_token', sessionStorage.getItem('strava_access_token'));
    this.http.get<any>('http://localhost:8888/analyze-newest-activity', {
      params
    }).subscribe(
      resp => {
        this.effortsWithSongs = resp;
        console.log(this.effortsWithSongs);
      },
      error => {
        this.handleError(error);
      }
    );
  }

  private handleError(error): void {
    console.log(error);
    sessionStorage.clear();
    this.router.navigate(['login']);
  }

}
