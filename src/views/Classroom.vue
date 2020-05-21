<template>
  <v-app>
    <v-content>
      <video
        autoplay
        class="screen-video"
        muted
        playsinline
        ref="screenVideo"
        v-show="screenSharingStream != null || screenSharing"
      />
      <video
        autoplay
        class="real-self-video"
        muted
        playsinline
        ref="realSelfVideo"
      />
      <div class="members-list">
        <div :key="member.sid" class="member" v-for="member in membersList">
          <Live2D
            :height="48"
            :ref="`${member.sid}-live2d`"
            :type="member.character"
            :width="150"
            class="member-live2d"
            v-if="member.character != null"
          />
          <v-chip
            :color="member.color"
            @click="refreshLive2d(member.sid)"
            class="member-chip"
            ripple
          >
            <v-avatar :color="member.colorDark" class="member-chip__avatar" left>
              <v-icon :size="16" v-if="member.audio">mdi-microphone</v-icon>
              <v-icon :size="16" v-else>mdi-microphone-off</v-icon>
            </v-avatar>
            <v-avatar :color="member.colorDark" class="member-chip__avatar" left>
              <v-icon :size="16" v-if="member.character != null">mdi-video-outline</v-icon>
              <v-icon :size="16" v-else>mdi-video-off-outline</v-icon>
            </v-avatar>
            <span class="member-chip__nick-name">{{ member.nickName }}</span>
          </v-chip>
          <audio :ref="`${member.sid}-audio`" autoplay />
        </div>
      </div>
    </v-content>

    <v-bottom-navigation app v-model="navValue" value="null">
      <!-- 解除静音与静音按钮 -->
      <v-btn
        :disabled="audioBusy"
        :loading="audioBusy"
        @click="startAudio"
        v-if="audioStream == null"
        value="audio"
      >
        <template>解除静音</template>
        <v-icon>mdi-microphone-off</v-icon>
      </v-btn>
      <v-btn
        @click="stopAudio"
        color="indigo"
        v-else
        value="stopAudio"
      >
        <template>静 音</template>
        <v-icon>mdi-microphone</v-icon>
      </v-btn>

      <!-- 视频预览按钮与对话框 -->
      <v-dialog max-width="640" v-if="this.realVideoStream == null" v-model="videoDialogVisible">
        <template v-slot:activator="{ on }">
          <v-btn :loading="modelLoading || videoBusy" @click="prepareVideo" v-on="on" value="video">
            <template>开启视频</template>
            <v-icon>mdi-video-off</v-icon>
          </v-btn>
        </template>
        <v-card>
          <v-card-title class="subtitle-1">
            <v-icon class="mr-2">mdi-help-circle-outline</v-icon>
            今天你想用什么形象呢？
          </v-card-title>
          <v-card-text class="pb-0">
            <v-row align="end">
              <v-col :cols="5">
                <v-responsive :aspect-ratio="16 / 9">
                  <canvas
                    class="self-video self-video-overlap"
                    height="180"
                    ref="selfVideoOverlay"
                    v-show="videoStream != null"
                    width="320"
                  />
                  <video
                    autoplay
                    class="self-video"
                    muted
                    playsinline
                    ref="selfVideo"
                    v-show="videoStream != null"
                  />
                  <v-row
                    align="center"
                    class="fill-height grey darken-3"
                    justify="center"
                    v-if="videoStream == null"
                  >
                    <v-icon color="grey darken-2">mdi-video-off-outline</v-icon>
                  </v-row>
                </v-responsive>
              </v-col>
              <v-col :cols="6">
                <Live2D
                  :height="150"
                  :type="selfLive2DType"
                  :width="300"
                  ref="previewLive2D"
                  show-refresh
                  v-if="videoDialogVisible && selfLive2DType != null" />
              </v-col>
              <v-col :cols="1">
                <v-row dense>
                  <v-col :cols="12">
                    <v-btn @click="changeCharacter" class="float-right" fab small>
                      <v-icon>mdi-account-convert</v-icon>
                    </v-btn>
                  </v-col>
                  <v-col :cols="12">
                    <v-btn @click="changeTexture" class="float-right" fab small>
                      <v-icon>mdi-tshirt-crew-outline</v-icon>
                    </v-btn>
                  </v-col>
                </v-row>
              </v-col>
            </v-row>
          </v-card-text>
          <v-card-actions class="pr-4 pb-4 pl-4">
            <v-spacer></v-spacer>
            <v-btn @click="videoDialogVisible = false" small text>取消</v-btn>
            <v-btn @click="startVideo" color="primary" small text>就是TA了!</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-btn @click="stopRealVideo" color="blue" v-else value="stopVideo">
        <template>停止视频</template>
        <v-icon>mdi-video</v-icon>
      </v-btn>

      <!-- 共享屏幕与停止共享 -->
      <v-btn
        :disabled="screenSharing"
        :loading="screenSharingBusy"
        @click="startScreenSharing"
        v-if="screenSharingStream == null"
        value="screen"
      >
        <template>共享屏幕</template>
        <v-icon>mdi-monitor-screenshot</v-icon>
      </v-btn>
      <v-btn @click="stopScreenSharing" color="green" v-else value="screen">
        <template>停止共享</template>
        <v-icon>mdi-monitor-screenshot</v-icon>
      </v-btn>

      <v-spacer />

      <v-dialog max-width="290" v-model="leaveDialogVisible">
        <template v-slot:activator="{ on }">
          <v-btn v-on="on" value="leave">
            <template>离开课堂</template>
            <v-icon>mdi-exit-run</v-icon>
          </v-btn>
        </template>
        <v-card>
          <v-card-title class="subtitle-1">
            <v-icon class="mr-2">mdi-help-circle-outline</v-icon>
            确定要离开课堂吗？
          </v-card-title>
          <v-card-actions class="pr-4 pb-4 pl-4 pt-2">
            <v-spacer></v-spacer>
            <v-btn @click="leaveDialogVisible = false" small text>取消</v-btn>
            <v-btn @click="reload" color="red" small text>离开课堂</v-btn>
          </v-card-actions>
        </v-card>
      </v-dialog>
      <v-btn active v-show="false" value="null" />
    </v-bottom-navigation>
  </v-app>
