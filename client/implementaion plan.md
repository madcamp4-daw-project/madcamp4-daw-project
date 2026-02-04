FL Studio 스타일 피아노 롤 구현 계획
목표 설명
FL Studio의 워크플로우와 미학을 모방한 완전한 기능의 대화형 피아노 롤 컴포넌트를 구현합니다. 이 시스템은 UI에 React, 오디오 시퀀싱/합성에 Tone.js, 오디오 이펙트에 Tuna.js를 사용합니다.

사용자 검토 필요
IMPORTANT

성능 선택: 하이브리드 접근 방식(노트 그리드용 HTML5 Canvas + 키/컨트롤용 React)을 선택했습니다. 이는 순수 DOM 요소가 많은 수의 노트에서 겪을 수 있는 성능 문제를 해결하고 FL Studio와 같은 부드러운 스크롤/줌을 보장합니다.

NOTE

오디오 동기화: 시각적 재생은 Tone.Draw 또는 Tone.Transport.seconds와 연결된 requestAnimationFrame 루프를 사용하여 동기화됩니다.

변경 제안
아키텍처
디렉토리 구조
app/
piano-roll/ # 피아노 롤용 새 페이지
components/
piano-roll/
PianoRoll.tsx # 메인 컨테이너
PianoKeys.tsx # 왼쪽 피아노 키 (C0-G10)
GridCanvas.tsx # 메인 노트 편집 영역 (Canvas)
Ruler.tsx # 상단 타임라인 눈금자
Toolbar.tsx # 도구 (그리기, 페인트, 삭제 등)
EventEditor.tsx # 하단 벨로시티/팬 패널
lib/
audio/
AudioEngine.ts # Tone.js + Tuna.js 싱글톤
NoteQuantizer.ts # 그리드 스냅 헬퍼
types/
music.ts # 노트 인터페이스 (피치, 시작, 길이, 벨로시티)
컴포넌트 상세
[신규]
lib/audio/AudioEngine.ts
Tone.Context 초기화.
메인 PolySynth 및
Tuna
이펙트 체인 관리.
메서드 제공: playNote(pitch, duration),
scheduleSequence(notes)
,
stop()
, setEffect(name, params).
[신규]
components/piano-roll/PianoRoll.tsx
상태 (State):
notes: { id, pitch, start, duration, velocity, pan } 배열
zoom: { x: number, y: number }
scroll: { x: number, y: number }
tool: 'draw' | 'paint' | 'delete' | 'select' | 'slice' | 'mute' | 'play'
snap: 'line' | 'cell' | 'none' | '1/6' | '1/4' | '1/3' | '1/2'
activeChannelId: 현재 선택된 악기 채널 ID.
channels: { id, name, instrumentType, effects, visible } 목록.
레이아웃: FL Studio와 일치하는 CSS Grid/Flexbox 레이아웃 (좌측 키, 상단 눈금자, 중앙 그리드, 하단 이벤트).
[신규] components/piano-roll/ChannelSelector.tsx
상단 툴바의 드롭다운.
활성 악기(채널) 목록 표시.
채널 전환 시 activeChannel ID를 변경하고 해당 채널의 노트로 그리드 다시 렌더링.
고스트 채널 로직: channels 상태를 사용하여 비활성 채널의 "고스트 노트" 렌더링.
[신규]
components/piano-roll/GridCanvas.tsx
렌더링 레이어 (z-index 순서):
배경 레이어:
기본 그리드 라인.
스케일 하이라이팅: 선택된 스케일에 포함된 행 밝게 표시 (예: C Major = 흰 건반 + 하이라이트된 행).
웨이브폼 레이어: 오디오 파일 드롭 시 그리드 뒤에 PCM 데이터(흐리게) 렌더링하여 타이밍 참조 제공.
고스트 노트 레이어: 다른 패턴의 반투명 노트.
활성 노트 레이어: FL 스타일 테두리, isSlide 삼각형, 색상 코딩이 적용된 메인 인터랙티브 노트.
커서/플레이헤드 레이어: 인터랙션 오버레이.
인터랙션:
선택된 도구 로직에 따른 MouseDown/Move/Up 핸들러.
우클릭 컨텍스트 메뉴 또는 빠른 삭제 (FL 동작) 처리.
줌/스크롤을 위한 휠 이벤트.
드래그 앤 드롭: 기본 파일 드롭 이벤트를 처리하여 Waveform Layer에 오디오 로드.
우클릭 메뉴: "박자표(Time Signature)" 변경 및 "스케일(Scale)" 선택을 위한 사용자 지정 컨텍스트 메뉴.
[신규]
components/piano-roll/PianoKeys.tsx
수직 피아노를 렌더링하는 React 컴포넌트.
동기화:
GridCanvas
와 수직으로 정확히 함께 스크롤되어야 함.
Props: zoomY, scrollY.
인터랙션: 클릭 시 노트 미리보기.
스케일 표시기: 선택된 스케일에 포함된 건반을 선택적으로 강조.
[신규]
components/piano-roll/NotePropertiesDialog.tsx
트리거: 노트 더블 클릭.
UI 레이아웃:
레벨 섹션: Pan, Velocity, Release, Mod X, Mod Y, Pitch 노브.
속성 섹션:
슬라이드 토글 (삼각형 아이콘)
포르타 토글 (곡선 아이콘)
색상 그룹 선택기 (1-16)
시간 섹션: PPQ에서 계산된 Start Time 및 Duration 입력 필드 (Bar:Step:Tick 형식).
동작: "Accept"는 상태의 노트를 업데이트, "Reset"은 기본값 복원.
[신규]
components/piano-roll/EventEditor.tsx
타겟 선택기: Velocity, Pan, Pitch, Mod X, Mod Y 간 전환 드롭다운.
보간 도구: 드래그 시 값 사이의 선형 램프 생성 (매뉴얼의 "Interpolate (I)" 기능).
[신규] components/piano-roll/NoteProperties.tsx (Toolbar 확장)
색상 선택기: 16색 그리드. currentNoteColor 상태 업데이트.
슬라이드/포르타 토글: 새로 그려지는 노트에 isSlide 또는 isPorta 플래그를 설정하는 토글 버튼.
[신규]
components/piano-roll/Toolbar.tsx
FL 메뉴 구조 구현: File,
Edit
, Tools,
View
,
Snap
,
Select
,
Group
, Zoom, Target Channel, Stamp.
스탬프 도구:
코드(Major, Minor, 7th, 9th 등) 드롭다운을 엽니다.
선택 시 그리드를 클릭하면 클릭한 근음(Root)을 기준으로 코드 노트가 삽입됩니다.
오디오 통합 로직
[신규]
lib/audio/InstrumentRack.ts
동적 인스턴스화: 문자열 유형에 따라 Tone.js 악기를 생성하는 팩토리 패턴.
지원되는 악기:
Tone.Synth, AMSynth, FMSynth, MembraneSynth, MetalSynth, MonoSynth, NoiseSynth, PluckSynth, DuoSynth, Sampler. (PolySynth로 래핑됨).
[신규]
lib/audio/EffectRack.ts
이펙트 체인: Tone.Serial 또는 수동 연결 체인 관리.
지원되는 이펙트:
Tone.js: AutoFilter, AutoPanner, AutoWah, BitCrusher, Chebyshev, Chorus, Distortion, FeedbackDelay, Freeverb, FrequencyShifter, JCReverb, Phaser, PingPongDelay, PitchShift, Reverb, StereoWidener, Tremolo, Vibrato.
Tuna.js: Tuna.Chorus, Delay, Phaser, Overdrive, Compressor, Convolver, Filter, Cabinet, Tremolo, WahWah, Bitcrusher, MoogFilter, PingPongDelay, Panner, Gain.
UI 통합:
각 채널에는 랙 뷰를 여는 "Effects" 버튼이 있습니다.
사용자는 동적으로 이펙트를 추가/제거할 수 있습니다.
시퀀싱: notes 상태 변경 시 Tone.Part 업데이트 또는 Transport 이벤트 재스케줄링.
재생: Tone.Transport.start()가 시퀀스를 트리거.
시각적 동기화: Tone.Transport.seconds를 확인하는 requestAnimationFrame 루프를 사용하여 플레이헤드 그리기.
[완료] 알고리즘 도구 (리프 머신)
아르페지에이터:
lib/utils/riffMachine.ts
에 구현됨.
랜더마이저: 구현됨.
플립: 구현됨.
리프 머신 대화상자: 구현됨.
[완료] UI 개선 (시각적 동등성)
LeftControlPanel: 구현됨.
Tooibar: Lucide 아이콘으로 리팩토링됨.
Event Editor: 구현됨.
Top Bar: 리팩토링됨.
타임 마커 및 시그니처 (다음 단계)
components/piano-roll/Ruler.tsx
로직 업데이트
데이터 모델:
TimeMarker
배열 { time: number, type: 'Signature', numerator, denominator }.
그리기 로직:
마디(Measure)를 순회.
각 마디의 현재 박자표(Time Signature) 결정.
그에 따라 비트 그리기 (예: 3/4의 경우 3줄).
인터랙션:
눈금자 우클릭 -> "박자표 변경 추가(Add Time Signature Change)".
마커 더블 클릭 -> 편집 대화상자.
오디오 동기화:
특정 마디에 Tone.Transport.timeSignature = X 이벤트 스케줄링.
[완료] 고급 기능 (FL 전용)
고스트 노트: 구현됨.
배경에 다른 패턴의 노트 렌더링.
더블 클릭하여 채널 전환.
스케일에 맞추기 (Snap to Scale): 구현됨.
스케일 노트 시각적 강조.
드래그 시 스케일에 스냅.
웨이브폼 시각화 도구: 구현됨.
오디오 드래그 앤 드롭 지원.
배경 웨이브폼 렌더링.
슬라이드 및 포르타멘토: 구현됨 (AudioEngine).
최종 오디오 및 인터랙션 구현
오디오 엔진 개선:

