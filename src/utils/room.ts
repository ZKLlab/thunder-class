import io from 'socket.io-client';
import EventEmitter from 'eventemitter3';
import { Point } from 'face-api.js';

const iceServer = { iceServers: [{ urls: 'stun:stun.l.google.com:19302' }] };
const socketIORoot = 'wss://service.thunder.zkllab.com';
const socket = io(socketIORoot);
const ee = new EventEmitter();

const members = new Map<string, string>();
const videos = new Map<string, string>();
const peers = new Map<string, RTCPeerConnection>();
const audioBuffer = new Map<string, MediaStream>();
let audioStream: MediaStream | null = null;
let screenStream: MediaStream | null = null;
let otherScreenStream: MediaStream | null = null;
let currentRoomId: string | null = null;
let screenSharing = false;
let screenSharingSid: string | null = null;
let connected = false;

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function log(event: string, message: any = '') {
  if (process.env.node_env !== 'production') {
    // eslint-disable-next-line no-console
    console.info(event, message);
  }
}

function peerConnect(sid: string): RTCPeerConnection {
  const peer = new RTCPeerConnection(iceServer);
  peer.ontrack = (event) => {
    log('ontrack', event);
    if (event.track.kind === 'video') {
      screenSharingSid = sid;
      otherScreenStream = new MediaStream([event.track]);
      ee.emit('screen_stream');
      ee.emit('screen_sid');
    } else if (event.track.kind === 'audio') {
      const stream = new MediaStream([event.track]);
      audioBuffer.set(sid, stream);
      ee.emit('audio_start');
    }
  };
  peer.onicecandidate = (event) => {
    log('onicecandidate', event);
    if (event.candidate) {
      socket.emit('ice_candidate', {
        candidate: event.candidate,
        to: sid,
      });
    }
  };
  peer.onnegotiationneeded = () => {
    log('onnegotiationneeded');
    peer.createOffer().then((desc) => {
      peer.setLocalDescription(desc).then(() => {
        socket.emit('offer', {
          sdp: peer.localDescription,
          to: sid,
        });
      });
    });
  };
  peers.set(sid, peer);
  return peer;
}

function getPoints(landmarks: Point[]) {
  return [
    [landmarks[30].x, landmarks[30].y], // 鼻尖
    [landmarks[8].x, landmarks[8].y], // 下巴
    [landmarks[36].x, landmarks[36].y], // 左眼左眼角
    [landmarks[45].x, landmarks[45].y], // 右眼右眼角
    [landmarks[48].x, landmarks[48].y], // 左嘴角
    [landmarks[54].x, landmarks[54].y], // 右嘴角
  ];
}