</template>

<script lang="ts">
import Vue from 'vue';
import Component from 'vue-class-component';
import { Watch } from 'vue-property-decorator';
import * as faceapi from 'face-api.js';
import Live2D from '@/components/Live2D.vue';
import { getNextCharacter, getNextTexture } from '@/utils/live2dApi';
import room from '@/utils/room';

@Component({
  components: { Live2D },
})
export default class Classroom extends Vue {
  $refs!: {
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    previewLive2D: Live2D | any;
    screenVideo: HTMLVideoElement;
    selfVideo: HTMLVideoElement;
    realSelfVideo: HTMLVideoElement;
    selfVideoOverlay: HTMLCanvasElement;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  } & Record<string, Live2D[] | any>;

  modelLoading = true;

  navValue = 'null';

  audioBusy = false;

  audioStream: MediaStream | null = null;

  videoBusy = false;

  videoStream: MediaStream | null = null;

  realVideoStream: MediaStream | null = null;

  screenSharing = false;

  screenSharingBusy = false;

  screenSharingStream: MediaStream | null = null;

  screenSharingSid: string | null = null;

  videoDialogVisible = false;

  leaveDialogVisible = false;

  selfLive2DType: string | null = null;

  members = new Map<string, string>();

  audios = new Set<string>();

  videos = new Map<string, string>();

  membersListTrigger = 1;

  get membersList() {
    const result: {
      sid: string;
      nickName: string;
      audio: boolean;
      character: string | null;
      color: string | null;
      colorDark: string | null;
    }[] = [];
    this.members.forEach(((value, key) => {
      const character = this.videos.get(key) || null;
      const audio = this.audios.has(key);
      result.push({
        sid: key,
        nickName: value,
        audio,
        character,
        color: this.screenSharingSid === key ? 'green darken-3' : null,
        colorDark: this.screenSharingSid === key ? 'green darken-4' : 'grey darken-3',
      });
    }));
    return this.membersListTrigger && result;
  }

