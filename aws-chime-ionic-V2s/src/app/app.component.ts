import { Component } from '@angular/core';
import { Platform } from '@ionic/angular';
import { AndroidPermissions } from '@ionic-native/android-permissions/ngx';
// import { Diagnostic } from '@ionic-native/diagnostic/ngx';
declare var cordova;
@Component({
  selector: 'app-root',
  templateUrl: 'app.component.html',
  styleUrls: ['app.component.scss'],
})
export class AppComponent {
  constructor(
    private platform: Platform,
    private androidPermissions: AndroidPermissions,
    // private _Diagnostic: Diagnostic
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
    }
    else if (this.platform.is('ios') && this.platform.is('cordova')) {
      // this.checkCameraPermissions().then(permissionOk => {
      //   if (permissionOk) {
      //     alert('awesome!');
      //   }
      //   else {
      //     alert('No Permission for camera');
      //   }
      // });

      // cordova.plugins.iosrtc.registerGlobals();
      // // load adapter.js (version 4.0.1)
      // const script2 = document.createElement('script');
      // script2.type = 'text/javascript';
      // script2.src = 'assets/libs/adapter-4.0.1.js';
      // // script2.src = 'assets/libs/adapter-latest.js';
      // script2.async = false;
      // document.head.appendChild(script2);
    } else {
      console.log('no need to ask permissions...');
    }
  };

  // checkCameraPermissions(): Promise<boolean> {
  //   return new Promise(resolve => {
  //     if (!this.pluginsAreAvailable()) {
  //       alert('Dev: Camera plugin unavailable.');
  //       resolve(false);
  //     }
  //     else if (this.isiOS()) {
  //       this._Diagnostic.getCameraAuthorizationStatus().then(status => {
  //         if (status == this._Diagnostic.permissionStatus.GRANTED) {
  //           resolve(true);
  //         }
  //         else if (status == this._Diagnostic.permissionStatus.DENIED) {
  //           resolve(false);
  //         }
  //         else if (status == this._Diagnostic.permissionStatus.NOT_REQUESTED || status.toLowerCase() == 'not_determined') {
  //           this._Diagnostic.requestCameraAuthorization().then(authorisation => {
  //             resolve(authorisation == this._Diagnostic.permissionStatus.GRANTED);
  //           });
  //         }
  //       });
  //     }
  //     else if (this.isAndroid()) {
  //       this._Diagnostic.isCameraAuthorized().then(authorised => {
  //         if (authorised) {
  //           resolve(true);
  //         }
  //         else {
  //           this._Diagnostic.requestCameraAuthorization().then(authorisation => {
  //             resolve(authorisation == this._Diagnostic.permissionStatus.GRANTED);
  //           });
  //         }
  //       });
  //     }
  //   });
  // };

  isAndroid() {
    return this.platform.is('android')
  }

  isiOS() {
    return this.platform.is('ios');
  }

  isUndefined(type) {
    return typeof type === "undefined";
  }

  pluginsAreAvailable() {
    return !this.isUndefined(window['plugins']);
  }
}
