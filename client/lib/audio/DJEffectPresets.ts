/**
 * DJ용 고급 이펙트 프리셋
 * Tone.js 및 Tuna.js 기반 DJ 이펙트 체인
 * 
 * 주석에 이펙트 이름 표시 (EffectData.id로 식별)
 */

import type { EffectData } from '@/lib/types/music';

// ===== DJ 이펙트 프리셋 =====

/**
 * Echo 이펙트 (Delay)
 * BPM 동기화 가능
 */
export const EchoPreset: EffectData = {
  id: 'echo-1',
  type: 'Tone.FeedbackDelay',
  isBypassed: false,
  options: {
    delayTime: 0.25,      // 1/4박자 (BPM에 따라 계산)
    feedback: 0.4,        // 피드백 양 (0-1)
    wet: 0.3,             // 드라이/웻 믹스
  },
};

/**
 * Flanger 이펙트
 * 클래식 DJ 이펙트
 */
export const FlangerPreset: EffectData = {
  id: 'flanger-1',
  type: 'Tone.Chorus',
  isBypassed: false,
  options: {
    frequency: 0.5,       // LFO 속도
    delayTime: 3.5,       // 딜레이 시간 (ms)
    depth: 0.8,           // 효과 깊이
    feedback: 0.7,        // 피드백
    spread: 180,          // 스테레오 확장
    wet: 0.5,
  },
};

/**
 * Phaser 이펙트
 * 사이키델릭/서프 사운드
 */
export const PhaserPreset: EffectData = {
  id: 'phaser-1',
  type: 'Tone.Phaser',
  isBypassed: false,
  options: {
    frequency: 0.3,       // LFO 속도
    octaves: 3,           // 옥타브 범위
    stages: 10,           // 페이즈 스테이지 수
    Q: 10,                // 레조넌스
    baseFrequency: 350,   // 기본 주파수
    wet: 0.5,
  },
};

/**
 * Filter Sweep 이펙트
 * 빌드업/브레이크다운용
 */
export const FilterSweepPreset: EffectData = {
  id: 'filter-sweep-1',
  type: 'Tone.AutoFilter',
  isBypassed: false,
  options: {
    frequency: 0.2,       // LFO 속도 (Hz)
    type: 'lowpass',      // 필터 타입
    baseFrequency: 200,   // 최저 주파수
    octaves: 5,           // 스윕 범위
    wet: 1,
  },
};

/**
 * Reverb 이펙트
 * 공간감 추가
 */
export const ReverbPreset: EffectData = {
  id: 'reverb-1',
  type: 'Tone.Freeverb',
  isBypassed: false,
  options: {
    roomSize: 0.7,        // 룸 크기
    dampening: 3000,      // 댐핑 주파수
    wet: 0.3,
  },
};

/**
 * BitCrusher 이펙트
 * Lo-Fi/레트로 사운드
 */
export const BitCrusherPreset: EffectData = {
  id: 'bitcrusher-1',
  type: 'Tuna.Bitcrusher',
  isBypassed: false,
  options: {
    bits: 4,              // 비트 해상도 (1-16)
    normfreq: 0.1,        // 정규화된 주파수
    bufferSize: 4096,     // 버퍼 크기
  },
};

/**
 * Overdrive 이펙트
 * 따뜻한 디스토션
 */
export const OverdrivePreset: EffectData = {
  id: 'overdrive-1',
  type: 'Tuna.Overdrive',
  isBypassed: false,
  options: {
    outputGain: 0.5,      // 출력 게인
    drive: 0.4,           // 드라이브 양
    curveAmount: 0.7,     // 커브 양
    algorithmIndex: 0,    // 알고리즘 (0-5)
  },
};

/**
 * Compressor 이펙트
 * 다이나믹 컨트롤
 */
export const CompressorPreset: EffectData = {
  id: 'compressor-1',
  type: 'Tuna.Compressor',
  isBypassed: false,
  options: {
    threshold: -20,       // 스레시홀드 (dB)
    makeupGain: 1,        // 메이크업 게인
    attack: 1,            // 어택 (ms)
    release: 250,         // 릴리즈 (ms)
    ratio: 4,             // 압축 비율
    knee: 5,              // 니 (dB)
    automakeup: true,     // 자동 메이크업
  },
};

/**
 * WahWah 이펙트
 * 펑키 기타 스타일
 */
export const WahWahPreset: EffectData = {
  id: 'wahwah-1',
  type: 'Tuna.WahWah',
  isBypassed: false,
  options: {
    automode: true,       // 자동 모드
    baseFrequency: 0.5,   // 기본 주파수
    excursionOctaves: 2,  // 옥타브 범위
    sweep: 0.2,           // 스윕 속도
    resonance: 10,        // 레조넌스
    sensitivity: 0.5,     // 민감도
  },
};

// ===== DJ 이펙트 체인 프리셋 =====

/**
 * 기본 DJ FX 체인
 */
export const BasicDJFXChain: EffectData[] = [
  EchoPreset,
  FlangerPreset,
  ReverbPreset,
];

/**
 * 빌드업 이펙트 체인
 */
export const BuildupFXChain: EffectData[] = [
  FilterSweepPreset,
  PhaserPreset,
  ReverbPreset,
];

/**
 * 드롭 이펙트 체인
 */
export const DropFXChain: EffectData[] = [
  CompressorPreset,
  BitCrusherPreset,
];

/**
 * Lo-Fi 이펙트 체인
 */
export const LoFiFXChain: EffectData[] = [
  BitCrusherPreset,
  OverdrivePreset,
  { ...ReverbPreset, options: { ...ReverbPreset.options, wet: 0.5 } },
];

// ===== DJ 이펙트 프리셋 목록 =====

export const ALL_DJ_PRESETS = {
  echo: EchoPreset,
  flanger: FlangerPreset,
  phaser: PhaserPreset,
  filterSweep: FilterSweepPreset,
  reverb: ReverbPreset,
  bitcrusher: BitCrusherPreset,
  overdrive: OverdrivePreset,
  compressor: CompressorPreset,
  wahwah: WahWahPreset,
};

export const ALL_FX_CHAINS = {
  basic: BasicDJFXChain,
  buildup: BuildupFXChain,
  drop: DropFXChain,
  lofi: LoFiFXChain,
};

/**
 * BPM에 맞춰 딜레이 타임 계산
 * @param bpm BPM
 * @param division 박자 분할 (1=1박, 2=1/2박, 4=1/4박 등)
 * @returns 딜레이 시간 (초)
 */
export function calculateDelayTime(bpm: number, division: number = 4): number {
  const beatDuration = 60 / bpm;
  return beatDuration / (division / 4);
}

/**
 * BPM 동기화된 Echo 프리셋 생성
 */
export function createBpmSyncedEcho(bpm: number, division: number = 4): EffectData {
  return {
    ...EchoPreset,
    options: {
      ...EchoPreset.options,
      delayTime: calculateDelayTime(bpm, division),
    },
  };
}
