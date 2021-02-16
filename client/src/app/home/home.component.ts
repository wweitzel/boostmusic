import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
  }

  getUserInfo(): void {
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + sessionStorage.getItem('spotify_access_token'));
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