Tuna
이펙트가 올바르게 인스턴스화되고 연결되었는지 확인.
scheduleSequence
가 isSlide를 적절히 처리하는지 검증 (진행됨).
최적화: 오버헤드를 피하기 위해 가능한 경우 Synth 인스턴스 재사용.
트랜스포트 동기화:

플레이헤드 애니메이션: Tone.Transport.seconds 또는 Tone.Transport.position을 조회하는 requestAnimationFrame을
PianoRoll.tsx
에 구현.
버튼 클릭에 start/stop 로직 적용.
루핑: Tone.Transport.loop = true, Tone.Transport.loopStart, Tone.Transport.loopEnd.
시각적 요소 및 인터랙션:

색상 그룹:
GridCanvas
에 colorIndex 전달.
FL Studio 스타일 팔레트(녹색, 파랑, 빨강 등 16색) 매핑.
비주얼 아이콘:
슬라이드: 노트 시작 부분에 삼각형(▲) 그리기.
포르타멘토: 깃발 또는 곡선 아이콘 그리기.
드래그 퀀타이제이션:
GridCanvas
의
handleMouseMove
로직이 X축 이동 시 zoomX(스냅 간격)를 따르도록 함.
상태 토글:
LeftControlPanel
의 슬라이드/포르타 토글이
PianoRoll
상태를 업데이트하도록 보장.
새 노트 추가(Draw) 시 현재 토글 상태 주입.
오디오 구현 전략 (슬라이드)
포르타멘토:
표준 Tone.Synth 포르타멘토 기능 사용.
isPorta가 true인 노트 이벤트 발생 시, 해당 인스트루먼트의 portamento 값을 일시적으로 설정(예: 0.2s).
슬라이드 노트:
동작 원리: 그 자체로는 소리를 내지 않고(Silent), 같은 색상 그룹의 현재 재생 중인 노트의 주파수(Pitch)를 슬라이드 노트의 피치로 램프(Ramp)시킴.
구현 상세:
scheduleSequence
내부 로직:
노트를 시간 순으로 순회.
isSlide 노트인 경우:
triggerAttack
을 호출하지 않음.
대신, 동일 채널/동일 색상 그룹의 활성 보이스를 찾아 frequency.rampTo(targetPitch, duration) 명령 예약.
일반 노트인 경우:
정상적으로
triggerAttackRelease
호출.
검증 계획
자동화 테스트
npm run build: 빌드 오류 없음 확인.
Tone.js/Tuna.js 규격 준수: 위키 문서 기반 초기화 및 연결 로직 검증 완료.
수동 검증 (완료)
시각적 확인: 구현된 UI가 FL Studio 스크린샷(삼각형, 색상 등)과 일치하는지 확인.
오디오 확인:
건반 클릭 -> 소리 정상 출력.
노트 그리기 -> 스페이스바 재생 -> 시퀀스 정상 재생.
슬라이드 노트 -> 기존 노트의 음정이 부드럽게 변하는지(Glissando) 확인.
도구 확인:
그리기 (Draw): 클릭 시 노트 추가 및 아이콘 표시.
삭제 (Delete): 우클릭 삭제.
이동 (Move): 드래그 시 퀀타이즈(스냅) 적용 확인.
사용자 온보딩 및 도움말 시스템 (New)
목표
초보자도 쉽게 기능을 이해할 수 있도록 모든 인터랙티브 요소에 상세하고 아름다운 툴팁을 제공합니다.

