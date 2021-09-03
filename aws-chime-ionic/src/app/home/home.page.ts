import CircularCut from './videofilter/CircularCut';
import EmojifyVideoFrameProcessor from './videofilter/EmojifyVideoFrameProcessor';
import SegmentationProcessor from './videofilter/SegmentationProcessor';
import { AfterViewInit, Component } from '@angular/core';
import { AlertController, LoadingController, ToastController } from '@ionic/angular';
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
  VideoDownlinkObserver,
  Versioning,
  AsyncScheduler,
  VideoInputDevice,
  Device,
  DefaultVideoTransformDevice,
  NoOpVideoFrameProcessor,
  Logger,
  VideoFrameProcessor,
  VoiceFocusTransformDevice,
  DataMessage,
  MeetingSessionPOSTLogger,
  DefaultAudioMixController,
  DefaultBrowserBehavior,

} from 'amazon-chime-sdk-js';
import { API } from '../service/api/api.service';
import { Platform } from '@ionic/angular';
declare var global: any;
import * as markdown from "markdown-it";
declare var cordova;

let fatal: (e: Error) => void;

// This shim is needed to avoid warnings when supporting Safari.
declare global {
  interface Window {
    webkitAudioContext: typeof AudioContext
  }
}
class DemoTileOrganizer {
  // this is index instead of length
  static MAX_TILES = 1;
  tiles: { [id: number]: number } = {};
  tileStates: { [id: number]: boolean } = {};
  remoteTileCount = 0;

  acquireTileIndex(tileId: number): number {
    for (let index = 0; index <= DemoTileOrganizer.MAX_TILES; index++) {
      if (this.tiles[index] === tileId) {
        return index;
      }
    }
    for (let index = 0; index <= DemoTileOrganizer.MAX_TILES; index++) {
      if (!(index in this.tiles)) {
        this.tiles[index] = tileId;
        this.remoteTileCount++;
        return index;
      }
    }
    throw new Error('no tiles are available');
  }

  releaseTileIndex(tileId: number): number {
    for (let index = 0; index <= DemoTileOrganizer.MAX_TILES; index++) {
      if (this.tiles[index] === tileId) {
        this.remoteTileCount--;
        delete this.tiles[index];
        return index;
      }
    }
    return DemoTileOrganizer.MAX_TILES;
  }
}

let SHOULD_DIE_ON_FATALS = (() => {
  const isLocal = document.location.host === '127.0.0.1:8080' || document.location.host === 'localhost:8080';
  const fatalYes = document.location.search.includes('fatal=1');
  const fatalNo = document.location.search.includes('fatal=0');
  return fatalYes || (isLocal && !fatalNo);
})();

type VideoFilterName = 'Emojify' | 'CircularCut' | 'NoOp' | 'Segmentation' | 'None';

const VIDEO_FILTERS: VideoFilterName[] = ['Emojify', 'CircularCut', 'NoOp']; class TestSound {
  static testAudioElement = new Audio();

  constructor(
    private logger: Logger,
    private sinkId: string | null,
    private frequency: number = 440,
    private durationSec: number = 1,
    private rampSec: number = 0.1,
    private maxGainValue: number = 0.1
  ) { }

  async init(): Promise<void> {
    const audioContext: AudioContext = new (window.AudioContext || window.webkitAudioContext)();
    const gainNode = audioContext.createGain();
    gainNode.gain.value = 0;
    const oscillatorNode = audioContext.createOscillator();
    oscillatorNode.frequency.value = this.frequency;
    oscillatorNode.connect(gainNode);
    const destinationStream = audioContext.createMediaStreamDestination();
    gainNode.connect(destinationStream);
    const currentTime = audioContext.currentTime;
    const startTime = currentTime + 0.1;
    gainNode.gain.linearRampToValueAtTime(0, startTime);
    gainNode.gain.linearRampToValueAtTime(this.maxGainValue, startTime + this.rampSec);
    gainNode.gain.linearRampToValueAtTime(
      this.maxGainValue,
      startTime + this.rampSec + this.durationSec
    );
    gainNode.gain.linearRampToValueAtTime(0, startTime + this.rampSec * 2 + this.durationSec);
    oscillatorNode.start();
    const audioMixController = new DefaultAudioMixController(this.logger);
    if (new DefaultBrowserBehavior().supportsSetSinkId()) {
      try {
        // @ts-ignore
        await audioMixController.bindAudioDevice({ deviceId: this.sinkId });
      } catch (e) {
        // fatal(e);
        this.logger?.error(`Failed to bind audio device: ${e}`);
      }
    }
    try {
      await audioMixController.bindAudioElement(TestSound.testAudioElement);
    } catch (e) {
      // fatal(e);
      this.logger?.error(`Failed to bind audio element: ${e}`);
    }
    await audioMixController.bindAudioStream(destinationStream.stream);
    new TimeoutScheduler((this.rampSec * 2 + this.durationSec + 1) * 1000).start(() => {
      audioContext.close();
    });
  }
}
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

