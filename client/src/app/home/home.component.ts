import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  accessToken: string;
  refreshToken: string;

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
    sessionStorage.setItem('spotify_access_token', this.accessToken);
    sessionStorage.setItem('spotify_refresh_token', this.refreshToken);
  }

  getUserInfo(): void {
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + this.accessToken);
    this.http.get('https://api.spotify.com/v1/me', {
      headers
    }).subscribe(
      resp => {
        console.log(resp);
      }
    );
  }

  findStravaPrs(): void {
    this.http.get('http://localhost:8888/analyze').subscribe(
      resp => {
        console.log(resp);
      }
    );
  }

}
