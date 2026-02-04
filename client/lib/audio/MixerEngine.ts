"use client";

/**
 * MixerEngine - DAW 믹서 오디오 엔진
 * Tone.js를 사용하여 실제 오디오 라우팅 및 믹싱 처리
 */

import * as Tone from "tone";

/**
 * 믹서 트랙 인터페이스
 */
export interface MixerTrack {
  id: string;                     // 트랙 ID
  name: string;                   // 트랙 이름
  player?: Tone.Player;           // 오디오 플레이어
  channel: Tone.Channel;          // 채널 (볼륨, 팬, 뮤트 제어)
  meter: Tone.Meter;              // 레벨 미터
  panner: Tone.Panner;            // 팬 조절
  sends: {                        // Send FX 레벨
    reverb: Tone.Gain;
    delay: Tone.Gain;
  };
  isMuted: boolean;
  isSolo: boolean;
  volume: number;                 // dB
  pan: number;                    // -1 ~ 1
}

/**
 * MixerEngine 클래스
 * 트랙 관리, 볼륨/팬 제어, 미터링, Send FX 라우팅 처리
 */
export class MixerEngine {
  private tracks: Map<string, MixerTrack>;
  private masterBus: Tone.Channel;
  private masterMeter: Tone.Meter;
  private sends: {
    reverb: Tone.Reverb;
    delay: Tone.FeedbackDelay;
    reverbGain: Tone.Gain;
    delayGain: Tone.Gain;
  };
  private isInitialized: boolean = false;

  constructor() {
    this.tracks = new Map();

    // 마스터 버스 설정
    this.masterBus = new Tone.Channel({ volume: 0 }).toDestination();
    this.masterMeter = new Tone.Meter();
    this.masterBus.connect(this.masterMeter);

    // Send 이펙트 설정
    this.sends = {
      reverb: new Tone.Reverb({ decay: 2.5, wet: 1 }),
      delay: new Tone.FeedbackDelay({ delayTime: "8n", feedback: 0.3, wet: 1 }),
      reverbGain: new Tone.Gain(0),
      delayGain: new Tone.Gain(0),
    };

    // Send FX 라우팅
    this.sends.reverbGain.connect(this.sends.reverb);
    this.sends.delayGain.connect(this.sends.delay);
    this.sends.reverb.connect(this.masterBus);
    this.sends.delay.connect(this.masterBus);
  }

  /**
   * 오디오 컨텍스트 시작 (사용자 인터랙션 후 호출 필요)
   */
  async start(): Promise<void> {
    if (this.isInitialized) return;
    await Tone.start();
    this.isInitialized = true;
    console.log("MixerEngine started");
  }

  /**
   * 새 트랙 추가
   * @param file - 오디오 파일
   * @returns 트랙 ID
   */
  async addTrack(file: File): Promise<string> {
    await this.start();

    const id = `track-${Date.now()}`;
    const url = URL.createObjectURL(file);

    // 플레이어 생성
    const player = new Tone.Player({
      url,
      loop: false,
      onload: () => console.log(`Track ${id} loaded`),
    });

    // 채널 체인 설정
    const panner = new Tone.Panner(0);
    const channel = new Tone.Channel({ volume: 0, mute: false });
    const meter = new Tone.Meter();

    // 라우팅: Player → Panner → Channel → Meter → Master
    player.connect(panner);
    panner.connect(channel);
    channel.connect(meter);
    channel.connect(this.masterBus);

    // Send FX 연결
    const sendReverb = new Tone.Gain(0);
    const sendDelay = new Tone.Gain(0);
    channel.connect(sendReverb);
    channel.connect(sendDelay);
    sendReverb.connect(this.sends.reverbGain);
    sendDelay.connect(this.sends.delayGain);

    const track: MixerTrack = {
      id,
      name: file.name.replace(/\.[^.]+$/, ""),
      player,
      channel,
      meter,
      panner,
      sends: { reverb: sendReverb, delay: sendDelay },
      isMuted: false,
      isSolo: false,
      volume: 0,
      pan: 0,
    };

    this.tracks.set(id, track);
    return id;
  }

  /**
   * 트랙 제거
   */
  removeTrack(id: string): void {
    const track = this.tracks.get(id);
    if (!track) return;

    // 리소스 정리
    track.player?.dispose();
    track.channel.dispose();
    track.meter.dispose();
    track.panner.dispose();
    track.sends.reverb.dispose();
    track.sends.delay.dispose();

    this.tracks.delete(id);
  }

