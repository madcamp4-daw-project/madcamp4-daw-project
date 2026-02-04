/**
 * 트랜지션 엔진
 * 두 덱 간의 크로스페이드, FX 적용, 비트 동기화 처리
 */

import * as Tone from "tone";

/**
 * 트랜지션 타입
 */
export type TransitionType =
  | "blend"      // 부드러운 크로스페이드
  | "drop"       // 드롭 (갑작스러운 전환)
  | "spinBack"   // 스핀백 효과
  | "echo"       // 에코 페이드
  | "filter";    // 필터 스위프

/**
 * 트랜지션 설정
 */
export interface TransitionSettings {
  type: TransitionType;
  duration: number;           // 초
  beatAlign: boolean;         // 비트 정렬
  eqSwap: boolean;            // EQ 스왑 (Low/High 교환)
  filterSweep: boolean;       // 필터 스위프 적용
}

/**
 * 크로스페이더 커브 타입
 */
export type CrossfaderCurve = "linear" | "equalPower" | "scratch";

/**
 * 트랜지션 엔진 클래스
 */
export class TransitionEngine {
  private crossfader: Tone.CrossFade;
  private filterA: Tone.Filter;
  private filterB: Tone.Filter;
  private delayA: Tone.FeedbackDelay;
  private delayB: Tone.FeedbackDelay;
  private reverbA: Tone.Reverb;
  private reverbB: Tone.Reverb;
  private eqA: Tone.EQ3;
  private eqB: Tone.EQ3;
  private channelA: Tone.Channel;
  private channelB: Tone.Channel;
  private master: Tone.Channel;

  private isInitialized: boolean = false;
  private currentCrossfade: number = 0.5; // 0 = A, 1 = B
  private curve: CrossfaderCurve = "equalPower";

  constructor() {
    // 크로스페이더
    this.crossfader = new Tone.CrossFade(0.5);

    // EQ (3밴드)
    this.eqA = new Tone.EQ3();
    this.eqB = new Tone.EQ3();

    // 필터
    this.filterA = new Tone.Filter(20000, "lowpass");
    this.filterB = new Tone.Filter(20000, "lowpass");

    // 딜레이
    this.delayA = new Tone.FeedbackDelay("8n", 0.3);
    this.delayB = new Tone.FeedbackDelay("8n", 0.3);

    // 리버브
    this.reverbA = new Tone.Reverb({ decay: 1.5, wet: 0 });
    this.reverbB = new Tone.Reverb({ decay: 1.5, wet: 0 });

    // 채널
    this.channelA = new Tone.Channel();
    this.channelB = new Tone.Channel();
    this.master = new Tone.Channel().toDestination();

    // 신호 체인 연결
    this.connectSignalChain();
  }

  /**
   * 신호 체인 연결
   */
  private connectSignalChain(): void {
    // Deck A 체인: EQ -> Filter -> Delay -> Reverb -> Channel -> Crossfader A
    this.eqA
      .chain(this.filterA, this.delayA, this.reverbA, this.channelA);
    this.channelA.connect(this.crossfader.a);

    // Deck B 체인: EQ -> Filter -> Delay -> Reverb -> Channel -> Crossfader B
    this.eqB
      .chain(this.filterB, this.delayB, this.reverbB, this.channelB);
    this.channelB.connect(this.crossfader.b);

    // Crossfader -> Master
    this.crossfader.connect(this.master);

    this.isInitialized = true;
  }

  /**
   * 입력 노드 가져오기
   */
  getInputA(): Tone.ToneAudioNode {
    return this.eqA;
  }

  getInputB(): Tone.ToneAudioNode {
    return this.eqB;
  }

  /**
   * 크로스페이더 설정 (0 = A, 1 = B)
   */
  setCrossfade(value: number): void {
    const clamped = Math.max(0, Math.min(1, value));
    this.currentCrossfade = clamped;

    // 커브에 따른 변환
    let fadeValue = clamped;
    if (this.curve === "equalPower") {
      // Equal Power 커브 (더 부드러운 전환)
      fadeValue = Math.sin(clamped * Math.PI / 2);
    } else if (this.curve === "scratch") {
      // 스크래치 커브 (빠른 전환)
      fadeValue = clamped < 0.5 ? 0 : 1;
    }

    this.crossfader.fade.value = fadeValue;
  }

  /**
   * 크로스페이더 값 가져오기
   */
  getCrossfade(): number {
    return this.currentCrossfade;
  }

  /**
   * 크로스페이더 커브 설정
   */
  setCrossfaderCurve(curve: CrossfaderCurve): void {
    this.curve = curve;
    this.setCrossfade(this.currentCrossfade); // 현재 값에 새 커브 적용
  }

