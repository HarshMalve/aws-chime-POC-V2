import { Component } from '@angular/core';
import { WebAPIServiceService } from '../service/webAPIService/web-apiservice.service';
import {
  ConsoleLogger,
  DefaultDeviceController,
  DefaultMeetingSession,
  LogLevel,
  MeetingSessionConfiguration,
  AudioVideoObserver,
  AudioVideoFacade,
  MeetingSession,
  MeetingSessionStatus,
  ContentShareObserver,
  DeviceChangeObserver,
  RealtimeAttendeePositionInFrame,
  TimeoutScheduler,
  VideoTileState,
  DefaultModality,
  
} from 'amazon-chime-sdk-js';
import { AlertController, LoadingController } from '@ionic/angular';
declare var global: any;
@Component({
  selector: 'app-home',
  templateUrl: 'home.page.html',
  styleUrls: ['home.page.scss'],
})

// class DemoTileOrganizer {
//   // this is index instead of length
//   static MAX_TILES = 27;
//   tiles: { [id: number]: number } = {};
//   tileStates: { [id: number]: boolean } = {};
//   remoteTileCount = 0;

//   acquireTileIndex(tileId: number): number {
//     for (let index = 0; index <= DemoTileOrganizer.MAX_TILES; index++) {
//       if (this.tiles[index] === tileId) {
//         return index;
//       }
//     }
//     for (let index = 0; index <= DemoTileOrganizer.MAX_TILES; index++) {
//       if (!(index in this.tiles)) {
//         this.tiles[index] = tileId;
//         this.remoteTileCount++;
//         return index;
//       }
//     }
//     throw new Error('no tiles are available');
//   }

//   releaseTileIndex(tileId: number): number {
//     for (let index = 0; index <= DemoTileOrganizer.MAX_TILES; index++) {
//       if (this.tiles[index] === tileId) {
//         this.remoteTileCount--;
//         delete this.tiles[index];
//         return index;
//       }
//     }
//     return DemoTileOrganizer.MAX_TILES;
//   }
// };

export class HomePage implements AudioVideoObserver, ContentShareObserver, DeviceChangeObserver {
  audioVideo: AudioVideoFacade | null = null;
  isViewJoin = true;
  isViewCreate = false;
  userDetails = {
    // ClientRequestToken: '',
    MeetingHostId: '',
    ExternalMeetingId: '',
    ExternalUserId: '',
  };
  logger = new ConsoleLogger('MyLogger', LogLevel.INFO);
  deviceController = new DefaultDeviceController(this.logger);
  meetingData: any = {};
  attendeeData: any = {};
  meetingSession: MeetingSession | null = null; isLoading: boolean;
  rtAttPos: RealtimeAttendeePositionInFrame;
  videoOn: boolean = false;
  tileIndexToTileId: any;
  tileIdToTileIndex: any;
  roster: any;
  tileOrganizer: any;

  constructor(
    public webApi: WebAPIServiceService,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController
  ) {
    // global = this;
  }

  changeView() {
    if (this.isViewJoin) {
      this.isViewJoin = false;
      this.isViewCreate = true
    } else {
      this.isViewJoin = true;
      this.isViewCreate = false;
    }
  };

  async createMeet(params: any, cb) {
    await this.webApi.createMeet(params).then((response: any) => {
      try {
        cb(response);
      } catch (error) {
        console.error(error);
        cb(error);
      }
    }).catch((error: any) => {
      console.error(error);
      cb(error);
    });
  };

  async createMeeting(userDetails) {
    this.presentLoading('Loading...');
    if (userDetails.ExternalMeetingId && userDetails.MeetingHostId) {
      let params = {
        // ClientRequestToken: userDetails.ClientRequestToken,
        ExternalMeetingId: userDetails.ExternalMeetingId,
        MeetingHostId: userDetails.MeetingHostId,
        isActive: 'Y'
      };
      await this.createMeet(params, (result: any) => {
        this.meetingData = result;
        this.createAttendeeAndJoin(1);
      });
    } else {
      console.log('Enter all details');
      this.dismissAll();
    }
  };


  async getMeetingDetails(params, cb) {
    await this.webApi.getMeet(params).then((response: any) => {
      try {
        cb(response);
      } catch (error) {
        console.error(error);
        cb(error);
      }
    }).catch((error: any) => {
      console.error(error);
      cb(error);
    });
  };