  /**
   * 볼륨 설정 (dB)
   */
  setVolume(id: string, dB: number): void {
    const track = this.tracks.get(id);
    if (track) {
      track.volume = dB;
      track.channel.volume.value = dB;
    }
  }

  /**
   * 팬 설정 (-1 ~ 1)
   */
  setPan(id: string, value: number): void {
    const track = this.tracks.get(id);
    if (track) {
      track.pan = value;
      track.panner.pan.value = value;
    }
  }

  /**
   * 뮤트 설정
   */
  setMute(id: string, muted: boolean): void {
    const track = this.tracks.get(id);
    if (track) {
      track.isMuted = muted;
      track.channel.mute = muted;
    }
  }

  /**
   * 솔로 설정 - 다른 트랙 뮤트 처리
   */
  setSolo(id: string, solo: boolean): void {
    const track = this.tracks.get(id);
    if (!track) return;

    track.isSolo = solo;

    // 솔로 트랙이 있는지 확인
    const hasSoloTracks = Array.from(this.tracks.values()).some((t) => t.isSolo);

    // 솔로 로직: 솔로 트랙이 있으면 솔로가 아닌 트랙은 뮤트
    this.tracks.forEach((t) => {
      if (hasSoloTracks) {
        t.channel.mute = !t.isSolo && !t.isMuted;
      } else {
        t.channel.mute = t.isMuted;
      }
    });
  }

  /**
   * 미터 레벨 가져오기
   */
  getMeterLevel(id: string): { left: number; right: number } {
    const track = this.tracks.get(id);
    if (!track) return { left: -Infinity, right: -Infinity };

    const value = track.meter.getValue();
    if (typeof value === "number") {
      return { left: value, right: value };
    }
    return { left: value[0] || -Infinity, right: value[1] || -Infinity };
  }

  /**
   * 마스터 레벨 가져오기
   */
  getMasterLevel(): { left: number; right: number } {
    const value = this.masterMeter.getValue();
    if (typeof value === "number") {
      return { left: value, right: value };
    }
    return { left: value[0] || -Infinity, right: value[1] || -Infinity };
  }

  /**
   * Send FX 레벨 설정
   */
  setSendLevel(
    id: string,
    send: "reverb" | "delay",
    level: number
  ): void {
    const track = this.tracks.get(id);
    if (track) {
      track.sends[send].gain.value = level;
    }
  }

  /**
   * 트랙 재생
   */
  playTrack(id: string, startTime?: number): void {
    const track = this.tracks.get(id);
    if (track?.player?.loaded) {
      track.player.start(startTime);
    }
  }

  /**
   * 트랙 정지
   */
  stopTrack(id: string): void {
    const track = this.tracks.get(id);
    if (track?.player) {
      track.player.stop();
    }
  }

  /**
   * 모든 트랙 재생
   */
  playAll(startTime?: number): void {
    this.tracks.forEach((track) => {
      if (track.player?.loaded) {
        track.player.start(startTime);
      }
    });
  }

  /**
   * 모든 트랙 정지
   */
  stopAll(): void {
    this.tracks.forEach((track) => {
      track.player?.stop();
    });
  }

  /**
   * 마스터 볼륨 설정
   */
  setMasterVolume(dB: number): void {
    this.masterBus.volume.value = dB;
  }

  /**
   * 모든 트랙 정보 가져오기
   */
  getTracks(): MixerTrack[] {
    return Array.from(this.tracks.values());
  }

  /**
   * 정리
   */
  dispose(): void {
    this.stopAll();
    this.tracks.forEach((track) => {
      track.player?.dispose();
      track.channel.dispose();
      track.meter.dispose();
      track.panner.dispose();
    });
    this.tracks.clear();
    this.masterBus.dispose();
    this.masterMeter.dispose();
    this.sends.reverb.dispose();
    this.sends.delay.dispose();
    this.sends.reverbGain.dispose();
    this.sends.delayGain.dispose();
  }
}

// 싱글톤 인스턴스
let mixerEngineInstance: MixerEngine | null = null;

/**
 * MixerEngine 싱글톤 가져오기
 */
export function getMixerEngine(): MixerEngine {
  if (!mixerEngineInstance) {
    mixerEngineInstance = new MixerEngine();
  }
  return mixerEngineInstance;
}