컴포넌트 설계: components/ui/tooltip-custom.tsx
기반 기술: @radix-ui/react-tooltip.
디자인: 다크 테마 배경, 오렌지 포인트, 부드러운 애니메이션.
위키/가이드 시스템 (New)
진입점: Toolbar의 Channel Selector(악기 이름) 왼쪽 옆에 ? 또는 Book 아이콘 버튼 배치.
컴포넌트: components/piano-roll/HelpWikiDialog.tsx.
기능:
Dialog
(Modal) 사용.
좌측 사이드바: 목차 (기본 조작, 도구 설명, 악기 설정, 이펙트, 고급 기능).
우측 본문: 실제 코드 기반의 상세 작동 원리 및 사용법 설명.
콘텐츠 포함 내용:
기본 조작: 마우스 좌클릭(입력), 우클릭(삭제), 휠(스크롤/줌).
도구 도감: Draw(그리기), Paint(연속 그리기), Delete(삭제), Select(선택) 등 각 도구의 차이점 설명.
슬라이드/포르타: 삼각형 아이콘이 무엇인지, 어떻게 소리에 영향을 주는지 설명.
리프 머신: 자동 생성 도구 사용법.
콘텐츠 매핑 (Tooltips)
Slide Toggle:
Title: 슬라이드 모드 (Slide Mode)
Desc: 이 모드를 켜고 노트를 찍으면, 해당 노트는 소리를 내지 않고 같은 색상 그룹의 노트를 부드럽게 피치 벤딩(Pitch Bend)합니다. FL Studio의 슬라이드 노트와 동일합니다.
Riff Machine:
Title: 리프 머신 (Riff Machine)
Desc: 복잡한 아르페지오나 패턴을 자동으로 생성해주는 알고리즘 도구입니다.
적용 범위
Toolbar.tsx
: Play, Stop, Loop, 모든 도구, Wiki Button.
LeftControlPanel.tsx
: Color Selector, Slide, Porta.
추가 기능 구현 (MIDI & Reset)
MIDI Export (lib/utils/midiExport.ts):
@tonejs/midi 라이브러리 사용.
현재 notes 배열을 Channel/Track 별로 분리하여 MIDI 객체 생성.
Note
객체의
start
, duration, pitch, velocity 매핑.
Blob 생성 및 다운로드 트리거.
Reset:
setNotes([])로 노트 초기화.
audioEngine.stop() 및 Transport 초기화.
심층 오디오 검증
PianoKeys.tsx: onPlayNote 핸들러가 AudioEngine.triggerAttackRelease를 직접 호출하는지 확인. (Tone.js Wiki: "Triggering a note ensures immediate feedback").
Tuna.js: new Tuna.Chorus() 등 이펙트 생성 시 인자 전달 방식이 TunaWiki 예제와 일치하는지 확인.
Goal Description
Implement a fully functional, highly interactive Piano Roll component that mimics FL Studio's workflow and aesthetics. The system will use React for the UI, Tone.js for audio sequencing/synthesis, and Tuna.js for audio effects.

