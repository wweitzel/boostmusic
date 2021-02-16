import { Component, OnInit } from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { AuthService } from '../auth.service';

@Component({
  selector: 'app-login',
  templateUrl: './login.component.html',
  styleUrls: ['./login.component.css']
})
export class LoginComponent implements OnInit {

  spotifyLoggedIn = false;
  stravaLoggedIn = false;

  constructor(
    private authService: AuthService,
    private router: Router,
    private route: ActivatedRoute
  ) { }

  ngOnInit(): void {
    if (sessionStorage.getItem('spotify_access_token')) {
      this.spotifyLoggedIn = true;
    }
    if (sessionStorage.getItem('strava_access_token')) {
      this.stravaLoggedIn = true;
    }
    if (this.spotifyLoggedIn && this.stravaLoggedIn) {
      this.router.navigate(['home']);
    }
    const spotifyAccessToken = this.route.snapshot.queryParamMap.get('access_token');
    const spotifyRefreshtoken = this.route.snapshot.queryParamMap.get('refresh_token');
    if (spotifyAccessToken && spotifyRefreshtoken) {
      sessionStorage.setItem('spotify_access_token', spotifyRefreshtoken);
      sessionStorage.setItem('spotify_refresh_token', spotifyRefreshtoken);
    }
    const stravaAuthCode = this.route.snapshot.queryParamMap.get('code');
    if (stravaAuthCode) {
      this.authService.exchangeStravaToken(stravaAuthCode).subscribe(
        resp => {
          sessionStorage.setItem('strava_access_token', resp.access_token);
          sessionStorage.setItem('strava_refresh_token', resp.refresh_token);
        }
      );
    }
  }

  loginWithSpotify(): void {
    this.authService.loginWithSpotify();
  }

  loginWithStrava(): void {
    this.authService.loginWithStrava();
  }
}