socket.on('connect', () => {
  log('connect');
  connected = true;
  ee.emit('connect');
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('ice_candidate', (data: Record<string, any>) => {
  log('ice_candidate', data);
  const peer = peers.get(data.sid);
  if (data.candidate && peer != null) {
    // eslint-disable-next-line no-console
    peer.addIceCandidate(data.candidate).catch((e) => console.error(e));
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('offer', (data: Record<string, any>) => {
  log('offer', data);
  const peer = peers.get(data.sid);
  if (peer != null) {
    peer.setRemoteDescription(data.sdp).then(() => {
      peer.createAnswer().then((desc) => {
        peer.setLocalDescription(desc).then(() => {
          socket.emit('answer', {
            sdp: peer.localDescription,
            to: data.sid,
          });
        });
      });
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('answer', (data: Record<string, any>) => {
  log('answer', data);
  const peer = peers.get(data.sid);
  if (peer != null) {
    // eslint-disable-next-line no-console
    peer.setRemoteDescription(data.sdp).then(() => console.log(`ice candidate added: ${data.sid}`));
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('join', (data: Record<string, any>) => {
  log('join', data);
  currentRoomId = data.roomId;
  screenSharing = data.screen != null;
  ee.emit('screen_sharing');
  members.clear();
  Object.keys(data.members).forEach((key) => {
    members.set(key, data.members[key]);
    if (!peers.has(key) && key !== socket.id) {
      const peer = peerConnect(key);
      if (audioStream != null) {
        audioStream.getTracks().forEach((track) => {
          peer.addTrack(track);
        });
      }
      if (screenStream != null) {
        screenStream.getTracks().forEach((track) => {
          peer.addTrack(track);
        });
      }
    }
  });
  ee.emit('join', data);
  ee.emit('members');
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('facing_preview', (data: Record<string, any>) => {
  log('facing_preview', data);
  ee.emit('facing_preview', data);
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('facing', (data: Record<string, any>) => {
  log('facing', data);
  ee.emit('facing', data);
});

socket.on('end_audio', (data: { sid: string }) => {
  log('end_audio', data);
  ee.emit('end_audio', data);
});

socket.on('video', (data: Record<string, string>) => {
  log('video', data);
  videos.clear();
  Object.keys(data).forEach((key: string) => {
    videos.set(key, data[key]);
  });
  ee.emit('videos');
});

socket.on('screen', (data: { sid: string | null }) => {
  log('screen', data);
  screenSharing = data.sid != null;
  ee.emit('screen_sharing');
  if (data.sid != null && data.sid === socket.id) {
    peers.forEach((peer) => {
      if (screenStream != null) {
        screenStream.getTracks().forEach((track) => {
          peer.addTrack(track);
        });
      }
    });
  }
});

// eslint-disable-next-line @typescript-eslint/no-explicit-any
socket.on('leave', (data: Record<string, any>) => {
  log('leave', data);
  members.clear();
  Object.keys(data.members).forEach((key: string) => {
    members.set(key, data.members[key]);
  });
  peers.forEach(((peer, sid) => {
    if (!(sid in data.members)) {
      peer.close();
      peers.delete(sid);
    }
  }));
  ee.emit('leave', data);
  ee.emit('members');
});

socket.on('disconnect', () => {
  log('disconnect');
  connected = false;
  ee.emit('disconnect');
});

export default {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  on: (event: string, listener: (...args: any) => void) => ee.on(event, listener),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  off: (event: string, listener: (...args: any) => void) => ee.off(event, listener),
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  once: (event: string, listener: (...args: any) => void) => ee.once(event, listener),
  isConnected: () => connected,
  isScreenSharing: () => screenSharing,
  getSid: () => socket.id,
  getAudioBuffer: () => audioBuffer,
  getRoomId: () => currentRoomId,
  getMembers: () => members,
  getVideos: () => videos,
  getScreenStream: () => otherScreenStream,
  getScreenSid: () => screenSharingSid,
  join: (nickName: string, roomId: string | undefined = undefined) => {
    if (connected) {
      const data: { nickName: string; roomId?: string } = { nickName };
      if (roomId != null) {
        data.roomId = roomId;
      }
      socket.emit('join', data);
    }
  },
  facingPreview: (landmarks: Point[], width: number, height: number) => {
    if (connected) {
      const distance = (a: Point, b: Point) => ((a.x - b.x) ** 2 + (a.y - b.y) ** 2) ** 0.5;
      const data = {
        points: getPoints(landmarks),
        width,
        height,
        faceSize: distance(landmarks[2], landmarks[14]),
      };
      socket.emit('facing_preview', data);
    }
  },
  facing: (landmarks: Point[] | null, width?: number, height?: number) => {
    if (connected) {
      const data = landmarks != null ? {
        points: getPoints(landmarks),
        width,
        height,
      } : {};
      socket.emit('facing', data);
    }
  },
  startAudio: (stream: MediaStream) => {
    audioStream = stream;
    peers.forEach((peer) => {
      stream.getTracks().forEach((track) => {
        peer.addTrack(track);
      });
    });
  },
  endAudio: () => {
    audioStream = null;
    socket.emit('end_audio');
  },
  startVideo: (character: string) => {
    const data = {
      character,
    };
    socket.emit('start_video', data);
  },
  endVideo: () => {
    socket.emit('end_video');
  },
  startScreenShare: (stream: MediaStream) => {
    screenStream = stream;
    socket.emit('start_screen_sharing');
  },
  stopScreenShare: () => {
    screenStream = null;
    socket.emit('stop_screen_sharing');
  },
};
