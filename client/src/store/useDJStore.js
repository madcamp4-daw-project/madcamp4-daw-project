//Zustand Store과 관련된 것이 이 파일이다

//Store란?
//Store = 전역 상태 저장소
/*
여러 컴포넌트가 공유할 데이터를 한 곳에 모아두는 곳
일종의 공유 메모리
(공유 메모리는 당연히 반드시 필요하니까까)

ex)
bpm(템포)를 CompositionKeyboard에서 바꾸면, 다른 컴포넌트에서도 그 값을 읽을 수 있게 한다거나...
isMetronomeOn(메트로놈 켜짐 여부)의 값 변화 여부라던가


Store가 없으면 props로 한땀한땀 부모나 자식에게 계속 전달해야 되서 
만약 엄청나게 깊은 트리 구조이면 자식에게 전달이 매우 힘든 구조가 됨

그래서 Store를 이용해서 어디서든 useDJStore(state => state.bpm)로 읽고, setBpm(130)으로 바꿀 수 있음

요약)
전역 상태를 한 곳에서 관리
props 전달 없이 어디서든 읽고 쓸 수 있음
필요한 값만 선택해 구독하면 불필요한 리렌더 방지

ex)
useDJStore(state => state.bpm) = Store에서 bpm 읽기
setBpm(130) = Store의 bpm을 130으로 변경
Store가 바뀌면 그 값을 구독한 컴포넌트만 다시 렌더됨
이렇게 하면 CompositionKeyboard에서 bpm을 바꾸면, 다른 컴포넌트에서도 그 값을 바로 읽을 수 있음.
*/

import { create } from 'zustand';

// 덱 초기 상태 생성 함수
const createDeckState = () => ({
  trackId: null,
  trackTitle: null,
  artist: null,
  bpm: 0,
  isPlaying: false,
  positionSec: 0,
  durationSec: 0,
  waveformPeaks: null,
  cues: [],
  filter: 0.5,
  mid: 0.5,
  bass: 0.5,
  fx: null,
});

export const useDJStore = create((set, get) => ({
  // 신스 피아노용 상태
  bpm: 120,
  setBpm: (bpm) => set({ bpm }),
  
  isMetronomeOn: false,
  setIsMetronomeOn: (isMetronomeOn) => set({ isMetronomeOn }),
  
  triggerLibraryRefresh: () => set({ _refresh: Date.now() }),
  
  // DJ 믹서용 상태
  deck1: createDeckState(),
  deck2: createDeckState(),
  activeControls: {},
  
  // 덱 업데이트 헬퍼 함수
  setDeck: (unitIdx, patch) =>
    set((state) => ({
      [unitIdx === 1 ? 'deck1' : 'deck2']: {
        ...state[unitIdx === 1 ? 'deck1' : 'deck2'],
        ...patch,
      },
    })),
  
  // activeControls 업데이트
  setActiveControl: (key, active) =>
    set((state) => ({
      activeControls: active
        ? { ...state.activeControls, [key]: true }
        : (() => {
            const next = { ...state.activeControls };
            delete next[key];
            return next;
          })(),
    })),
  
  // 다이얼 값 업데이트
  setDial: (unitIdx, dialType, value) =>
    set((state) => {
      const deck = unitIdx === 1 ? state.deck1 : state.deck2;
      const next = { ...deck, [dialType]: Math.max(0, Math.min(1, value)) };
      return { [unitIdx === 1 ? 'deck1' : 'deck2']: next };
    }),
}));

export default useDJStore;

//읽는건 const bpm = useDJStore(state => state.bpm);
//쓰는건 const setBpm = useDJStore(state => state.setBpm); 
//      setBpm(130); <- setBpm을 가져와서 호출하면 Store의 bpm이 바뀜






/*
create는 Zustand에서 Store를 만드는 함수입니다.
create((set) => ({ ... })) 형태로 사용합니다.
import { create } from 'zustand';
create는 함수입니다.
create(함수) 형태로 호출합니다.
함수는 (set) => ({ ... }) 형태입니다.

set이 뭔가요?
set은 Zustand가 제공하는 함수입니다.
Store의 상태를 바꿀 때 사용합니다.

(set) => ({ ... })가 뭔가요?
화살표 함수(Arrow Function)입니다.
set은 파라미터(매개변수)입니다.
({ ... })는 객체를 반환합니다.
*/