  // eslint-disable-next-line class-methods-use-this
  reload() {
    window.location.reload();
  }

  @Watch('navValue')
  onNavigationValueChanged(value: string) {
    if (value !== 'null') {
      this.$nextTick(() => {
        setTimeout(() => {
          this.navValue = 'null';
        });
      });
    }
  }

  @Watch('videoDialogVisible')
  onVideoDialogVisibleChanged(value: boolean) {
    if (!value) {
      this.stopVideo();
    }
  }

  // noinspection JSUnusedGlobalSymbols
  async mounted() {
    if (room.getRoomId() !== this.$route.params.id) {
      if (/^\d{10}$/.test(this.$route.params.id)) {
        await this.$router.replace(`/join?id=${encodeURIComponent(this.$route.params.id)}`);
      } else {
        await this.$router.replace('/join');
      }
    } else {
      await Promise.all([
        faceapi.loadTinyFaceDetectorModel('./models'),
        faceapi.loadFaceLandmarkTinyModel('./models'),
      ]);
      this.modelLoading = false;
      await this.changeCharacter();
      this.handleMembers();
      room.on('members', this.handleMembers);
      await this.$nextTick();
      this.handleAudioStart();
      room.on('audio_start', this.handleAudioStart);
      this.handleVideos();
      room.on('videos', this.handleVideos);
      this.handleScreenStream();
      room.on('screen_stream', this.handleScreenStream);
      this.handleScreenSharing();
      room.on('screen_sharing', this.handleScreenSharing);
      this.handleScreenSharingSid();
      room.on('screen_sid', this.handleScreenSharingSid);
      room.on('facing', this.handleFacing);
      room.on('end_audio', this.handleAudioEnd);
    }
  }

  // noinspection JSUnusedGlobalSymbols
  beforeDestroy() {
    room.off('members', this.handleMembers);
    room.off('audio_start', this.handleAudioStart);
    room.off('videos', this.handleVideos);
    room.off('screen_stream', this.handleScreenStream);
    room.off('screen_sharing', this.handleScreenSharing);
    room.off('screen_sid', this.handleScreenSharingSid);
    room.off('facing', this.handleFacing);
    room.off('end_audio', this.handleAudioEnd);
    this.stopAudio();
    this.stopVideo();
    this.stopRealVideo();
    this.stopScreenSharing();
  }

  async startAudio() {
    if (!this.audioBusy && this.audioStream == null) {
      this.audioBusy = true;
      try {
        this.audioStream = await navigator.mediaDevices.getUserMedia({
          video: false,
          audio: true,
        });
        room.startAudio(this.audioStream);
        this.audios.add(room.getSid());
        this.membersListTrigger += 1;
      } catch (e) {
        // eslint-disable-next-line
        console.error(`Error: ${e}`);
      }
      this.audioBusy = false;
    }
  }

  stopAudio() {
    if (this.audioStream != null) {
      this.audioStream.getTracks().forEach((track) => track.stop());
      this.audioStream = null;
      room.endAudio();
      this.audios.delete(room.getSid());
      this.membersListTrigger += 1;
    }
  }

  async prepareVideo() {
    if (!this.videoBusy && this.videoStream == null) {
      this.videoBusy = true;
      try {
        this.videoStream = await navigator.mediaDevices.getUserMedia({
          video: {
            noiseSuppression: { ideal: true },
            width: { ideal: 320 },
            height: { ideal: 180 },
          },
          audio: false,
        });
        if (!this.videoDialogVisible) {
          this.stopVideo();
        } else {
          this.videoStream.addEventListener('inactive', this.stopVideo);
          this.$refs.selfVideo.srcObject = this.videoStream;
          this.$refs.selfVideo.addEventListener('playing', () => this.faceDetect(true), {
            once: true,
          });
        }
        room.on('facing_preview', this.handleFacingPreview);
      } catch (e) {
        // eslint-disable-next-line
        console.error(`Error: ${e}`);
      }
      this.videoBusy = false;
    }
  }