  async createAttendeeAndJoin(type) {
    await this.getMeetingDetails({ ExternalMeetingId: this.userDetails.ExternalMeetingId }, (res) => {
      this.meetingData = res;
      let params = {
        MeetingId: this.meetingData.Meeting.MeetingId,
        ExternalUserId: ''
      }
      type == 1 ? params.ExternalUserId = this.userDetails.MeetingHostId : params.ExternalUserId = this.userDetails.ExternalUserId;
      this.webApi.createAtt(params)
        .then((response: any) => {
          this.attendeeData = response;
          this.joinMeeting(this.meetingData, this.attendeeData);
        }).catch(err => {
          console.log(err)
          this.dismissAll();
        });
    }).catch(err => {
      console.log(err);
      this.dismissAll();
    });
  };

  async joinMeeting(meetingData, attendeeData) {
    // meetingData = this.meetingData;
    // attendeeData = this.attendeeData;
    const configuration = new MeetingSessionConfiguration(meetingData, attendeeData);
    await this.initializeMeetingSession(configuration);
  };


  async initializeMeetingSession(configuration: MeetingSessionConfiguration): Promise<void> {
    this.dismissAll();
    const logger = new ConsoleLogger('SDK', LogLevel.DEBUG);
    const deviceController = new DefaultDeviceController(logger);
    this.meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
    this.audioVideo = this.meetingSession.audioVideo;
    this.audioVideo.addObserver(this);
    // this.meetingSession.contentShare.addContentShareObserver(this);
    // this.audioVideo.start();

    this.setupDeviceLabelTrigger();
    await this.populateAllDeviceLists();
    this.setupMuteHandler();
    // this.setupCanUnmuteHandler();
    this.setupSubscribeToAttendeeIdPresenceHandler();
    this.audioVideo.addObserver(this);
    this.audioVideo.addContentShareObserver(this);
    this.startLocalVideoButton();
    // this.initContentShareDropDownItems();
  }
  setupMuteHandler() {
    this.audioVideo.realtimeSubscribeToMuteAndUnmuteLocalAudio((muted) => {
      console.log('muted ' + muted);
    });
    this.audioVideo.realtimeSubscribeToSetCanUnmuteLocalAudio((canUnmuteHandler) => {
      console.log('canUnmuteHandler ' + canUnmuteHandler);
    });
    this.audioVideo.realtimeSubscribeToLocalSignalStrengthChange((localSignalStrengthChangeHandler) => {
      console.log('localSignalStrengthChangeHandler ' + localSignalStrengthChangeHandler);
    });
    this.audioVideo.realtimeSubscribeToFatalError((fatalErrorHandler) => {
      console.log('fatalErrorHandler ' + fatalErrorHandler);
    });
  }

  setupSubscribeToAttendeeIdPresenceHandler() {
    this.audioVideo.realtimeSubscribeToAttendeeIdPresence((attendeeId, present, externalUserId, dropped, posInFrame) => {
      console.log('attendeeId ' + attendeeId);
      console.log('present ' + present);
      console.log('externalUserId ' + externalUserId);
      console.log('dropped ' + dropped);
      console.log('posInFrame ' + posInFrame);
    });


  }

  async populateAllDeviceLists() {
    const videoInputDevices = await this.audioVideo.listVideoInputDevices();
    const audioInputDeivices = await this.audioVideo.listAudioInputDevices();
    await this.audioVideo.chooseAudioInputDevice(null);
    await this.audioVideo.chooseAudioOutputDevice(null);
    const videoInputDeviceInfo = videoInputDevices[0];
    const audioVideoDeviceInfo = audioInputDeivices[0];
    await this.audioVideo.chooseVideoInputDevice(videoInputDeviceInfo.deviceId);
    await this.audioVideo.chooseAudioInputDevice(audioVideoDeviceInfo.deviceId);
    this.audioVideo.addDeviceChangeObserver(this);
  }


  async startLocalVideoButton() {
    try {
      // Defaults to default video device for now
      const videoInputList = await this.audioVideo.listVideoInputDevices();
      const device = videoInputList && videoInputList[0];
      await this.audioVideo.chooseVideoInputDevice(device);
      this.audioVideo.startLocalVideoTile();
      this.bindVideo();
    } catch (err) {
      console.error(`no video input device selected: ${err}`);
    }
  };

  async stopLocalVideoButton() {
    this.audioVideo.stopLocalVideoTile();
  };

