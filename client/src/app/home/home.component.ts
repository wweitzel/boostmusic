import { HttpClient, HttpHeaders } from '@angular/common/http';
import { Component, OnInit, ɵSWITCH_ELEMENT_REF_FACTORY__POST_R3__ } from '@angular/core';

@Component({
  selector: 'app-home',
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.css']
})
export class HomeComponent implements OnInit {

  effortSongs = [];

  constructor(private http: HttpClient) { }

  ngOnInit(): void {
  }

  getUserInfo(): void {
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + sessionStorage.getItem('spotify_access_token'));
    this.http.get<any>('https://api.spotify.com/v1/me', {
      headers
    }).subscribe(
      resp => {
        console.log(resp);
      }
    );
  }

  getRecentlyPlayedTracks(): void {
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + sessionStorage.getItem('spotify_access_token'));
    this.http.get<any>('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers
    }).subscribe(
      resp => {
        console.log(resp);
      }
    );
  }

  matchSongsToEffort(efforts: any[]): void {
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + sessionStorage.getItem('spotify_access_token'));
    this.http.get<any>('https://api.spotify.com/v1/me/player/recently-played?limit=50', {
      headers
    }).subscribe(
      recentSongs => {
        const effortSongs = [];
        efforts.forEach(effort => {
          const effortStartTime = new Date(effort.start_date);
          const effortEndTime = new Date(new Date(effortStartTime).setSeconds(effortStartTime.getSeconds() + effort.moving_time));
          const filteredSongs = recentSongs.items.filter(song => {
            const songStartTime = new Date(song.played_at);
            const durationSeconds = song.track.duration_ms / 1000;
            const songEndTime = new Date(new Date(song.played_at).setSeconds(songStartTime.getSeconds() + durationSeconds));
            return songStartTime.getTime() + 60000 <= effortEndTime.getTime() && songEndTime.getTime() - 60000 >= effortStartTime.getTime();
          });
          if (filteredSongs.length === 0) {
            let songBeforeSegment;
            for (const s of recentSongs.items) {
              if (new Date(s.played_at).getTime() < effortStartTime.getTime()) {
                songBeforeSegment = s;
                break;
              }
            }
            console.log('song before segment', songBeforeSegment);
            filteredSongs.push(songBeforeSegment);
          }
          effortSongs.push({
            effort_name: effort.name,
            effort_start_time: effortStartTime,
            effort_end_time: effortEndTime,
            effort,
            songs: filteredSongs
          });
          effortSongs.sort((a, b) => new Date(a.effort_start_time).getTime() < new Date(b.effort_start_time).getTime() ? -1 :
                                     new Date(a.effort_start_time).getTime() > new Date(b.effort_start_time).getTime() ?  1 : 0);
          this.effortSongs = [...effortSongs];
        });
        console.log('effor songs', effortSongs);
      }
    );
  }

  calcSongEndTime(song): Date {
    const time = new Date(song.played_at);
    return new Date(time.setSeconds(time.getSeconds() + (song.track.duration_ms / 1000.0)));
  }

  makeDate(date): Date {
    return new Date(date);
  }

  getMostRecentActivity(): void {
    let headers = new HttpHeaders();
    headers = headers.set('Authorization', 'Bearer ' + sessionStorage.getItem('strava_access_token'));
    this.http.get<any>('https://www.strava.com/api/v3/athlete/activities?page=1&per_page=1', {
      headers
    }).subscribe(
      lastActivities => {
        const lastActivityId = lastActivities[0].id;
        this.http.get<any>(`https://www.strava.com/api/v3/activities/${lastActivityId}?include_all_efforts=`, {
          headers
        }).subscribe(
          activity => {
            console.log(activity);
            const bestEfforts = activity.best_efforts;
            const segmentEfforts = activity.segment_efforts;
            const prEfforts = [];
            bestEfforts.forEach(effort => {
              if (effort.pr_rank) {
                prEfforts.push(effort);
              }
              else if ((effort.distance / effort.moving_time) > activity.average_speed) {
                console.log('effort average', effort.distance / effort.moving_time);
                console.log('activity average', activity.average_speed);
                prEfforts.push(effort);
              }
            });
            segmentEfforts.forEach(effort => {
              if (effort.pr_rank) {
                prEfforts.push(effort);
              }
              else if ((effort.distance / effort.moving_time) > activity.average_speed) {
                console.log('effort average', effort.distance / effort.moving_time);
                console.log('activity average', activity.average_speed);
                prEfforts.push(effort);
              }
            });
            console.log(prEfforts);
            this.matchSongsToEffort(prEfforts.filter(effort => effort.moving_time < 360));
            // this.matchSongsToEffort(prEfforts);
          }
        );
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