Implementation Plan - Bilingual Support & Detailed Tooltips
Goal
Implement a comprehensive bilingual (Korean/English) system with a toggle switch, ensuring all tooltips and wiki content are fully translated and detailed.

User Review Required
IMPORTANT

Performance Choice: I am choosing a Hybrid approach (HTML5 Canvas for the Note Grid + React for Keys/Controls). This ensures smooth scrolling/zooming like FL Studio, which pure DOM elements might struggle with at high note counts.

NOTE

Audio Sync: Visual playback will be synchronized using Tone.Draw or a requestAnimationFrame loop linked to Tone.Transport.seconds.

IMPORTANT

The default language will be Korean. A "Global Language Toggle" button will be added to the top-right of the Toolbar (or Main Header).

Proposed Changes
Architecture
Directory Structure
app/
piano-roll/ # New page for the Piano Roll
components/
piano-roll/
PianoRoll.tsx # Main container
PianoKeys.tsx # Left-side piano keys (C0-G10)
GridCanvas.tsx # The main note editing area (Canvas)
Ruler.tsx # Top timeline ruler
Toolbar.tsx # Tools (Draw, Paint, Delete, etc.)
EventEditor.tsx # Bottom velocity/pan panel
lib/
audio/
AudioEngine.ts # Singleton for Tone.js + Tuna.js
NoteQuantizer.ts # Helper for grid snapping
types/
music.ts # Note interface (pitch, start, duration, velocity)
Components Details
[NEW]
lib/audio/AudioEngine.ts
Initializer for Tone.Context.
Manages the main PolySynth and
Tuna
effects chain.
Provides methods: playNote(pitch, duration),
scheduleSequence(notes)
,
stop()
, setEffect(name, params).
[NEW]
components/piano-roll/PianoRoll.tsx
State:
notes: Array of { id, pitch, start, duration, velocity, pan }
zoom: { x: number, y: number }
scroll: { x: number, y: number }
tool: 'draw' | 'paint' | 'delete' | 'select' | 'slice' | 'mute' | 'play'
snap: 'line' | 'cell' | 'none' | '1/6' | '1/4' | '1/3' | '1/2'
activeChannelId: ID of the currently selected instrument channel.
channels: List of { id, name, instrumentType, effects, visible }.
Layout: CSS Grid/Flexbox layout matching FL Studio (Keys left, Ruler top, Grid center, Events bottom).
[NEW] components/piano-roll/ChannelSelector.tsx
Dropdown in top toolbar.
Shows list of active instruments (Channels).
Switching channels swaps the activeChannel ID, re-rendering the grid with that channel's notes.
Ghost Channel Logic: Use channels state to render "Ghost Notes" from non-active channels.
[NEW]
components/piano-roll/GridCanvas.tsx
Rendering Layers (z-index order):
Background Layer:
Base grid lines.
Scale Highlighting: Lighten rows participating in the selected Scale (e.g., C Major = white keys + highlighted rows).
Waveform Layer: If an audio file is dropped, render its PCM data (faded) behind the grid for timing reference.
Ghost Note Layer: Semi-transparent notes from other patterns.
Active Note Layer: Main interactive notes with FL-style borders, isSlide triangles, and color coding.
Cursor/Playhead Layer: Interaction overlays.
Interaction:
MouseDown/Move/Up handlers for selected Tool logic.
Right-click handling for context menus or quick delete (FL behavior).
Wheel events for Zoom/Scroll.
Drag & Drop: Handle native file drop events to load audio into the Waveform Layer.
Right-Click Menu: Custom context menu for "Time Signature" changes and "Scale" selection.
[NEW]
components/piano-roll/PianoKeys.tsx
React component rendering the vertical piano.
Sync: Must scroll vertically in lock-step with
GridCanvas
.
Props: zoomY, scrollY.
Interaction: Click to preview note.
Scale Indicators: Optionally highlight keys that are in the selected scale.
[NEW]
components/piano-roll/NotePropertiesDialog.tsx
Trigger: Double-click on a note.
UI Layout:
Levels Section: Knobs for Pan, Velocity, Release, Mod X, Mod Y, Pitch.
Attributes Section:
Slide Toggle (Triangle icon)
Porta Toggle (Curve icon)
Color Group Selector (1-16)
Time Section: Input fields for Start Time and Duration in Bar:Step:Tick format (calculated from PPQ).
Behavior: "Accept" updates the note in state; "Reset" restores defaults.
[NEW]
components/piano-roll/EventEditor.tsx
Target Selector: Dropdown to switch between Velocity, Pan, Pitch, Mod X, Mod Y.
Interpolation Tool: Dragging creates a linear ramp between values (as per manual "Interpolate (I)").
[NEW] components/piano-roll/NoteProperties.tsx (Toolbar Extension)
Color Selector: 16-color grid. Updates currentNoteColor state.
Slide/Porta Toggles: Toggle buttons that set the isSlide or isPorta flag for newly drawn notes.
[NEW]
components/piano-roll/Toolbar.tsx
Implements FL Menu structure: File,
Edit
, Tools,
View
,
Snap
,
Select
,
Group
, Zoom, Target Channel, Stamp.
Stamp Tool:
Opens a dropdown of chords (Major, Minor, 7th, 9th, etc.).
When selected, clicking on the grid inserts the chord notes relative to the clicked root.
Audio Integration Logic
[NEW]
lib/audio/InstrumentRack.ts
Dynamic Instantiation: Factory pattern to create any Tone.js instrument based on string type.
Supported Instruments:
Tone.Synth, AMSynth, FMSynth, MembraneSynth, MetalSynth, MonoSynth, NoiseSynth, PluckSynth, DuoSynth, Sampler. (Wrapped in PolySynth where appropriate).
[NEW]
lib/audio/EffectRack.ts
Effect Chain: Manages a Tone.Serial or manual connection chain.
Supported Effects:
Tone.js: AutoFilter, AutoPanner, AutoWah, BitCrusher, Chebyshev, Chorus, Distortion, FeedbackDelay, Freeverb, FrequencyShifter, JCReverb, Phaser, PingPongDelay, PitchShift, Reverb, StereoWidener, Tremolo, Vibrato.
Tuna.js: Tuna.Chorus, Delay, Phaser, Overdrive, Compressor, Convolver, Filter, Cabinet, Tremolo, WahWah, Bitcrusher, MoogFilter, PingPongDelay, Panner, Gain.
UI Integration:
Each channel has an "Effects" button opening a rack view.
Users can add/remove effects dynamically.
Sequencing: When notes state changes, update a Tone.Part or reschedule events on the Transport.
Playback: Tone.Transport.start() triggers the sequence.
Visual Sync: Use a requestAnimationFrame loop that checks Tone.Transport.seconds to draw the playhead.
[COMPLETED] Algorithmic Tools (Riff Machine)
Arpeggiator: Implemented in
lib/utils/riffMachine.ts
.
Randomizer: Implemented.
Flip: Implemented.
RiffMachineDialog: Implemented.
[COMPLETED] UI Enhancements (Visual Parity)
LeftControlPanel: Implemented.
Toolbar: Refactored with Lucide icons.
Event Editor: Implemented.
Top Bar: Refactored.
Time Markers & Signatures (Next Step)
components/piano-roll/Ruler.tsx
Logic Update
Data Model:
TimeMarker
array { time: number, type: 'Signature', numerator, denominator }.
Drawing Logic:
Iterate through measures.
Determine current Time Signature at each measure.
Draw beats accordingly (e.g., 3 lines for 3/4).
Interaction:
Right-click on Ruler -> "Add Time Signature Change".
Double-click Marker -> Edit Dialog.
Audio Sync:
Schedule Tone.Transport.timeSignature = X events at specific bars.
[COMPLETED] Advanced Features (FL Specific)
Ghost Notes: Implemented.

