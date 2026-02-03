import React, { useState, useEffect } from 'react';
import { uploadFile } from '../../api/upload';
import useStore from '../../store/useStore';
import { audioEngine } from '../../audio/AudioEngine';
import styles from './SynthPiano.module.css';

/**
 * SynthPiano 컴포넌트
 * 가상 피아노 키보드 - 네온 글로우 테마 + 펄스 애니메이션 적용
 */
const SynthPiano = ({ padId, previewMode, type, preset, instrumentManager, onClose }) => {
    // 전역 상태
    const bpm = useStore(state => state.bpm);
    const setBpm = useStore(state => state.setBpm);
    const isMetronomeOn = useStore(state => state.isMetronomeOn);
    const setIsMetronomeOn = useStore(state => state.setIsMetronomeOn);

    // 옥타브 시프트 상태
    const [octaveShift, setOctaveShift] = useState(0);
    const MIN_SHIFT = -2;
    const MAX_SHIFT = 2;

    const [pressedKeys, setPressedKeys] = useState(new Set());

    // 녹음 상태
    const [isRecording, setIsRecording] = useState(false);
    const [isUploading, setIsUploading] = useState(false);

    // 프리뷰 모드 초기화
    useEffect(() => {
        if (previewMode && type) {
            instrumentManager.loadPreview(type, preset);
            return () => instrumentManager.closePreview();
        }
    }, [previewMode, type, preset]);

    // 언마운트 시 메트로놈 정지
    useEffect(() => {
        return () => {
            if (useStore.getState().isMetronomeOn) {
                useStore.getState().setIsMetronomeOn(false);
            }
        };
    }, []);

    /**
     * 듀얼 Row 레이아웃 키 생성
     * Row 1 (하단): Z X C V B N M (C3 - B3)
     * Row 2 (상단): Q W E R T Y U (C4 - B4)
     */
    const buildKeyLayout = () => {
        const ivoryKeys = [];
        const ebonyKeys = [];

        // 키 추가 헬퍼
        const addKeyItem = (noteName, char, visualIdx, rowIdx, baseOctave) => {
            const currentOctave = baseOctave + octaveShift;
            const note = `${noteName}${currentOctave}`;

            const isBlack = noteName.includes('#');
            if (isBlack) {
                ebonyKeys.push({ note, char, octaveIdx: visualIdx, rowIdx });
            } else {
                ivoryKeys.push({ note, char, octaveIdx: visualIdx, rowIdx });
            }
        };

        // 하단 옥타브 (C3-E4)
        const LOWER_IVORY = [
            { n: 'C', k: 'z' }, { n: 'D', k: 'x' }, { n: 'E', k: 'c' }, { n: 'F', k: 'v' },
            { n: 'G', k: 'b' }, { n: 'A', k: 'n' }, { n: 'B', k: 'm' },
            { n: 'C', k: ',' }, { n: 'D', k: '.' }, { n: 'E', k: '/' }
        ];
        const LOWER_EBONY = [
            { n: 'C#', k: 's', ref: 0 }, { n: 'D#', k: 'd', ref: 1 },
            { n: 'F#', k: 'g', ref: 3 }, { n: 'G#', k: 'h', ref: 4 }, { n: 'A#', k: 'j', ref: 5 },
            { n: 'C#', k: 'l', ref: 7 }, { n: 'D#', k: ';', ref: 8 }
        ];

        // 상단 옥타브 (C4-E5)
        const UPPER_IVORY = [
            { n: 'C', k: 'q' }, { n: 'D', k: 'w' }, { n: 'E', k: 'e' }, { n: 'F', k: 'r' },
            { n: 'G', k: 't' }, { n: 'A', k: 'y' }, { n: 'B', k: 'u' },
            { n: 'C', k: 'i' }, { n: 'D', k: 'o' }, { n: 'E', k: 'p' }
        ];
        const UPPER_EBONY = [
            { n: 'C#', k: '2', ref: 0 }, { n: 'D#', k: '3', ref: 1 },
            { n: 'F#', k: '5', ref: 3 }, { n: 'G#', k: '6', ref: 4 }, { n: 'A#', k: '7', ref: 5 },
            { n: 'C#', k: '9', ref: 7 }, { n: 'D#', k: '0', ref: 8 }
        ];

        // 하단 Row 처리
        LOWER_IVORY.forEach((k, i) => {
            const octaveAdd = i >= 7 ? 1 : 0;
            addKeyItem(k.n, k.k, i, 0, 3 + octaveAdd);
        });
        LOWER_EBONY.forEach((k) => {
            const octaveAdd = k.ref >= 7 ? 1 : 0;
            addKeyItem(k.n, k.k, k.ref, 0, 3 + octaveAdd);
        });

        // 상단 Row 처리
        UPPER_IVORY.forEach((k, i) => {
            const octaveAdd = i >= 7 ? 1 : 0;
            addKeyItem(k.n, k.k, i, 1, 4 + octaveAdd);
        });
        UPPER_EBONY.forEach((k) => {
            const octaveAdd = k.ref >= 7 ? 1 : 0;
            addKeyItem(k.n, k.k, k.ref, 1, 4 + octaveAdd);
        });

        return { ivoryKeys, ebonyKeys };
    };
    const { ivoryKeys, ebonyKeys } = buildKeyLayout();

    // 노트 재생
    const triggerKey = (note) => {
        if (!pressedKeys.has(note)) {
            if (previewMode) {
                instrumentManager.startPreviewNote(note);
            } else {
                instrumentManager.startNote(padId, note);
            }
            setPressedKeys(prev => new Set(prev).add(note));
        }
    };

    // 노트 정지
    const releaseKey = (note) => {
        if (previewMode) {
            instrumentManager.stopPreviewNote(note);
        } else {
            instrumentManager.stopNote(padId, note);
        }
        setPressedKeys(prev => {
            const next = new Set(prev);
            next.delete(note);
            return next;
        });
    };

    const triggerLibraryRefresh = useStore(state => state.triggerLibraryRefresh);

    // 녹음 토글
    const toggleRecording = async () => {
        if (isRecording) {
            const blob = await instrumentManager.stopRecording();
            setIsRecording(false);

            if (blob) {
                const defaultName = `${type}_${new Date().toISOString().slice(0, 10)}`;
                const name = window.prompt("녹음 파일 이름을 입력하세요:", defaultName);

                if (!name) return;

                setIsUploading(true);
                try {
                    const file = new File([blob], `${name}.webm`, { type: 'audio/webm' });
                    const category = type === 'synth' ? 'synth' : 'instrument';
                    await uploadFile(file, category);
                    triggerLibraryRefresh();
                    alert('라이브러리에 저장 완료!');
                } catch (err) {
                    console.error(err);
                    alert('저장 실패');
                } finally {
                    setIsUploading(false);
                }
            }
        } else {
            await instrumentManager.startRecording();
            setIsRecording(true);
        }
    };

    // 키보드 이벤트 핸들러
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return;
            const char = e.key.toLowerCase();

            // 옥타브 시프트
            if (e.key === 'ArrowUp') {
                e.preventDefault();
                setOctaveShift(prev => Math.min(prev + 1, MAX_SHIFT));
                return;
            }
            if (e.key === 'ArrowDown') {
                e.preventDefault();
                setOctaveShift(prev => Math.max(prev - 1, MIN_SHIFT));
                return;
            }

            const noteObj = [...ivoryKeys, ...ebonyKeys].find(k => k.char === char);
            if (noteObj) triggerKey(noteObj.note);
            if (e.key === 'Escape') onClose();
        };
        const handleKeyUp = (e) => {
            const char = e.key.toLowerCase();
            const noteObj = [...ivoryKeys, ...ebonyKeys].find(k => k.char === char);
            if (noteObj) releaseKey(noteObj.note);
        };

        window.addEventListener('keydown', handleKeyDown);
        window.addEventListener('keyup', handleKeyUp);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
            window.removeEventListener('keyup', handleKeyUp);
        };
    }, [pressedKeys, previewMode, octaveShift]);

    return (
        <div className={styles.synthOverlay}>
            {/* 헤더 */}
            <div className={styles.headerArea}>
                <h1 className={styles.mainTitle}>
                    {previewMode ? `PREVIEW: ${type.toUpperCase()}` : 'SYNTH KEYBOARD'}
                </h1>

                {/* 컨트롤 바 */}
                <div className={styles.controlBar}>

                    {/* 옥타브 컨트롤 */}
                    <div className={styles.octaveGroup}>
                        <span className={styles.octaveTag}>OCTAVE</span>
                        <button
                            onClick={() => setOctaveShift(p => Math.max(p - 1, MIN_SHIFT))}
                            className={`${styles.ctrlBtn} ${octaveShift <= MIN_SHIFT ? styles.disabled : ''}`}
                        >
                            - <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>(↓)</span>
                        </button>

                        <div className={styles.octaveValue} style={{
                            color: octaveShift === 0 ? '#fff' : (octaveShift > 0 ? '#00ffff' : '#ffaa00')
                        }}>
                            {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
                        </div>

                        <button
                            onClick={() => setOctaveShift(p => Math.min(p + 1, MAX_SHIFT))}
                            className={`${styles.ctrlBtn} ${octaveShift >= MAX_SHIFT ? styles.disabled : ''}`}
                        >
                            + <span style={{ fontSize: '0.7rem', color: 'var(--color-text-muted)' }}>(↑)</span>
                        </button>
                    </div>

                    <div className={styles.separator}></div>

                    {/* 녹음 및 닫기 */}
                    <div style={{ display: 'flex', gap: '10px' }}>
                        {/* 메트로놈 */}
                        <button
                            onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                            className={`${styles.actionButton}`}
                            style={{ background: isMetronomeOn ? 'var(--color-accent-primary)' : '#444' }}
                            title="메트로놈 토글"
                        >
                            ⏰
                        </button>

                        {previewMode && (
                            <button
                                onClick={toggleRecording}
                                disabled={isUploading}
                                className={`${styles.actionButton} ${styles.recButton} ${isRecording ? styles.recording : ''}`}
                            >
                                {isUploading ? '저장중...' : (isRecording ? 'STOP' : <>REC ●</>)}
                            </button>
                        )}

                        <button
                            onClick={onClose}
                            className={`${styles.actionButton} ${styles.exitButton}`}
                        >
                            CLOSE
                        </button>
                    </div>
                </div>
            </div>

            {/* 피아노 컨테이너 */}
            <div className={styles.keyboardWrapper}>

                {/* 힌트 텍스트 */}
                <div className={styles.hintLabel}>
                    Upper Row (QWERTY) &nbsp;&nbsp; | &nbsp;&nbsp; Lower Row (ASDF / ZXCV)
                </div>

                {/* Row 2 (상단) - C4-E5 */}
                <KeyboardRow
                    ivoryKeys={ivoryKeys.filter(k => k.rowIdx === 1)}
                    ebonyKeys={ebonyKeys.filter(k => k.rowIdx === 1)}
                    pressedKeys={pressedKeys}
                    triggerKey={triggerKey}
                    releaseKey={releaseKey}
                    rowName="UPPER"
                />

                {/* Row 1 (하단) - C3-E4 */}
                <KeyboardRow
                    ivoryKeys={ivoryKeys.filter(k => k.rowIdx === 0)}
                    ebonyKeys={ebonyKeys.filter(k => k.rowIdx === 0)}
                    pressedKeys={pressedKeys}
                    triggerKey={triggerKey}
                    releaseKey={releaseKey}
                    rowName="LOWER"
                />

            </div>
        </div>
    );
};

