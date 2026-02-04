"use client";

/**
 * ProChannelEngine - 프로듀서 채널 스트립 DSP 엔진
 * EQ, Compressor, Saturation, Tube 모듈 제공
 */

import * as Tone from "tone";

/**
 * EQ 밴드 설정
 */
export interface EQSettings {
  low: number;   // -24 ~ 24 dB
  mid: number;   // -24 ~ 24 dB
  high: number;  // -24 ~ 24 dB
}

/**
 * 컴프레서 설정
 */
export interface CompressorSettings {
  threshold: number;  // dB
  ratio: number;      // 1:1 ~ 20:1
  attack: number;     // ms
  release: number;    // ms
  knee: number;       // dB
}

/**
 * 새츄레이션 타입
 */
export type SaturationType = "tape" | "console";

/**
 * ProChannelEngine 클래스
 * 채널 스트립 DSP 처리 - EQ → Compressor → Saturation → Tube
 */
export class ProChannelEngine {
  // EQ 모듈
  private eq: Tone.EQ3;
  private eqBypassed: boolean = false;

  // 컴프레서 모듈
  private compressor: Tone.Compressor;
  private compressorBypassed: boolean = false;

  // 새츄레이션 모듈 (WaveShaper 기반)
  private saturation: Tone.WaveShaper;
  private saturationGain: Tone.Gain;
  private saturationDrive: number = 0;
  private saturationType: SaturationType = "tape";
  private saturationBypassed: boolean = false;

  // 튜브 모듈
  private tube: Tone.WaveShaper;
  private tubeGain: Tone.Gain;
  private tubeDrive: number = 0;
  private tubeBypassed: boolean = false;

  // 입출력
  private input: Tone.Gain;
  private output: Tone.Gain;

  constructor() {
    // 입력 노드
    this.input = new Tone.Gain(1);

    // EQ (3밴드)
    this.eq = new Tone.EQ3({
      low: 0,
      mid: 0,
      high: 0,
      lowFrequency: 200,
      highFrequency: 2000,
    });

    // 컴프레서
    this.compressor = new Tone.Compressor({
      threshold: -24,
      ratio: 4,
      attack: 0.01,
      release: 0.1,
      knee: 6,
    });

    // 새츄레이션 (Tape 스타일 소프트 클리핑)
    this.saturationGain = new Tone.Gain(1);
    this.saturation = new Tone.WaveShaper(
      this.generateTapeSaturationCurve(),
      2048
    );

    // 튜브 (진공관 시뮬레이션)
    this.tubeGain = new Tone.Gain(1);
    this.tube = new Tone.WaveShaper(this.generateTubeCurve(), 2048);

    // 출력 노드
    this.output = new Tone.Gain(1);

    // 기본 시그널 체인 연결
    this.connectChain();
  }

  /**
   * 시그널 체인 연결
   * Input → EQ → Compressor → Saturation → Tube → Output
   */
  private connectChain(): void {
    this.input.disconnect();
    this.eq.disconnect();
    this.compressor.disconnect();
    this.saturationGain.disconnect();
    this.saturation.disconnect();
    this.tubeGain.disconnect();
    this.tube.disconnect();

    let currentNode: Tone.ToneAudioNode = this.input;

    // EQ
    if (!this.eqBypassed) {
      currentNode.connect(this.eq);
      currentNode = this.eq;
    }

    // Compressor
    if (!this.compressorBypassed) {
      currentNode.connect(this.compressor);
      currentNode = this.compressor;
    }

    // Saturation
    if (!this.saturationBypassed) {
      currentNode.connect(this.saturationGain);
      this.saturationGain.connect(this.saturation);
      currentNode = this.saturation;
    }

    // Tube
    if (!this.tubeBypassed) {
      currentNode.connect(this.tubeGain);
      this.tubeGain.connect(this.tube);
      currentNode = this.tube;
    }

    // Output
    currentNode.connect(this.output);
  }

  /**
   * Tape 새츄레이션 커브 생성 (소프트 클리핑)
   */
  private generateTapeSaturationCurve(): Float32Array {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const drive = Math.max(1, this.saturationDrive * 10 + 1);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // 소프트 클리핑 (하이퍼볼릭 탄젠트)
      curve[i] = Math.tanh(x * drive);
    }