Render notes from other patterns in background.
Double-click to switch channels.
Snap to Scale: Implemented.

Visual highlighting of scale notes.
Dragging snaps to scale.
Waveform Visualizer: Implemented.

Drag & Drop audio support.
Background waveform rendering.
Slide & Portamento: Implemented (AudioEngine).

Waveform Visualizer: Implemented above.
Final Audio & Interaction Sprint
Audio Engine Refinements:

Ensure
Tuna
effects are properly instantiated and connected.
Validate
scheduleSequence
handles isSlide properly (already started).
Optimization: Reuse Synth instances where possible to avoid overhead.
Transport Synchronization:

Playhead Animation: Implement requestAnimationFrame in
PianoRoll.tsx
to query Tone.Transport.seconds or Tone.Transport.position.
Apply start/stop logic to button clicks.
Looping: Tone.Transport.loop = true, Tone.Transport.loopStart, Tone.Transport.loopEnd.
시각적 요소 및 인터랙션 (Visuals & Interactions):

색상 그룹 (Color Groups):
GridCanvas
에 colorIndex 전달.
FL Studio 스타일 팔레트(녹색, 파랑, 빨강 등 16색) 매핑.
비주얼 아이콘 (Visual Icons):
슬라이드 (Slide): 노트 시작 부분에 삼각형(▲) 그리기.
포르타멘토 (Porta): 깃발 또는 곡선 아이콘 그리기.
드래그 퀀타이제이션 (Drag Quantization):
GridCanvas
의
handleMouseMove
로직이 X축 이동 시 zoomX(스냅 간격)를 따르도록 함.
상태 토글 (State Toggles):
LeftControlPanel
의 슬라이드/포르타 토글이
PianoRoll
상태를 업데이트하도록 보장.
새 노트 추가(Draw) 시 현재 토글 상태 주입.
오디오 구현 전략 (Audio Implementation Strategy - Slides)
포르타멘토 (Portamento):
표준 Tone.Synth 포르타멘토 기능 사용.
isPorta가 true인 노트 이벤트 발생 시, 해당 인스트루먼트의 portamento 값을 일시적으로 설정(예: 0.2s).
슬라이드 노트 (Slide Notes):
동작 원리: 그 자체로는 소리를 내지 않고(Silent), 같은 색상 그룹의 현재 재생 중인 노트의 주파수(Pitch)를 슬라이드 노트의 피치로 램프(Ramp)시킴.
구현 상세:
scheduleSequence
내부 로직:
노트를 시간 순으로 순회.
isSlide 노트인 경우:
triggerAttack
을 호출하지 않음.
대신, 동일 채널/동일 색상 그룹의 활성 보이스를 찾아 frequency.rampTo(targetPitch, duration) 명령 예약.
일반 노트인 경우:
정상적으로
triggerAttackRelease
호출.
검증 계획 (Verification Plan)
자동화 테스트 (Automated Tests)
npm run build: 빌드 오류 없음 확인.
Tone.js/Tuna.js 규격 준수: 위키 문서 기반 초기화 및 연결 로직 검증 완료.
Unit Tests: Test NoteQuantizer logic (e.g., snapping 1.23 to grid 1.25).
Component Tests: Verify PianoKeys renders correct octaves.

