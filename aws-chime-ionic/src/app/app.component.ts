import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private androidPermissions: AndroidPermissions
  ) {
    this.askPermissions();
  }

  askPermissions() {
    if (this.platform.is('android')) {
      this.platform.ready().then(() => {
        this.androidPermissions.requestPermissions(
          [
            this.androidPermissions.PERMISSION.CAMERA,
            this.androidPermissions.PERMISSION.MODIFY_AUDIO_SETTINGS,
            this.androidPermissions.PERMISSION.RECORD_AUDIO,
          ]
        );
      })

      // this.androidPermissions.checkPermission(this.androidPermissions.PERMISSION.CAMERA).then(
      //   result => console.log('Has permission?', result.hasPermission),
      //   err => this.androidPermissions.requestPermission(this.androidPermissions.PERMISSION.CAMERA)
      // );
    } else {
      console.log('no need to ask permissions...');
    }
  }
}