    return curve;
  }

  /**
   * Console 새츄레이션 커브 생성 (하드 클리핑)
   */
  private generateConsoleSaturationCurve(): Float32Array {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const drive = Math.max(1, this.saturationDrive * 5 + 1);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      const input = x * drive;
      // 하드 클리핑
      curve[i] = Math.max(-1, Math.min(1, input));
    }

    return curve;
  }

  /**
   * 튜브 커브 생성 (진공관 특성 시뮬레이션)
   */
  private generateTubeCurve(): Float32Array {
    const samples = 2048;
    const curve = new Float32Array(samples);
    const drive = Math.max(1, this.tubeDrive * 8 + 1);

    for (let i = 0; i < samples; i++) {
      const x = (i * 2) / samples - 1;
      // 비대칭 클리핑 (진공관 특성)
      if (x >= 0) {
        curve[i] = Math.tanh(x * drive);
      } else {
        curve[i] = Math.tanh(x * drive * 0.8); // 음수 측 덜 포화
      }
    }

    return curve;
  }

  /**
   * EQ 설정
   */
  setEQ(settings: Partial<EQSettings>): void {
    if (settings.low !== undefined) this.eq.low.value = settings.low;
    if (settings.mid !== undefined) this.eq.mid.value = settings.mid;
    if (settings.high !== undefined) this.eq.high.value = settings.high;
  }

  /**
   * EQ 밴드 개별 설정
   */
  setEQBand(band: "low" | "mid" | "high", gain: number): void {
    this.eq[band].value = gain;
  }

  /**
   * 컴프레서 설정
   */
  setCompressor(settings: Partial<CompressorSettings>): void {
    if (settings.threshold !== undefined) {
      this.compressor.threshold.value = settings.threshold;
    }
    if (settings.ratio !== undefined) {
      this.compressor.ratio.value = settings.ratio;
    }
    if (settings.attack !== undefined) {
      this.compressor.attack.value = settings.attack / 1000; // ms → s
    }
    if (settings.release !== undefined) {
      this.compressor.release.value = settings.release / 1000; // ms → s
    }
    if (settings.knee !== undefined) {
      this.compressor.knee.value = settings.knee;
    }
  }

  /**
   * 새츄레이션 설정
   */
  setSaturation(drive: number, type?: SaturationType): void {
    this.saturationDrive = drive;
    if (type) this.saturationType = type;

    this.saturationGain.gain.value = 1 + drive * 0.5;

    const curve =
      this.saturationType === "tape"
        ? this.generateTapeSaturationCurve()
        : this.generateConsoleSaturationCurve();
    this.saturation.curve = curve;
  }

  /**
   * 튜브 설정
   */
  setTube(drive: number): void {
    this.tubeDrive = drive;
    this.tubeGain.gain.value = 1 + drive * 0.3;
    this.tube.curve = this.generateTubeCurve();
  }

  /**
   * 모듈 바이패스 설정
   */
  bypass(module: "eq" | "compressor" | "saturation" | "tube", bypassed: boolean): void {
    switch (module) {
      case "eq":
        this.eqBypassed = bypassed;
        break;
      case "compressor":
        this.compressorBypassed = bypassed;
        break;
      case "saturation":
        this.saturationBypassed = bypassed;
        break;
      case "tube":
        this.tubeBypassed = bypassed;
        break;
    }
    this.connectChain();
  }

  /**
   * 입력 연결
   */
  connect(source: Tone.ToneAudioNode): void {
    source.connect(this.input);
  }

  /**
   * 출력 가져오기
   */
  getOutput(): Tone.Gain {
    return this.output;
  }

  /**
   * 목적지에 연결
   */
  toDestination(): void {
    this.output.toDestination();
  }

  /**
   * 다른 노드에 연결
   */
  connectTo(destination: Tone.ToneAudioNode): void {
    this.output.connect(destination);
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    this.input.dispose();
    this.eq.dispose();
    this.compressor.dispose();
    this.saturationGain.dispose();
    this.saturation.dispose();
    this.tubeGain.dispose();
    this.tube.dispose();
    this.output.dispose();
  }
}

// 싱글톤 인스턴스
let proChannelInstance: ProChannelEngine | null = null;

/**
 * ProChannelEngine 싱글톤 가져오기
 */
export function getProChannelEngine(): ProChannelEngine {
  if (!proChannelInstance) {
    proChannelInstance = new ProChannelEngine();
  }
  return proChannelInstance;
}
