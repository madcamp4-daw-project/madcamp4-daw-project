/**
 * Transition DJ 컴포넌트 모듈 내보내기
 */

// 메인 패널
export { TransitionPanel } from "./TransitionPanel";

// 덱
export { DeckPanelCompact } from "./DeckPanelCompact";

// 이제 사용되지 않음 (백워드 호환용)
export { DeckPanel } from "./DeckPanel";

// 시각화
export { VisualizationArea } from "./VisualizationArea";
export { WaveformDisplay } from "./WaveformDisplay";
export { StemVisualsCanvas } from "./StemVisualsCanvas";

// 컨트롤
export { TransportBar } from "./TransportBar";
export { Crossfader } from "./Crossfader";
export { TransportControls } from "./TransportControls";

// 라이브러리
export { LibraryPanel } from "./LibraryPanel";

// FX
export { TransitionFX } from "./TransitionFX";
export type { TransitionEffect, TransitionEffectType } from "./TransitionFX";

// AI 트랜지션
export { AIParameterPanel } from "./AIParameterPanel";
export type { AITransitionParams } from "./AIParameterPanel";

// SoundCloud 연동
export { SoundCloudModal } from "./SoundCloudModal";