  /**
   * EQ 설정
   */
  setEQ(
    deck: "A" | "B",
    low: number,
    mid: number,
    high: number
  ): void {
    const eq = deck === "A" ? this.eqA : this.eqB;
    eq.low.value = low;
    eq.mid.value = mid;
    eq.high.value = high;
  }

  /**
   * EQ Kill (특정 밴드 -∞dB)
   */
  killEQ(deck: "A" | "B", band: "low" | "mid" | "high"): void {
    const eq = deck === "A" ? this.eqA : this.eqB;
    eq[band].value = -Infinity;
  }

  /**
   * EQ Restore
   */
  restoreEQ(deck: "A" | "B", band: "low" | "mid" | "high"): void {
    const eq = deck === "A" ? this.eqA : this.eqB;
    eq[band].value = 0;
  }

  /**
   * 필터 스위프
   */
  setFilter(
    deck: "A" | "B",
    frequency: number,
    type: "lowpass" | "highpass" = "lowpass"
  ): void {
    const filter = deck === "A" ? this.filterA : this.filterB;
    filter.type = type;
    filter.frequency.rampTo(frequency, 0.1);
  }

  /**
   * 딜레이 설정
   */
  setDelay(deck: "A" | "B", wet: number, feedback: number): void {
    const delay = deck === "A" ? this.delayA : this.delayB;
    delay.wet.value = wet;
    delay.feedback.value = feedback;
  }

  /**
   * 리버브 설정
   */
  setReverb(deck: "A" | "B", wet: number): void {
    const reverb = deck === "A" ? this.reverbA : this.reverbB;
    reverb.wet.value = wet;
  }

  /**
   * 볼륨 설정
   */
  setVolume(deck: "A" | "B", db: number): void {
    const channel = deck === "A" ? this.channelA : this.channelB;
    channel.volume.value = db;
  }

  /**
   * 마스터 볼륨
   */
  setMasterVolume(db: number): void {
    this.master.volume.value = db;
  }

  /**
   * 자동 트랜지션 실행
   */
  async executeTransition(
    settings: TransitionSettings,
    onProgress?: (progress: number) => void
  ): Promise<void> {
    const { type, duration, beatAlign, eqSwap, filterSweep } = settings;

    const startTime = Tone.now();
    const endTime = startTime + duration;

    // 트랜지션 애니메이션 루프
    const animate = () => {
      const now = Tone.now();
      const progress = Math.min(1, (now - startTime) / duration);

      onProgress?.(progress);

      if (progress >= 1) {
        return;
      }

      // 타입별 처리
      switch (type) {
        case "blend":
          this.setCrossfade(progress);
          break;

        case "drop":
          // 80%까지 A, 이후 즉시 B로 전환
          this.setCrossfade(progress < 0.8 ? 0 : 1);
          break;

        case "echo":
          this.setCrossfade(progress);
          // 페이드 아웃되는 덱에 딜레이 추가
          this.setDelay("A", progress * 0.8, 0.5);
          break;

        case "filter":
          this.setCrossfade(progress);
          // A는 로우패스 스위프 다운, B는 하이패스 스위프 업
          this.setFilter("A", 20000 - progress * 19800, "lowpass");
          this.setFilter("B", 20 + progress * 19980, "highpass");
          break;

        case "spinBack":
          // TODO: 스핀백 효과 구현 (피치벤드 + 볼륨)
          this.setCrossfade(progress);
          break;
      }

      // EQ 스왑 효과
      if (eqSwap && progress > 0.3 && progress < 0.7) {
        // 중간 구간에서 Low/High 교환
        this.killEQ("A", "low");
        this.restoreEQ("B", "low");
        this.killEQ("B", "high");
        this.restoreEQ("A", "high");
      }

      requestAnimationFrame(animate);
    };

    requestAnimationFrame(animate);

    // 트랜지션 완료까지 대기
    return new Promise((resolve) => {
      setTimeout(resolve, duration * 1000);
    });
  }

  /**
   * 상태 초기화
   */
  reset(): void {
    this.setCrossfade(0.5);
    this.setEQ("A", 0, 0, 0);
    this.setEQ("B", 0, 0, 0);
    this.setFilter("A", 20000);
    this.setFilter("B", 20000);
    this.setDelay("A", 0, 0);
    this.setDelay("B", 0, 0);
    this.setReverb("A", 0);
    this.setReverb("B", 0);
  }

  /**
   * 리소스 해제
   */
  dispose(): void {
    this.crossfader.dispose();
    this.eqA.dispose();
    this.eqB.dispose();
    this.filterA.dispose();
    this.filterB.dispose();
    this.delayA.dispose();
    this.delayB.dispose();
    this.reverbA.dispose();
    this.reverbB.dispose();
    this.channelA.dispose();
    this.channelB.dispose();
    this.master.dispose();
  }
}

export default TransitionEngine;