  async startVideo() {
    this.realVideoStream = this.videoStream;
    this.videoStream = null;
    this.$refs.selfVideo.srcObject = null;
    this.$refs.realSelfVideo.srcObject = this.realVideoStream;
    room.startVideo(this.selfLive2DType || '1-1');
    this.$refs.realSelfVideo.addEventListener('playing', () => this.faceDetect(), {
      once: true,
    });
    this.videoDialogVisible = false;
  }

  stopVideo() {
    if (this.videoStream != null) {
      this.videoStream.getTracks().forEach((track) => track.stop());
      this.$refs.selfVideo.srcObject = null;
      this.videoStream = null;
      room.off('facing_preview', this.handleFacingPreview);
    }
  }

  stopRealVideo() {
    if (this.realVideoStream != null) {
      this.realVideoStream.getTracks().forEach((track) => track.stop());
      this.$refs.realSelfVideo.srcObject = null;
      this.realVideoStream = null;
      room.endVideo();
    }
  }

  async startScreenSharing() {
    if (!this.screenSharingBusy && this.screenSharingStream == null) {
      this.screenSharingBusy = true;
      try {
        // eslint-disable-next-line @typescript-eslint/ban-ts-ignore
        // @ts-ignore
        this.screenSharingStream = await navigator.mediaDevices.getDisplayMedia({
          video: { cursor: 'always' },
          audio: false,
        }) as MediaStream;
        this.screenSharingStream.addEventListener('inactive', this.stopScreenSharing);
        this.$refs.screenVideo.srcObject = this.screenSharingStream;
        room.startScreenShare(this.screenSharingStream);
        this.screenSharingSid = room.getSid();
      } catch (e) {
        // eslint-disable-next-line no-console
        console.warn(e);
      }
      this.screenSharingBusy = false;
    }
  }

  stopScreenSharing() {
    if (this.screenSharingStream != null) {
      room.stopScreenShare();
      this.screenSharingStream.getTracks().forEach((track) => track.stop());
      this.screenSharingStream = null;
      this.screenSharingSid = null;
    }
  }

  async changeCharacter() {
    this.selfLive2DType = await getNextCharacter(this.selfLive2DType || undefined);
  }

  async changeTexture() {
    this.selfLive2DType = await getNextTexture(this.selfLive2DType || undefined);
  }