export class HomePage implements AudioVideoObserver, DeviceChangeObserver, ContentShareObserver, AfterViewInit {
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
  // eslint-disable-next-line
  roster: any = {};
  tileIndexToTileId: { [id: number]: number } = {};
  tileIdToTileIndex: { [id: number]: number } = {};
  tileOrganizer: DemoTileOrganizer = new DemoTileOrganizer();
  tileIndexToPauseEventListener: { [id: number]: (event: Event) => void } = {};
  tileArea = document.getElementById('tile-area') as HTMLDivElement;

  // BASE_URL = 'http://localhost:8080/';
  BASE_URL = API.domain;
  region: string | null = null;

  chosenVideoTransformDevice: DefaultVideoTransformDevice;
  chosenVideoFilter: VideoFilterName = 'None';
  selectedVideoFilterItem: VideoFilterName = 'None';

  meetingLogger: Logger | undefined = undefined;

  voiceFocusDevice: VoiceFocusTransformDevice | undefined;

  static testVideo: string =
    'https://upload.wikimedia.org/wikipedia/commons/transcoded/c/c0/Big_Buck_Bunny_4K.webm/Big_Buck_Bunny_4K.webm.360p.vp9.webm';
  static readonly LOGGER_BATCH_SIZE: number = 85;
  static readonly LOGGER_INTERVAL_MS: number = 2_000;
  static readonly MAX_MEETING_HISTORY_MS: number = 5 * 60 * 1000;
  static readonly DATA_MESSAGE_TOPIC: string = 'chat';
  static readonly DATA_MESSAGE_LIFETIME_MS: number = 300_000;

  markdown = markdown({ linkify: true });
  lastMessageSender: string | null = null;
  lastReceivedMessageTimestamp = 0;

  constructor(
    public webApi: WebAPIServiceService,
    public loadingCtrl: LoadingController,
    public alertCtrl: AlertController,
    public toastCtrl: ToastController,
    public platform: Platform
  ) {
    // global = this;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (global as any).app = this;

    // this.addFatalHandlers();

    // if (document.location.search.includes('testfatal=1')) {
    //   this.fatal(new Error('Testing fatal.'));
    //   return;
    // }
    // this.initEventListeners();
    // this.initParameters();
    // this.setMediaRegion();
    // if (this.isRecorder() || this.isBroadcaster()) {
    //   AsyncScheduler.nextTick(async () => {
    //     this.meeting = new URL(window.location.href).searchParams.get('m');
    //     this.name = this.isRecorder() ? '«Meeting Recorder»' : '«Meeting Broadcaster»';
    //     await this.authenticate();
    //     await this.openAudioOutputFromSelection();
    //     await this.join();
    //     this.displayButtonStates();
    //     this.switchToFlow('flow-meeting');
    //   });
    // } else {
    //   this.switchToFlow('flow-authenticate');
    // }
  }

