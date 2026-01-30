import React, { useState, useEffect, useRef } from 'react';
import { uploadPianoRecord } from '../../api/audioApi';
import { useDJStore } from '../../store/useDJStore';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import styles from './CompositionKeyboard.module.css';

/**
 * SynthPiano 컴포넌트
 * 가상 피아노 키보드 - Classic B/W Theme + Draggable Control Panel
 */
const SynthPiano = ({ padId, previewMode, type, preset, instrumentManager, onClose }) => {
    // 전역 상태
    const bpm = useDJStore(state => state.bpm);
    const setBpm = useDJStore(state => state.setBpm);
    const isMetronomeOn = useDJStore(state => state.isMetronomeOn);
    const setIsMetronomeOn = useDJStore(state => state.setIsMetronomeOn);

    // 옥타브 시프트 상태
    const [octaveShift, setOctaveShift] = useState(0);
    const MIN_SHIFT = -2;
    const MAX_SHIFT = 2;

    const [pressedKeys, setPressedKeys] = useState(new Set());

    // 녹음 상태
    const [isRecording, setIsRecording] = useState(false);
    
    // 업로드 진행률 훅 사용
    const { isUploading, uploadFile } = useUploadProgress();
    
    // 녹음 시작 시간 및 노트 기록
    const recordingStartTimeRef = useRef(null);
    const recordedNotesRef = useRef([]);

    // 악기 상태
    const [instrumentType, setInstrumentType] = useState('synth');

    // 드래그 상태
    const [isDragging, setIsDragging] = useState(false);
    const dragOffset = useRef({ x: 0, y: 0 });
    const panelRef = useRef(null);

    // 프리뷰 모드 초기화
    useEffect(() => {
        if (previewMode && type) {
            instrumentManager.loadPreview(type, preset);
            return () => instrumentManager.closePreview();
        }
    }, [previewMode, type, preset, instrumentManager]);

    // 언마운트 시 메트로놈 정지
    useEffect(() => {
        return () => {
            if (useDJStore.getState().isMetronomeOn) {
                useDJStore.getState().setIsMetronomeOn(false);
              }
        };
    }, []);

    // 악기 변경 핸들러
    const handleInstrumentChange = (e) => {
        const type = e.target.value;
        setInstrumentType(type);
        instrumentManager.setInstrument(type);
    };

    /**
     * 듀얼 Row 레이아웃 키 생성
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
            
            // 녹음 중이면 노트 시작 시간 기록
            if (isRecording && recordingStartTimeRef.current !== null) {
                const currentTime = Date.now();
                const relativeTime = (currentTime - recordingStartTimeRef.current) / 1000;
                recordedNotesRef.current.push({
                    time: relativeTime,
                    note: note,
                    duration: 0,
                    startTime: currentTime,
                });
            }
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
        
        // 녹음 중이면 노트 duration 업데이트
        if (isRecording && recordingStartTimeRef.current !== null) {
            const currentTime = Date.now();
            const noteRecord = recordedNotesRef.current.find(
                n => n.note === note && n.duration === 0
            );
            if (noteRecord) {
                noteRecord.duration = (currentTime - noteRecord.startTime) / 1000;
            }
        }
    };

    const triggerLibraryRefresh = useDJStore(state => state.triggerLibraryRefresh);

    // 녹음 토글
    const toggleRecording = async () => {
        if (isRecording) {
            const blob = await instrumentManager.stopRecording();
            setIsRecording(false);

            if (blob) {
                const now = new Date();
                const dateStr = now.toISOString().slice(0, 10);
                const timeStr = now.toTimeString().slice(0, 8).replace(/:/g, '-');
                const defaultName = `${type}_${dateStr}_${timeStr}`;
                const name = window.prompt("녹음 파일 이름을 입력하세요:", defaultName);

                if (!name) {
                    recordedNotesRef.current = [];
                    recordingStartTimeRef.current = null;
                    return;
                }

                try {
                    const validNotes = recordedNotesRef.current
                        .filter(n => n.duration > 0)
                        .map(({ startTime, ...rest }) => rest);

                    await uploadFile(uploadPianoRecord, {
                        title: name,
                        notes: validNotes,
                        audioBlob: blob,
                    });
                    
                    triggerLibraryRefresh();
                    alert('라이브러리에 저장 완료!');
                } catch (err) {
                    console.error(err);
                    alert('저장 실패');
                } finally {
                    recordedNotesRef.current = [];
                    recordingStartTimeRef.current = null;
                }
            }
        } else {
            recordingStartTimeRef.current = Date.now();
            recordedNotesRef.current = [];
            await instrumentManager.startRecording();
            setIsRecording(true);
        }
    };

    // 드래그 핸들러
    const handleMouseDown = (e) => {
        if (panelRef.current) {
            setIsDragging(true);
            const rect = panelRef.current.getBoundingClientRect();
            dragOffset.current = {
                x: e.clientX - rect.left,
                y: e.clientY - rect.top
            };
        }
    };

    useEffect(() => {
        const movePanel = (e) => {
            if (!isDragging || !panelRef.current) return;
            
            const x = e.clientX - dragOffset.current.x;
            const y = e.clientY - dragOffset.current.y;
            
            panelRef.current.style.right = 'auto'; // CSS right 무효화
            panelRef.current.style.left = `${x}px`;
            panelRef.current.style.top = `${y}px`;
        };

        const stopDrag = () => {
            setIsDragging(false);
        };

        if (isDragging) {
            window.addEventListener('mousemove', movePanel);
            window.addEventListener('mouseup', stopDrag);
        }
        return () => {
            window.removeEventListener('mousemove', movePanel);
            window.removeEventListener('mouseup', stopDrag);
        };
    }, [isDragging]);

    // 키보드 이벤트 핸들러
    useEffect(() => {
        const handleKeyDown = (e) => {
            if (e.repeat) return;
            const char = e.key.toLowerCase();

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
    }, [pressedKeys, previewMode, octaveShift, ivoryKeys, ebonyKeys]);

    return (
        <div className={styles.synthOverlay}>
            {/* 타이틀 (배경 중앙 고정) */}
            <h1 className={styles.mainTitle} style={{ position: 'absolute', top: '10%', zIndex: 0 }}>
                {previewMode ? `PREVIEW MODE` : 'SYNTH KEYBOARD'}
            </h1>

            {/* 컨트롤 패널 (Draggable) */}
            <div 
                className={styles.controlBar} 
                ref={panelRef}
                onMouseDown={handleMouseDown}
            >
                <div className={styles.controlHeader}>Control Panel</div>

                {/* 악기 선택 */}
                <select 
                    className={styles.instrumentSelect} 
                    value={instrumentType} 
                    onChange={handleInstrumentChange}
                    onMouseDown={(e) => e.stopPropagation()} // 드래그 방지
                >
                    <option value="synth">Synth</option>
                    <option value="piano">Grand Piano</option>
                </select>

                <div className={styles.separator}></div>

                {/* 옥타브 컨트롤 */}
                <div className={styles.octaveGroup}>
                    <span className={styles.octaveTag}>OCTAVE</span>
                    <button
                        onClick={() => setOctaveShift(p => Math.max(p - 1, MIN_SHIFT))}
                        className={`${styles.ctrlBtn} ${octaveShift <= MIN_SHIFT ? styles.disabled : ''}`}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        - (↓)
                    </button>

                    <div className={styles.octaveValue} style={{
                        color: octaveShift === 0 ? '#333' : (octaveShift > 0 ? '#007bff' : '#ff9800')
                    }}>
                        {octaveShift > 0 ? `+${octaveShift}` : octaveShift}
                    </div>

                    <button
                        onClick={() => setOctaveShift(p => Math.min(p + 1, MAX_SHIFT))}
                        className={`${styles.ctrlBtn} ${octaveShift >= MAX_SHIFT ? styles.disabled : ''}`}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        + (↑)
                    </button>
                </div>

                <div className={styles.separator}></div>

                {/* 녹음 및 닫기 */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', width: '100%' }}>
                    {/* 메트로놈 */}
                    <button
                        onClick={() => setIsMetronomeOn(!isMetronomeOn)}
                        className={`${styles.actionButton}`}
                        style={{ background: isMetronomeOn ? '#ffeb3b' : '#f0f0f0', color: '#333', border: '1px solid #ccc' }}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        {isMetronomeOn ? '⏰ METRONOME ON' : '⏰ METRONOME OFF'}
                    </button>

                    {previewMode && (
                        <button
                            onClick={toggleRecording}
                            disabled={isUploading}
                            className={`${styles.actionButton} ${styles.recButton} ${isRecording ? styles.recording : ''}`}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            {isUploading ? 'SAVING...' : (isRecording ? 'STOP REC' : 'START REC')}
                        </button>
                    )}

                    <button
                        onClick={onClose}
                        className={`${styles.actionButton} ${styles.exitButton}`}
                        onMouseDown={(e) => e.stopPropagation()}
                    >
                        CLOSE PANEL
                    </button>
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
                />

                {/* Row 1 (하단) - C3-E4 */}
                <KeyboardRow
                    ivoryKeys={ivoryKeys.filter(k => k.rowIdx === 0)}
                    ebonyKeys={ebonyKeys.filter(k => k.rowIdx === 0)}
                    pressedKeys={pressedKeys}
                    triggerKey={triggerKey}
                    releaseKey={releaseKey}
                />

            </div>
        </div>
    );
};

/**
 * KeyboardRow 컴포넌트
 */
const KeyboardRow = ({ ivoryKeys, ebonyKeys, pressedKeys, triggerKey, releaseKey }) => {
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
                <div style={{ position: 'relative', width: `${ivoryKeys.length * 50}px`, height: '100%' }}>
                    {ebonyKeys.map((key) => {
                        const isPressed = pressedKeys.has(key.note);
                        // 간단한 위치 계산 (50px = ivoryKey width + margin approximately)
                        const leftPos = (key.octaveIdx * 50) + 32;

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