/**
 * KeyboardRow 컴포넌트
 * 단일 옥타브 Row
 */
const KeyboardRow = ({ ivoryKeys, ebonyKeys, pressedKeys, triggerKey, releaseKey, rowName }) => {
    return (
        <div className={styles.keyRow}>
            {/* 흰건반 */}
            {ivoryKeys.map((key) => {
                const isPressed = pressedKeys.has(key.note);
                return (
                    <div
                        key={key.note}
                        onMouseDown={() => triggerKey(key.note)}
                        onMouseUp={() => releaseKey(key.note)}
                        onMouseLeave={() => isPressed && releaseKey(key.note)}
                        className={`${styles.ivoryKey} ${isPressed ? styles.pressed : ''}`}
                    >
                        {/* 노트 라벨 */}
                        <span className={styles.noteTag}>
                            {key.note}
                        </span>
                        {/* 키 힌트 */}
                        <span className={styles.keyHint}>
                            {key.char.toUpperCase()}
                        </span>
                    </div>
                );
            })}

            {/* 검은건반 오버레이 */}
            <div className={styles.ebonyKeyArea}>
                <div style={{ position: 'relative', width: `${ivoryKeys.length * 62}px`, height: '100%' }}>
                    {ebonyKeys.map((key) => {
                        const isPressed = pressedKeys.has(key.note);
                        const leftPos = (key.octaveIdx * 62) + 38;

                        return (
                            <div
                                key={key.note}
                                onMouseDown={() => triggerKey(key.note)}
                                onMouseUp={() => releaseKey(key.note)}
                                onMouseLeave={() => isPressed && releaseKey(key.note)}
                                className={`${styles.ebonyKey} ${isPressed ? styles.pressed : ''}`}
                                style={{
                                    left: `${leftPos}px`,
                                }}
                            >
                                {/* 키 힌트 */}
                                <span className={styles.ebonyKeyHint}>
                                    {key.char.toUpperCase()}
                                </span>
                            </div>
                        );
                    })}
                </div>
            </div>
        </div>
    );
};

export default SynthPiano;
