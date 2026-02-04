export const NOTES = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B'];

/**
 * MIDI / pitch 문자열 변환 유틸
 *
 * - 행(row) / 키(index) / 좌표 관련 로직은 `lib/utils/keys.ts` 에서 관리한다.
 * - 여기서는 순수하게 MIDI ↔ 문자열 변환만 담당한다.
 */

/**
 * pitch 문자열(e.g. \"C4\", \"F#5\")을 MIDI 인덱스(0-127)로 변환한다.
 * C0 = 12 를 기준으로 한다.
 */
export function pitchToMidi(pitch: string): number {
    const match = pitch.match(/([A-G]#?)(-?\d+)/);
    if (!match) return 0;
    const note = match[1];
    const octave = parseInt(match[2]);
    const noteIndex = NOTES.indexOf(note);
    return (octave + 1) * 12 + noteIndex;
}

/**
 * MIDI 인덱스를 pitch 문자열(e.g. \"C4\")로 변환한다.
 */
export function midiToPitch(midi: number): string {
    const octave = Math.floor(midi / 12) - 1;
    const noteIndex = midi % 12;
    return `${NOTES[noteIndex]}${octave}`;
}

// 행/키 관련 유틸은 `keys.ts` 로 이동했다.
// 기존 코드를 위해 최소한의 thin wrapper 를 제공한다.
import { buildKeyMap, getKeyByPitch, getKeyByRow, TOTAL_KEYS } from './keys';

/**
 * 주어진 pitch 의 행(row) 인덱스를 반환한다.
 * (호환용 wrapper – 내부적으로 Key 모델을 사용한다)
 */
export function getRowFromPitch(pitch: string, totalKeys: number = TOTAL_KEYS): number {
    const key = getKeyByPitch(pitch);
    if (!key) return 0;
    return key.index;
}

/**
 * 주어진 행(row) 인덱스에 해당하는 pitch 문자열을 반환한다.
 * (호환용 wrapper – 내부적으로 Key 모델을 사용한다)
 */
export function getPitchFromRow(row: number, totalKeys: number = TOTAL_KEYS): string {
    const key = getKeyByRow(row);
    if (!key) {
        // 범위를 벗어난 경우 가까운 키로 클램프
        const keys = buildKeyMap();
        const clamped = Math.max(0, Math.min(keys.length - 1, row));
        return keys[clamped].pitch;
    }
    return key.pitch;
}

/**
 * pitch 로부터 간단한 음 정보(이름/옥타브/흑건 여부/C 여부)를 얻는다.
 * (호환용 wrapper – Key 모델과 동일한 정보를 제공한다)
 */
export function getNoteInfo(pitch: string) {
    const key = getKeyByPitch(pitch);
    if (!key) {
        const midi = pitchToMidi(pitch);
        const octave = Math.floor(midi / 12) - 1;
        const noteIndex = midi % 12;
        const name = NOTES[noteIndex];
        const isBlack = name.includes('#');
        const isC = name === 'C';
        return { name, octave, isBlack, isC, midi };
    }
    return {
        name: key.name,
        octave: key.octave,
        isBlack: key.isBlack,
        isC: key.isC,
        midi: key.midi,
    };
}