  async bindVideo() {
    const bindVideoElementTile = document.getElementById('bind-video-element-tile-id') as HTMLInputElement;
    const video0 = document.getElementById('video-0') as HTMLVideoElement;
    this.videoOn = true;
    this.audioVideo.bindVideoElement(1, video0);
  }

  videoTileDidUpdate(tileState: VideoTileState): void {
    console.log(`video tile updated: ${JSON.stringify(tileState, null, '  ')}`);
    if (!tileState.boundAttendeeId) {
      return;
    }
    const selfAttendeeId = this.meetingSession.configuration.credentials.attendeeId;
    const modality = new DefaultModality(tileState.boundAttendeeId);
    if (modality.base() === selfAttendeeId && modality.hasModality(DefaultModality.MODALITY_CONTENT)) {
      // don't bind one's own content
      return;
    }
    const tileIndex = tileState.localTile
      ? 16
      : this.tileOrganizer.acquireTileIndex(tileState.tileId);
    const tileElement = document.getElementById(`tile-${tileIndex}`) as HTMLDivElement;
    const videoElement = document.getElementById(`video-${tileIndex}`) as HTMLVideoElement;
    const nameplateElement = document.getElementById(`nameplate-${tileIndex}`) as HTMLDivElement;

    const pauseButtonElement = document.getElementById(`video-pause-${tileIndex}`) as HTMLButtonElement;
    const resumeButtonElement = document.getElementById(`video-resume-${tileIndex}`) as HTMLButtonElement;

    pauseButtonElement.addEventListener('click', () => {
      if (!tileState.paused) {
        this.audioVideo.pauseVideoTile(tileState.tileId);
      }
    });

    resumeButtonElement.addEventListener('click', () => {
      if (tileState.paused) {
        this.audioVideo.unpauseVideoTile(tileState.tileId);
      }
    });

    console.log(`binding video tile ${tileState.tileId} to ${videoElement.id}`);
    this.audioVideo.bindVideoElement(tileState.tileId, videoElement);
    this.tileIndexToTileId[tileIndex] = tileState.tileId;
    this.tileIdToTileIndex[tileState.tileId] = tileIndex;
    // TODO: enforce roster names
    new TimeoutScheduler(2000).start(() => {
      const rosterName = this.roster[tileState.boundAttendeeId]
        ? this.roster[tileState.boundAttendeeId].name
        : '';
      if (nameplateElement.innerHTML !== rosterName) {
        nameplateElement.innerHTML = rosterName;
      }
    });
    tileElement.style.display = 'block';
    this.layoutVideoTiles();
  };

  layoutVideoTiles() {
    throw new Error('Method not implemented.');
  }

  
  setupDeviceLabelTrigger() {
    this.audioVideo.setDeviceLabelTrigger(
      async (): Promise<MediaStream> => {
        // this.switchToFlow('flow-need-permission');
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: true });
        // this.switchToFlow('flow-devices');
        return stream;
      }
    )
  };

  audioVideoDidStartConnecting(reconnecting: boolean): void {
    console.log(`AudioVideoDidStartConnecting was called. Reconnecting: ${reconnecting}`);
  };

  audioVideoDidStart(): void {
    console.log('AudioVideoDidStart was called');
  };

  audioVideoDidStop(sessionStatus: MeetingSessionStatus): void {
    console.log('AudioVideoDidStop was called');
  };

  audioInputsChanged() {
    console.log('audioInputsChanged was called');
  };

  audioInputStreamEnded() {
    console.log('audioInputStreamEnded was called');
  };

  audioOutputsChanged() {
    console.log('audioOutputsChanged was called');
  }

  contentShareDidStart() {
    console.log('contentShareDidStart was called');
  };

  contentShareDidPause() {
    console.log('contentShareDidPause was called');
  };

  contentShareDidUnpause() {
    console.log('contentShareDidUnpause was called');
  };
  // 
  async presentLoading(msg) {
    this.isLoading = true;
    return await this.loadingCtrl.create({
      // duration: 5000,
      message: msg,
    }).then(a => {
      a.present().then(() => {
        console.log('presented');
        if (!this.isLoading) {
          a.dismiss().then(() => console.log('abort presenting'));
        }
      });
    });
  };

  async dismissAll() {
    setTimeout(async () => {
      while (await this.loadingCtrl.getTop() !== undefined) {
        this.isLoading = false;
        return await this.loadingCtrl.dismiss().then(() => console.log('dismissed all'));
      }
    }, 500);
  }
}