  async faceDetect(previewMode = false) {
    const videoElement = previewMode ? this.$refs.selfVideo : this.$refs.realSelfVideo;
    if ((previewMode ? this.videoStream : this.realVideoStream) != null) {
      const result = await faceapi
        .detectSingleFace(videoElement, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks(true);
      if (result != null) {
        if (previewMode) {
          room.facingPreview(
            result.landmarks.positions,
            result.detection.imageWidth,
            result.detection.imageHeight,
          );
        } else {
          room.facing(
            result.landmarks.positions,
            result.detection.imageWidth,
            result.detection.imageHeight,
          );
        }
      } else if (previewMode && this.selfLive2DType != null && this.$refs.previewLive2D) {
        const canvas = this.$refs.selfVideoOverlay;
        const video = this.$refs.selfVideo;
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        this.$refs.previewLive2D.setPoint(0, 0);
      } else if (!previewMode) {
        room.facing(null);
      }
      setTimeout(() => this.faceDetect(previewMode), 100);
    }
  }

  refreshLive2d(sid: string) {
    if (this.$refs[`${sid}-live2d`] instanceof Array) {
      const live2d = this.$refs[`${sid}-live2d`][0];
      live2d.refresh();
    }
  }

  handleFacingPreview(data: {
    pose: { pitch: number; yaw: number };
    poseAlt: { x: number; y: number };
    boxLines: number[][];
  }) {
    if (this.videoStream != null) {
      const canvas = this.$refs.selfVideoOverlay;
      const video = this.$refs.selfVideo;
      canvas.width = video.videoWidth;
      canvas.height = video.videoHeight;
      const ctx = canvas.getContext('2d');
      if (ctx != null) {
        ctx.lineWidth = 2;
        ctx.strokeStyle = 'rgba(255, 255, 0, 0.5)';
        ctx.beginPath();
        ctx.moveTo(data.boxLines[0][0], data.boxLines[0][1]);
        data.boxLines.forEach((point) => {
          ctx.lineTo(point[0], point[1]);
        });
        ctx.lineTo(data.boxLines[5][0], data.boxLines[5][1]);
        ctx.moveTo(data.boxLines[1][0], data.boxLines[1][1]);
        ctx.lineTo(data.boxLines[6][0], data.boxLines[6][1]);
        ctx.moveTo(data.boxLines[2][0], data.boxLines[2][1]);
        ctx.lineTo(data.boxLines[7][0], data.boxLines[7][1]);
        ctx.moveTo(data.boxLines[3][0], data.boxLines[3][1]);
        ctx.lineTo(data.boxLines[8][0], data.boxLines[8][1]);
        ctx.closePath();
        ctx.stroke();
      }
      if (this.selfLive2DType != null && this.$refs.previewLive2D) {
        this.$refs.previewLive2D.setPoint(data.poseAlt.x, data.poseAlt.y);
        // this.$refs.previewLive2D.setPoint(data.pose.pitch * 6, data.pose.yaw * 4);
      }
    }
  }

  handleAudioStart() {
    const buffer = room.getAudioBuffer();
    buffer.forEach((stream, sid) => {
      const audio: HTMLAudioElement[] | null | undefined = this.$refs[`${sid}-audio`];
      if (audio != null) {
        audio[0].srcObject = stream;
        this.audios.add(sid);
        this.membersListTrigger += 1;
      }
    });
    buffer.clear();
  }

  handleAudioEnd(data: { sid: string }) {
    this.audios.delete(data.sid);
    this.membersListTrigger += 1;
  }

  handleFacing(data: {
    pose: { pitch: number; yaw: number };
    poseAlt: { x: number; y: number };
    sid: string;
    active: boolean;
  }) {
    if (this.realVideoStream != null && this.$refs[`${data.sid}-live2d`] instanceof Array) {
      const live2d = this.$refs[`${data.sid}-live2d`][0];
      live2d.setPoint(data.poseAlt.x, data.poseAlt.y);
      live2d.setActive(data.active);
    }
  }

  handleMembers() {
    this.members = room.getMembers();
    this.membersListTrigger += 1;
  }

  handleVideos() {
    this.videos = room.getVideos();
    this.membersListTrigger += 1;
  }

  handleScreenStream() {
    this.$refs.screenVideo.srcObject = room.getScreenStream();
  }

  handleScreenSharing() {
    this.screenSharing = room.isScreenSharing();
    if (!this.screenSharing) {
      this.screenSharingSid = null;
    }
  }

  handleScreenSharingSid() {
    this.screenSharingSid = room.getScreenSid();
  }
}
</script>

<style lang="scss">
  .screen-video {
    position: absolute;
    top: 0;
    right: 0;
    bottom: 0;
    left: 0;
    width: 100%;
    height: 100%;
  }

  .members-list {
    position: absolute;
    z-index: 2;
    right: 0;
    bottom: 0;
    left: 0;
    display: flex;
    overflow: visible;
    align-items: flex-end;
    flex-direction: row;
    justify-content: flex-start;
    height: 48px;
    white-space: nowrap;
  }

  .member {
    position: relative;
  }

  .member-live2d {
    z-index: 1;
    top: 48px;
    pointer-events: none;
  }

  .member-chip {
    z-index: 2;
    max-width: 150px;
    margin: 8px;
    opacity: 0.95;
  }

  .member-chip__nick-name {
    overflow: hidden;
    max-width: 100px;
    white-space: nowrap;
    text-overflow: ellipsis;
  }

  .self-video {
    display: block;
    width: 100%;
    transform: scaleX(-1);
  }

  .self-video-overlap {
    position: absolute;
    z-index: 999;
  }

  .real-self-video {
    position: absolute;
    top: 0;
    left: 0;
    visibility: hidden;
    width: 320px;
    height: 180px;
    pointer-events: none;
    opacity: 0;
  }

  .v-dialog {
    overflow-y: visible !important;
  }
</style>