1. Infrastructure (lib/i18n)
   [NEW] lib/i18n/types.ts
   Define Language type ('ko' | 'en') and TranslationKey types.
   [NEW] lib/i18n/LanguageContext.tsx
   React Context to manage language state.
   Persist to localStorage (key: 'app-language').
   Export useLanguage() hook.
   [NEW] lib/i18n/dictionary.ts
   Huge object containing all text resources.
   Structure:
   export const DICTIONARY = {
   ko: {
   toolbar: { ... },
   tools: { ... },
   wiki: { ... },
   ...
   },
   en: { ... }
   }
2. UI Components Refactor
   [MODIFY]
   app/daw/page.tsx
   Wrap
   PianoRoll
   with LanguageProvider.
   [MODIFY]
   components/piano-roll/Toolbar.tsx
   Add Language Toggle Button (Flag or Text 'KO/EN') in the top-right or consistent location.
   Replace hardcoded strings with
   t(key)
   helper from hook.
   Ensure all
   CustomTooltip
   props use the dictionary.
   [MODIFY]
   components/piano-roll/LeftControlPanel.tsx
   Translate "Slide", "Porta" buttons/tooltips.
   Add tooltips for Color Palette.
   [MODIFY]
   components/piano-roll/HelpWikiDialog.tsx
   Rewrite content to use the dictionary.
   Add specific detailed sections for Slide, Portamento, and Color Groups as requested, explaining their usage in the FL Studio context.
3. Detailed Documentation Content (in Dictionary)
   Slide: "Slide Note prevents re-triggering and bends pitch from the previous note." / "소리를 다시 발생시키지 않고 이전 음정에서 부드럽게 이어지는 슬라이드 노트입니다."
   Porta: "Enables portamento (glide) for the channel." / "채널에 포르타멘토(글라이드) 효과를 적용합니다."
   Color: "Determines MIDI channel (1-16). Slide notes only affect notes of the same color." / "1-16번 MIDI 채널을 결정합니다. 슬라이드 노트는 같은 색상의 노트에만 영향을 줍니다."
   Verification Plan
   Manual Verification
   Visual Check: Compare implemented UI with provided FL Studio screenshots (colors, layout).
   Audio Check:
   Click piano keys -> Sound should play.
   Draw notes -> Press Space -> Sequence should play in time.
   Drag note up/down -> Pitch should change.
   Resize note -> Duration should change.
   Tool Check:
   Draw: Click adds note.
   Delete: Right-click removes note.
   Scroll/Zoom: Mouse wheel and drag work smoothly.
   Toggle Language button and verify text changes instantly.
   Hover over every tool/button to check detailed Korean tooltips.
   Open Wiki and check bilingual content.
   Verify localStorage persistence on reload.