  ngAfterViewInit(): void {
    //Called after ngAfterContentInit when the component's view has been initialized. Applies to components only.
    //Add 'implements AfterViewInit' to the class.
    // (document.getElementById('sdk-version') as HTMLSpanElement).innerText =
    //   'amazon-chime-sdk-js@' + Versioning.sdkVersion;
    // this.tileArea = document.getElementById('tile-area') as HTMLDivElement;
    // this.setUpVideoTileElementResizer();
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  log(str: string, ...args: any[]): void {
    console.log.apply(console, [`[DEMO] ${str}`, ...args]);
  }

  // addFatalHandlers(): void {
  //   fatal = this.fatal.bind(this);

  //   const onEvent = (event: ErrorEvent): void => {
  //     // In Safari there's only a message.
  //     fatal(event.error || event.message);
  //   };

  //   // Listen for unhandled errors, too.
  //   window.addEventListener('error', onEvent);

  //   window.onunhandledrejection = (event: PromiseRejectionEvent) => {
  //     fatal(event.reason);
  //   };

  //   this.removeFatalHandlers = () => {
  //     window.onunhandledrejection = undefined;
  //     window.removeEventListener('error', onEvent);
  //     fatal = undefined;
  //     this.removeFatalHandlers = undefined;
  //   }
  // }

  setUpVideoTileElementResizer(): void {
    for (let i = 0; i <= DemoTileOrganizer.MAX_TILES; i++) {
      const videoElem = document.getElementById(`video-${i}`) as HTMLVideoElement;
      videoElem.onresize = () => {
        if (videoElem.videoHeight > videoElem.videoWidth) {
          // portrait mode
          videoElem.style.objectFit = 'contain';
          this.log(
            `video-${i} changed to portrait mode resolution ${videoElem.videoWidth}x${videoElem.videoHeight}`
          );
        } else {
          videoElem.style.objectFit = 'cover';
        }
      };
    }
  }

  submit() {
    AsyncScheduler.nextTick(
      async (): Promise<void> => {
        let chimeMeetingId: string = '';
        this.showProgress('progress-authenticate');
        try {
          chimeMeetingId = await this.authenticate();
        } catch (error) {
          console.error(error);
          const httpErrorMessage =
            'UserMedia is not allowed in HTTP sites. Either use HTTPS or enable media capture on insecure sites.';
          (document.getElementById(
            'failed-meeting'
          ) as HTMLDivElement).innerText = `Meeting ID: ${this.userDetails.ExternalMeetingId}`;
          (document.getElementById('failed-meeting-error') as HTMLDivElement).innerText =
            window.location.protocol === 'http:' ? httpErrorMessage : error.message;
          this.switchToFlow('flow-failed-meeting');
          return;
        }
        // (document.getElementById(
        //   'meeting-id'
        // ) as HTMLSpanElement).innerText = `${this.userDetails.ExternalMeetingId} (${this.region})`;
        // (document.getElementById(
        //   'chime-meeting-id'
        // ) as HTMLSpanElement).innerText = `Meeting ID: ${chimeMeetingId}`;
        // (document.getElementById(
        //   'mobile-chime-meeting-id'
        // ) as HTMLSpanElement).innerText = `Meeting ID: ${chimeMeetingId}`;
        // (document.getElementById(
        //   'mobile-attendee-id'
        // ) as HTMLSpanElement).innerText = `Attendee ID: ${this.meetingSession.configuration.credentials.attendeeId}`;
        // (document.getElementById(
        //   'desktop-attendee-id'
        // ) as HTMLSpanElement).innerText = `Attendee ID: ${this.meetingSession.configuration.credentials.attendeeId}`;
        // (document.getElementById('info-meeting') as HTMLSpanElement).innerText = this.userDetails.ExternalMeetingId;
        // (document.getElementById('info-name') as HTMLSpanElement).innerText = this.userDetails.ExternalUserId;

        // await this.initVoiceFocus();
        await this.populateAllDeviceLists();
        // await this.populateVideoFilterInputList();

        this.switchToFlow('flow-devices');
        // await this.openAudioInputFromSelectionAndPreview();
        try {
          await this.openVideoInputFromSelection(
            (document.getElementById('video-input') as HTMLSelectElement).value,
            true
          );
        } catch (err) {
          this.fatal(err);
        }
        // await this.openAudioOutputFromSelection();
        this.hideProgress('progress-authenticate');

        // Open the signaling connection while the user is checking their input devices.
        const preconnect = document.getElementById('preconnect') as HTMLInputElement;
        if (preconnect.checked) {
          this.audioVideo.start({ signalingOnly: true });
        }
      }
    );
  }

  private selectedVideoInput: string | null = null;
  async openVideoInputFromSelection(selection: string | null, showPreview: boolean): Promise<void> {
    if (selection) {
      this.selectedVideoInput = selection;
    }
    this.log(`Switching to: ${this.selectedVideoInput}`);
    const device = await this.videoInputSelectionToDevice(this.selectedVideoInput);
    if (device === null) {
      if (showPreview) {
        this.audioVideo.stopVideoPreviewForVideoInput(
          document.getElementById('video-preview') as HTMLVideoElement
        );
      }
      this.audioVideo.stopLocalVideoTile();
      // this.toggleButton('button-camera', 'off');
      // choose video input null is redundant since we expect stopLocalVideoTile to clean up
      try {
        await this.audioVideo.chooseVideoInputDevice(device);
      } catch (e) {
        this.fatal(e);
        this.log(`failed to chooseVideoInputDevice ${device}`, e);
      }
      this.log('no video device selected');
    }
    try {
      await this.audioVideo.chooseVideoInputDevice(device);
    } catch (e) {
      this.fatal(e);
      this.log(`failed to chooseVideoInputDevice ${device}`, e);
    }

    if (showPreview) {
      this.audioVideo.startVideoPreviewForVideoInput(
        document.getElementById('video-preview') as HTMLVideoElement
      );
    }
  }

  private async videoInputSelectionToDevice(value: string): Promise<VideoInputDevice> {
    if (this.isRecorder() || this.isBroadcaster() || value === 'None') {
      return null;
    }
    const intrinsicDevice = this.videoInputSelectionToIntrinsicDevice(value);
    return await this.videoInputSelectionWithOptionalFilter(intrinsicDevice);
  }

  private videoInputSelectionToIntrinsicDevice(value: string): Device {
    if (value === 'Blue') {
      return DefaultDeviceController.synthesizeVideoDevice('blue');
    }

    if (value === 'SMPTE Color Bars') {
      return DefaultDeviceController.synthesizeVideoDevice('smpte');
    }

    return value;
  }

  private async videoInputSelectionWithOptionalFilter(
    innerDevice: Device
  ): Promise<VideoInputDevice> {
    if (this.selectedVideoFilterItem === 'None') {
      return innerDevice;
    }

    if (
      this.chosenVideoTransformDevice &&
      this.selectedVideoFilterItem === this.chosenVideoFilter
    ) {
      if (this.chosenVideoTransformDevice.getInnerDevice() !== innerDevice) {
        // switching device
        this.chosenVideoTransformDevice = this.chosenVideoTransformDevice.chooseNewInnerDevice(
          innerDevice
        );
      }
      return this.chosenVideoTransformDevice;
    }

    // A different processor is selected then we need to discard old one and recreate
    if (this.chosenVideoTransformDevice) {
      await this.chosenVideoTransformDevice.stop();
    }

    const proc = this.videoFilterToProcessor(this.selectedVideoFilterItem);
    this.chosenVideoFilter = this.selectedVideoFilterItem;
    this.chosenVideoTransformDevice = new DefaultVideoTransformDevice(
      this.meetingLogger,
      innerDevice,
      [proc]
    );
    return this.chosenVideoTransformDevice;
  }

  private videoFilterToProcessor(videoFilter: VideoFilterName): VideoFrameProcessor | null {
    this.log(`Choosing video filter ${videoFilter}`);

    if (videoFilter === 'Emojify') {
      return new EmojifyVideoFrameProcessor('🚀');
    }

    if (videoFilter === 'CircularCut') {
      return new CircularCut();
    }

    if (videoFilter === 'NoOp') {
      return new NoOpVideoFrameProcessor();
    }

    if (videoFilter === 'Segmentation') {
      return new SegmentationProcessor();
    }

    return null;
  }

  isRecorder(): boolean {
    return new URL(window.location.href).searchParams.get('record') === 'true';
  }

  isBroadcaster(): boolean {
    return new URL(window.location.href).searchParams.get('broadcast') === 'true';
  }

  /**
   * We want to make it abundantly clear at development and testing time
   * when an unexpected error occurs.
   * If we're running locally, or we passed a `fatal=1` query parameter, fail hard.
   */
  fatal(e: Error | string): void {
    // Muffle mode: let the `try-catch` do its job.
    if (!SHOULD_DIE_ON_FATALS) {
      console.info('Ignoring fatal', e);
      return;
    }

    console.error('Fatal error: this was going to be caught, but should not have been thrown.', e);

    if (e && e instanceof Error) {
      document.getElementById('stack').innerText = e.message + '\n' + e.stack?.toString();
    } else {
      document.getElementById('stack').innerText = '' + e;
    }

    this.switchToFlow('flow-fatal');
  }

  showProgress(id: string): void {
    (document.getElementById(id) as HTMLDivElement).style.visibility = 'visible';
  }

  hideProgress(id: string): void {
    (document.getElementById(id) as HTMLDivElement).style.visibility = 'hidden';
  }

  switchToFlow(flow: string): void {
    // Array.from(document.getElementsByClassName('flow')).map(
    //   e => ((e as HTMLDivElement).style.display = 'none')
    // );
    // (document.getElementById(flow) as HTMLDivElement).style.display = 'block';
  }

  async authenticate(): Promise<string> {
    const joinInfo = (await this.joinMeetingNew()).JoinInfo;
    const configuration = new MeetingSessionConfiguration(joinInfo.Meeting, joinInfo.Attendee);
    await this.initializeMeetingSession(configuration);
    const url = new URL(window.location.href);
    url.searchParams.set('m', this.userDetails.ExternalMeetingId);
    history.replaceState({}, `${this.userDetails.ExternalMeetingId}`, url.toString());
    return configuration.meetingId;
  }

  // eslint-disable-next-line
  async joinMeetingNew(): Promise<any> {
    this.region = 'ap-south-1';
    const response = await fetch(
      `${this.BASE_URL}join?title=${encodeURIComponent(
        this.userDetails.ExternalMeetingId
      )}&name=${encodeURIComponent(this.userDetails.ExternalUserId
      )}&region=${encodeURIComponent(this.region)}`,
      {
        method: 'POST',
      }
    );
    const json = await response.json();
    if (json.error) {
      throw new Error(`Server error: ${json.error}`);
    }
    return json;
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
    if (type == 2) {
      this.presentLoading('Loading...');
    }
    this.videoOn = false;
    await this.getMeetingDetails({ ExternalMeetingId: this.userDetails.ExternalMeetingId }, (res) => {
      if (res.Meeting) {
        this.meetingData = res;
        let params = {
          MeetingId: this.meetingData.Meeting.MeetingId,
          ExternalUserId: ''
        }
        type == 1 ? params.ExternalUserId = this.userDetails.MeetingHostId : params.ExternalUserId = this.userDetails.ExternalUserId;
        this.webApi.createAtt(params)
          .then((response: any) => {
            this.attendeeData = response;
            this.videoOn = true;
            this.joinMeeting(this.meetingData, this.attendeeData);
          }).catch(err => {
            console.log(err)
            this.dismissAll();
          });
      } else {
        this.presentToast(res.message);
      }
    }).catch(err => {
      console.log(err);
      this.dismissAll();
    });
  };

  presentToast(msg) {
    this.toastCtrl.create({
      message: msg,
      duration: 2000,
      animated: true,
      cssClass: 'warning'
    }).then((toastData) => {
      console.log('toastData', toastData);
      toastData.present();
    });
  }

  async joinMeeting(meetingData, attendeeData) {
    this.tileArea = document.getElementById('tile-area') as HTMLDivElement;
    this.setUpVideoTileElementResizer();
    // meetingData = this.meetingData;
    // attendeeData = this.attendeeData;
    const configuration = new MeetingSessionConfiguration(meetingData, attendeeData);
    await this.initializeMeetingSession(configuration);
    await this.populateAllDeviceLists();
    await this.startLocalVideoButton();
    await this.join();
    // this.refreshVideos();
  };



  refreshVideos() {
    if (this.platform.is('ios') && this.platform.is('cordova')) {
      cordova.plugins.iosrtc.refreshVideos();
    }
  }

  async join(): Promise<void> {
    window.addEventListener('unhandledrejection', (event: PromiseRejectionEvent) => {
      this.log(event.reason);
    });

    this.audioVideo.start();
  }

  async leave(): Promise<void> {
    // this.resetStats();
    this.audioVideo.stop();
    await this.voiceFocusDevice?.stop();
    this.voiceFocusDevice = undefined;

    await this.chosenVideoTransformDevice?.stop();
    this.chosenVideoTransformDevice = undefined;
    this.roster = {};
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  async endMeeting(): Promise<any> {
    // this.meetingData.Meeting.MeetingId;
    const meeting = this.userDetails.ExternalMeetingId;
    // await fetch(`${this.BASE_URL}end?title=${encodeURIComponent(meeting)}`, {
    //   method: 'POST',
    // });
    let params = {
      ExternalMeetingId: meeting
    }
    this.webApi.deleteMeeting(params)
      .then((response: any) => {
        console.log('response : ', response);
      }).catch(err => {
        console.log('err : ', err);
      });
  }

  async end() {
    await this.endMeeting();
    await this.leave();
    this.videoOn = false;
  }

  async initializeMeetingSession(configuration: MeetingSessionConfiguration): Promise<void> {
    this.dismissAll();
    const logger = new ConsoleLogger('SDK', LogLevel.DEBUG);
    const deviceController = new DefaultDeviceController(logger);
    this.meetingSession = new DefaultMeetingSession(configuration, logger, deviceController);
    console.log("MEETING SESSION", this.meetingSession);

    this.audioVideo = this.meetingSession.audioVideo;
    this.audioVideo.addDeviceChangeObserver(this);
    // this.audioVideo.start();

    this.setupDeviceLabelTrigger();
    this.setupMuteHandler();
    // this.setupCanUnmuteHandler();
    this.setupSubscribeToAttendeeIdPresenceHandler();
    this.audioVideo.addObserver(this);
    this.audioVideo.addContentShareObserver(this);
    // this.initContentShareDropDownItems();

    // //SETUP AUDIO
    // this.audioVideo = this.meetingSession.audioVideo;
    // const audioElement = document.getElementById('notary-audio') as HTMLVideoElement;
    // this.audioVideo.bindAudioElement(audioElement);
    // const videoElement = document.getElementById('notary-video') as HTMLVideoElement;
    // // Make sure you have chosen your camera. In this use case, you will choose the first device.
    // const videoInputDevices = await this.audioVideo.listVideoInputDevices();
    // // The camera LED light will turn on indicating that it is now capturing.
    // // See the "Device" section for details.
    // await this.audioVideo.chooseVideoInputDevice(videoInputDevices[0].deviceId);
    // let localTileId = this.localTileId();
    // const observer = {
    //   audioVideoDidStart: () => {
    //     console.log('Started');
    //   },
    //   audioVideoDidStop: sessionStatus => {
    //     // See the "Stopping a session" section for details.
    //     console.log('Stopped with a session status code: ', sessionStatus.statusCode());
    //   },
    //   audioVideoDidStartConnecting: reconnecting => {
    //     if (reconnecting) {
    //       // e.g. the WiFi connection is dropped.
    //       console.log('Attempting to reconnect');
    //     }
    //   },
    //   // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
    //   videoTileDidUpdate: tileState => {
    //     // Ignore a tile without attendee ID and other attendee's tile.
    //     if (!tileState.boundAttendeeId || !tileState.localTile) {
    //       return;
    //     }
    //     // videoTileDidUpdate is also invoked when you call startLocalVideoTile or tileState changes.
    //     console.log(`If you called stopLocalVideoTile, ${tileState.active} is false.`);
    //     this.audioVideo.bindVideoElement(tileState.tileId, videoElement);
    //     localTileId = tileState.tileId;
    //     if (tileState.active) {
    //       this.videoOn = true;
    //     } else {
    //       this.videoOn = false;
    //     }
    //   },
    //   videoTileWasRemoved: tileId => {
    //     if (localTileId === tileId) {
    //       console.log(`You called removeLocalVideoTile. videoElement can be bound to another tile.`);
    //       localTileId = null;
    //     }
    //   }
    // };
    // this.audioVideo.addObserver(observer);
    // this.audioVideo.start();
  }

  async stopTile() {
    this.audioVideo.stopLocalVideoTile();
  }

  async startTile() {
    const videoElement = document.getElementById('notary-video') as HTMLVideoElement;
    let localTileId = this.localTileId();
    this.audioVideo.bindVideoElement(localTileId, videoElement);
    // localTileId = tileState.tileId;
    this.videoOn = true;
  }

  // async startAudioVideo() {
  //   //SETUP AUDIO
  //   this.audioVideo = this.meetingSession.audioVideo;
  //   const audioElement = document.getElementById('notary-audio') as HTMLVideoElement;
  //   this.audioVideo.bindAudioElement(audioElement);
  //   const videoElement = document.getElementById('notary-video') as HTMLVideoElement;;
  //   // Make sure you have chosen your camera. In this use case, you will choose the first device.
  //   const videoInputDevices = await this.audioVideo.listVideoInputDevices();
  //   // The camera LED light will turn on indicating that it is now capturing.
  //   // See the "Device" section for details.
  //   await this.audioVideo.chooseVideoInputDevice(videoInputDevices[0].deviceId);
  //   let localTileId = this.localTileId();
  //   const observer = {
  //     audioVideoDidStart: () => {
  //       console.log('Started');
  //     },
  //     audioVideoDidStop: sessionStatus => {
  //       // See the "Stopping a session" section for details.
  //       console.log('Stopped with a session status code: ', sessionStatus.statusCode());
  //     },
  //     audioVideoDidStartConnecting: reconnecting => {
  //       if (reconnecting) {
  //         // e.g. the WiFi connection is dropped.
  //         console.log('Attempting to reconnect');
  //       }
  //     },
  //     // videoTileDidUpdate is called whenever a new tile is created or tileState changes.
  //     videoTileDidUpdate: tileState => {
  //       // Ignore a tile without attendee ID and other attendee's tile.
  //       if (!tileState.boundAttendeeId || !tileState.localTile) {
  //         return;
  //       }
  //       // videoTileDidUpdate is also invoked when you call startLocalVideoTile or tileState changes.
  //       console.log(`If you called stopLocalVideoTile, ${tileState.active} is false.`);
  //       this.audioVideo.bindVideoElement(tileState.tileId, videoElement);
  //       localTileId = tileState.tileId;
  //     },
  //     videoTileWasRemoved: tileId => {
  //       if (localTileId === tileId) {
  //         console.log(`You called removeLocalVideoTile. videoElement can be bound to another tile.`);
  //         localTileId = null;
  //       }
  //     }
  //   };
  //   this.audioVideo.addObserver(observer);
  //   this.audioVideo.start();
  // }

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
    const audioInputDevices = await this.audioVideo.listAudioInputDevices();
    const audioOutputDevices = await this.audioVideo.listAudioOutputDevices();
    // await this.audioVideo.chooseAudioInputDevice(null);
    // await this.audioVideo.chooseAudioOutputDevice(null);
    const videoInputDeviceInfo = videoInputDevices[0];
    const audioVideoDeviceInfo = audioInputDevices[0];
    const audioOutputDeviceInfo = audioOutputDevices[0];
    if (videoInputDeviceInfo) {
      await this.audioVideo.chooseVideoInputDevice(videoInputDeviceInfo.deviceId);
    }
    if (audioVideoDeviceInfo) {
      await this.audioVideo.chooseAudioInputDevice(audioVideoDeviceInfo.deviceId);
    }
    if (audioOutputDeviceInfo) {
      await this.audioVideo.chooseAudioOutputDevice(audioOutputDeviceInfo.deviceId);
    }
    // this.audioVideo.addDeviceChangeObserver(this);
    // this.audioVideo.startVideoPreviewForVideoInput(
    //   document.getElementById('video-preview') as HTMLVideoElement
    // );
    const audioMix = document.getElementById('meeting-audio') as HTMLAudioElement;
    try {
      await this.audioVideo.bindAudioElement(audioMix);
    } catch (e) {
      fatal(e);
      this.log('failed to bindAudioElement', e);
    }
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
      ? 1
      : this.tileOrganizer.acquireTileIndex(tileState.tileId);
    const tileElement = document.getElementById(`tile-${tileIndex}`) as HTMLDivElement;
    const videoElement = document.getElementById(`video-${tileIndex}`) as HTMLVideoElement;
    const nameplateElement = document.getElementById(`nameplate-${tileIndex}`) as HTMLDivElement;
    const pauseStateElement = document.getElementById(`pause-state-${tileIndex}`) as HTMLDivElement;
    const attendeeIdElement = document.getElementById(`attendeeid-${tileIndex}`) as HTMLDivElement;
    const pauseButtonElement = document.getElementById(
      `video-pause-${tileIndex}`
    ) as HTMLButtonElement;
    const pinButtonElement = document.getElementById(
      `video-pin-${tileIndex}`
    ) as HTMLButtonElement;

    if (pauseButtonElement) {
      // pauseButtonElement.addEventListener('click', () => {
      //   if (!tileState.paused) {
      //     this.audioVideo.pauseVideoTile(tileState.tileId);
      //   }
      // });
      pauseButtonElement.removeEventListener('click', this.tileIndexToPauseEventListener[tileIndex]);
      this.tileIndexToPauseEventListener[tileIndex] = this.createPauseResumeListener(tileState);
      pauseButtonElement.addEventListener('click', this.tileIndexToPauseEventListener[tileIndex]);
    }

    // if (resumeButtonElement) {
    //   resumeButtonElement.addEventListener('click', () => {
    //     if (tileState.paused) {
    //       this.audioVideo.unpauseVideoTile(tileState.tileId);
    //     }
    //   });
    // }

    console.log(`binding video tile ${tileState.tileId} to ${videoElement.id}`);
    this.audioVideo.bindVideoElement(tileState.tileId, videoElement);
    this.tileIndexToTileId[tileIndex] = tileState.tileId;
    this.tileIdToTileIndex[tileState.tileId] = tileIndex;

    if (tileState.boundExternalUserId) {
      this.updateProperty(nameplateElement, 'innerText', tileState.boundExternalUserId.split('#').slice(-1)[0]);
    }
    this.updateProperty(attendeeIdElement, 'innerText', tileState.boundAttendeeId);
    if (tileState.paused && this.roster[tileState.boundAttendeeId].bandwidthConstrained) {
      this.updateProperty(pauseStateElement, 'innerText', '⚡');
    } else {
      this.updateProperty(pauseStateElement, 'innerText', '');
    }
    this.showTile(tileElement, tileState);
    this.updateGridClasses();
    this.layoutFeaturedTile();

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
    // this.layoutVideoTiles();
  }

  createPauseResumeListener(tileState: VideoTileState): (event: Event) => void {
    return (event: Event): void => {
      if (!tileState.paused) {
        this.audioVideo.pauseVideoTile(tileState.tileId);
        (event.target as HTMLButtonElement).innerText = 'Resume';
      } else {
        this.audioVideo.unpauseVideoTile(tileState.tileId);
        (event.target as HTMLButtonElement).innerText = 'Pause';
      }
    }
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  updateProperty(obj: any, key: string, value: string): void {
    if (value !== undefined && obj[key] !== value) {
      obj[key] = value;
    }
  }

  showTile(tileElement: HTMLDivElement, tileState: VideoTileState): void {
    tileElement.classList.add(`active`);

    if (tileState.isContent) {
      tileElement.classList.add('content');
    }
  }

  updateGridClasses(): void {
    const localTileId = this.localTileId();
    const activeTile = this.activeTileId();

    this.tileArea.className = `v-grid size-${this.availablelTileSize()}`;

    if (activeTile && activeTile !== localTileId) {
      this.tileArea.classList.add('featured');
    } else {
      this.tileArea.classList.remove('featured');
    }
  }

  availablelTileSize(): number {
    return (
      this.tileOrganizer.remoteTileCount + (this.audioVideo.hasStartedLocalVideoTile() ? 1 : 0)
    );
  }

  visibleTileIndices(): number[] {
    const tileKeys = Object.keys(this.tileOrganizer.tiles);
    const tiles = tileKeys.map(tileId => parseInt(tileId));
    return tiles;
  }

  localTileId(): number | null {
    return this.audioVideo.hasStartedLocalVideoTile()
      ? this.audioVideo.getLocalVideoTile().state().tileId
      : null;
  }

  activeTileId(): number | null {
    let contentTileId = this.findContentTileId();
    if (contentTileId !== null) {
      return contentTileId;
    }
    for (const attendeeId in this.roster) {
      if (this.roster[attendeeId].active) {
        return this.tileIdForAttendeeId(attendeeId);
      }
    }
    return null;
  }

  tileIdForAttendeeId(attendeeId: string): number | null {
    for (const tile of this.audioVideo.getAllVideoTiles()) {
      const state = tile.state();
      if (state.boundAttendeeId === attendeeId) {
        return state.tileId;
      }
    }
    return null;
  }

  findContentTileId(): number | null {
    for (const tile of this.audioVideo.getAllVideoTiles()) {
      const state = tile.state();
      if (state.isContent) {
        return state.tileId;
      }
    }
    return null;
  }

  layoutFeaturedTile(): void {
    if (!this.meetingSession) {
      return;
    }
    const tilesIndices = this.visibleTileIndices();
    const localTileId = this.localTileId();
    const activeTile = this.activeTileId();

    for (let i = 0; i < tilesIndices.length; i++) {
      const tileIndex = tilesIndices[i];
      const tileElement = document.getElementById(`tile-${tileIndex}`) as HTMLDivElement;
      const tileId = this.tileIndexToTileId[tileIndex];

      if (tileId === activeTile && tileId !== localTileId) {
        tileElement.classList.add('featured');
      } else {
        tileElement.classList.remove('featured');
      }
    }

    this.updateGridClasses();
  }

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
    this.end();
    this.presentToast('Meeting ended...');
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

  sendMessage() {
    AsyncScheduler.nextTick(() => {
      const textArea = document.getElementById('send-message') as HTMLTextAreaElement;
      const textToSend = textArea.value.trim();
      if (!textToSend) {
        return;
      }
      textArea.value = '';
      this.audioVideo.realtimeSendDataMessage(
        HomePage.DATA_MESSAGE_TOPIC,
        textToSend,
        HomePage.DATA_MESSAGE_LIFETIME_MS
      );
      // echo the message to the handler
      this.dataMessageHandler(
        new DataMessage(
          Date.now(),
          HomePage.DATA_MESSAGE_TOPIC,
          new TextEncoder().encode(textToSend),
          this.meetingSession.configuration.credentials.attendeeId,
          this.meetingSession.configuration.credentials.externalUserId
        )
      );
    });
  }

  dataMessageHandler(dataMessage: DataMessage): void {
    if (!dataMessage.throttled) {
      const isSelf =
        dataMessage.senderAttendeeId === this.meetingSession.configuration.credentials.attendeeId;
      if (dataMessage.timestampMs <= this.lastReceivedMessageTimestamp) {
        return;
      }
      this.lastReceivedMessageTimestamp = dataMessage.timestampMs;
      const messageDiv = document.getElementById('receive-message') as HTMLDivElement;
      const messageNameSpan = document.createElement('div') as HTMLDivElement;
      messageNameSpan.classList.add('message-bubble-sender');
      messageNameSpan.innerText = dataMessage.senderExternalUserId.split('#').slice(-1)[0];
      const messageTextSpan = document.createElement('div') as HTMLDivElement;
      messageTextSpan.classList.add(isSelf ? 'message-bubble-self' : 'message-bubble-other');
      messageTextSpan.innerHTML = this.markdown
        .render(dataMessage.text())
        .replace(/[<]a /g, '<a target="_blank" ');
      const appendClass = (element: HTMLElement, className: string): void => {
        for (let i = 0; i < element.children.length; i++) {
          const child = element.children[i] as HTMLElement;
          child.classList.add(className);
          appendClass(child, className);
        }
      };
      appendClass(messageTextSpan, 'markdown');
      if (this.lastMessageSender !== dataMessage.senderAttendeeId) {
        messageDiv.appendChild(messageNameSpan);
      }
      this.lastMessageSender = dataMessage.senderAttendeeId;
      messageDiv.appendChild(messageTextSpan);
      messageDiv.scrollTop = messageDiv.scrollHeight;
    } else {
      this.log('Message is throttled. Please resend');
    }
  }

  meetingEventPOSTLogger: MeetingSessionPOSTLogger;
  async testSound() {
    const audioOutput = document.getElementById('audio-output') as HTMLSelectElement;
    const testSound = new TestSound(this.meetingEventPOSTLogger, audioOutput.value);
    await testSound.init();
  }
}
