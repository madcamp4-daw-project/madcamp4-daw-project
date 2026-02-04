import React, { useState, useEffect, useRef } from 'react';
import { uploadPianoRecord } from '../../api/audioApi';
import useProjectStore from '../../store/useProjectStore';
import { useUploadProgress } from '../../hooks/useUploadProgress';
import styles from './CompositionKeyboard.module.css';

/**
 * SynthPiano 컴포넌트
 * 가상 피아노 키보드 - Classic B/W Theme + Draggable Control Panel
 */
const SynthPiano = ({ padId, previewMode, type, preset, instrumentManager, onClose, embedded = false }) => {
    // 전역 상태 (Studio useProjectStore)
    const bpm = useProjectStore(state => state.bpm);
    const setBpm = useProjectStore(state => state.setBpm);
    const isMetronomeOn = useProjectStore(state => state.isMetronomeOn);
    const setIsMetronomeOn = useProjectStore(state => state.setIsMetronomeOn);

    // 옥타브 시프트 상태
    const [octaveShift, setOctaveShift] = useState(0);
    const MIN_SHIFT = -2;
    const MAX_SHIFT = 2;

    const [pressedKeys, setPressedKeys] = useState(new Set());
    const [showSequencer, setShowSequencer] = useState(false); // Added missing state

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
            if (useProjectStore.getState().isMetronomeOn) {
                useProjectStore.getState().setIsMetronomeOn(false);
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

    const triggerLibraryRefresh = useProjectStore(state => state.triggerLibraryRefresh);

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

    const rootClass = embedded ? styles.synthEmbedded : styles.synthOverlay;

    return (
        <div className={rootClass}>
            {!embedded && (
                <h1 className={styles.mainTitle} style={{ position: 'absolute', top: '10%', zIndex: 0 }}>
                    {previewMode ? `PREVIEW MODE` : 'SYNTH KEYBOARD'}
                </h1>
            )}

            {/* 컨트롤 패널 (Draggable; 임베드 시에는 정적 배치) */}
            <div
                className={embedded ? styles.controlBarEmbedded : styles.controlBar}
                ref={panelRef}
                onMouseDown={embedded ? undefined : handleMouseDown}
            >
                {embedded ? (
                    <div className={styles.controlHeader} style={{ color: '#ccc', borderColor: '#555' }}>
                        Instrument Rack
                    </div>
                ) : (
                    <div className={styles.controlHeader}>Control Panel</div>
                )}

                {/* 악기 선택 */}
                <select 
                    className={styles.instrumentSelect} 
                    value={instrumentType} 
                    onChange={handleInstrumentChange}
                    onMouseDown={(e) => e.stopPropagation()} // 드래그 방지
                >
                    <option value="synth">Basic Synth (Triangle)</option>
                    <option value="fmsynth">FM Synth (DX7)</option>
                    <option value="amsynth">AM Synth (Bell)</option>
                    <option value="membranesynth">Membrane Synth (Kick)</option>
                    <option value="metalsynth">Metal Synth (Cymbal)</option>
                    <option value="monosynth">Mono Synth (Analog)</option>
                    <option value="duosynth">Duo Synth (Stacked)</option>
                    <option value="plucksynth">Pluck Synth (String)</option>
                    <option value="piano">Grand Piano (Sampled)</option>
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

                {/* ARPEGGIATOR (NEW) */}
                <ArpeggiatorControl 
                    instrumentManager={instrumentManager} 
                    padId={padId} 
                    pressedKeys={pressedKeys}
                />

                <div className={styles.separator}></div>
                
                {/* SEQUENCER BUTTON (NEW) */}
                <button
                    onClick={() => {
                        const next = !showSequencer;
                        setShowSequencer(next);
                        // Stop Sequencer if closing? Maybe keep running.
                    }}
                    className={styles.actionButton}
                    onMouseDown={(e) => e.stopPropagation()}
                    style={{ background: showSequencer ? '#00e5ff' : '#444', color: showSequencer ? '#000' : '#fff' }}
                >
                    {showSequencer ? 'Hide Sequencer' : 'Show Sequencer'}
                </button>
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

                    {!embedded && (
                        <button
                            onClick={onClose}
                            className={`${styles.actionButton} ${styles.exitButton}`}
                            onMouseDown={(e) => e.stopPropagation()}
                        >
                            CLOSE PANEL
                        </button>
                    )}
                </div>
            </div>

            {/* Step Sequencer Overlay */}
            {showSequencer && (
                <StepSequencer onClose={() => setShowSequencer(false)} />
            )}

            {/* 피아노 컨테이너 (임베드 시 남은 공간 채움) */}
            <div className={embedded ? styles.keyboardAreaEmbedded : undefined}>
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
        </div>
    );
};

// ... existing KeyboardRow ...

/**
 * Arpeggiator Control Component
 */
const ArpeggiatorControl = ({ instrumentManager, padId, pressedKeys }) => {
    const [isOn, setIsOn] = useState(false);
    const [rate, setRate] = useState('8n');
    const [type, setType] = useState('up');
    const patternRef = useRef(null);

    useEffect(() => {
        if (isOn && pressedKeys.size > 0) {
            // Stop previous
            if (patternRef.current) {
                patternRef.current.dispose();
            }

            // Create Pattern
            const notes = Array.from(pressedKeys).sort(); // Sort for Up pattern basic
            // For real arpeggiators, we might want 'down', 'upDown', 'random' sorting logic
            
            patternRef.current = new Tone.Pattern((time, note) => {
                // Play note
                 if (instrumentManager.activeInstrument === 'piano' && instrumentManager.isSamplerLoaded) {
                    instrumentManager.sampler.triggerAttackRelease(note, rate, time);
                } else if (instrumentManager.synth) {
                    instrumentManager.synth.triggerAttackRelease(note, rate, time);
                }
            }, notes, type);
            
            patternRef.current.interval = rate;
            patternRef.current.start(0);
            
            if (Tone.Transport.state !== 'started') {
                 Tone.Transport.start();
            }

        } else {
             // Stop or Empty
             if (patternRef.current) {
                patternRef.current.stop();
                patternRef.current.dispose();
                patternRef.current = null;
            }
        }

        return () => {
             if (patternRef.current) patternRef.current.dispose();
        }
    }, [isOn, pressedKeys, rate, type, instrumentManager]);

    return (
        <div style={{ display:'flex', flexDirection:'column', width:'100%', gap:'5px', padding:'5px 0' }}>
            <span style={{fontSize:'0.7rem', fontWeight:'bold', color:'#888'}}>ARPEGGIATOR</span>
            <div style={{display:'flex', gap:'5px'}}>
                <button 
                   onClick={()=>setIsOn(!isOn)} 
                   style={{
                       flex:1, 
                       background: isOn ? '#00e5ff' : '#444', color: isOn?'#000':'#fff',
                       border:'none', borderRadius:'4px', fontSize:'0.7rem', cursor:'pointer'
                   }}
                   onMouseDown={e=>e.stopPropagation()}
                >
                    {isOn ? 'ON' : 'OFF'}
                </button>
                <select 
                    value={rate} 
                    onChange={e=>setRate(e.target.value)}
                    style={{flex:1, fontSize:'0.7rem'}}
                    onMouseDown={e=>e.stopPropagation()}
                >
                    <option value="4n">1/4</option>
                    <option value="8n">1/8</option>
                    <option value="16n">1/16</option>
                    <option value="32n">1/32</option>
                </select>
            </div>
             <select 
                value={type} 
                onChange={e=>setType(e.target.value)}
                style={{width:'100%', fontSize:'0.7rem'}}
                onMouseDown={e=>e.stopPropagation()}
            >
                <option value="up">Up</option>
                <option value="down">Down</option>
                <option value="upDown">Up-Down</option>
                <option value="random">Random</option>
            </select>
        </div>
    );
};

// Simple Step Sequencer Component (16 step x 4 track)
const StepSequencer = ({ onClose }) => {
    const [steps, setSteps] = useState(Array(4).fill(null).map(() => Array(16).fill(false))); // 4 tracks (Kick, Snare, HiHat, Clap)
    const [currentStep, setCurrentStep] = useState(0);
    const [isPlaying, setIsPlaying] = useState(false);
    
    // Synths
    const playersRef = useRef([]);

    useEffect(() => {
        // Init Drums
        const kick = new Tone.MembraneSynth().toDestination();
        const snare = new Tone.NoiseSynth({ envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).toDestination();
        const hihat = new Tone.MetalSynth({ envelope: { attack: 0.001, decay: 0.1, release: 0.01 }, harmonicity:5.1, modulationIndex: 32, resonance: 4000, octaves: 1.5 }).toDestination();
        const clap = new Tone.MembraneSynth({ pitchDecay: 0.01, octaves: 6, oscillator: { type: 'square' }, envelope: { attack: 0.001, decay: 0.2, sustain: 0 } }).toDestination();

        playersRef.current = [kick, snare, hihat, clap];

        return () => {
             playersRef.current.forEach(p => p.dispose());
        }
    }, []);

    useEffect(() => {
        let loop = null;
        if (isPlaying) {
             loop = new Tone.Loop((time) => {
                 const step = currentStep; // This clojure might be stale? No, loop callback runs repeatedly.
                 // Actually relying on state in callback is tricky. Best to use Tone.Transport.scheduleRepeat
                 // Let's use Tone.Sequence approach or simpler Transport.scheduleRepeat logic updated by ref or separate Effect.
             }, "16n");
             // Better: Tone.Sequence
        }
    }, [isPlaying]);

    // Better approach: Single Loop using Ref for steps
    const stepsRef = useRef(steps);
    stepsRef.current = steps;

    useEffect(() => {
        const loop = new Tone.Sequence((time, col) => {
             setCurrentStep(col);
             stepsRef.current.forEach((row, rowIdx) => {
                 if (row[col]) {
                     const velocity = 0.8;
                     if (rowIdx === 0) playersRef.current[0].triggerAttackRelease("C1", "8n", time, velocity);
                     else if (rowIdx === 1) playersRef.current[1].triggerAttackRelease("8n", time, velocity);
                     else if (rowIdx === 2) playersRef.current[2].triggerAttackRelease("32n", time, velocity * 0.5); // Hihat
                     else if (rowIdx === 3) playersRef.current[3].triggerAttackRelease("C1", "16n", time, velocity); // Clap/Tom
                 }
             });
        }, [0, 1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15], "16n");

        if (isPlaying) {
            loop.start(0);
            if (Tone.Transport.state !== 'started') Tone.Transport.start();
        } else {
            loop.stop();
        }

        return () => {
            loop.dispose();
        }
    }, [isPlaying]);


    const toggleStep = (row, col) => {
        const newSteps = [...steps];
        newSteps[row] = [...newSteps[row]];
        newSteps[row][col] = !newSteps[row][col];
        setSteps(newSteps);
    };

    return (
         <div style={{
             position: 'absolute', bottom: '220px', left: '50%', transform: 'translateX(-50%)',
             width: '80%', background: 'rgba(20,20,20,0.95)', border: '1px solid #444', borderRadius: '8px',
             padding: '20px', zIndex: 100, color: 'white'
         }}
            onMouseDown={e=>e.stopPropagation()}
         >
             <div style={{display:'flex', justifyContent:'space-between', marginBottom:'10px'}}>
                 <h3>DRUM SEQUENCER</h3>
                 <div style={{display:'flex', gap:'10px'}}>
                    <button onClick={()=>setIsPlaying(!isPlaying)} style={{padding:'5px 15px', background: isPlaying?'#00ff00':'#444', color: isPlaying?'#000':'#fff', border:'none', cursor:'pointer'}}>{isPlaying?'STOP':'PLAY'}</button>
                    <button onClick={onClose} style={{padding:'5px 15px', background:'#f00', color:'#fff', border:'none', cursor:'pointer'}}>X</button>
                 </div>
             </div>

             <div style={{display:'flex', flexDirection:'column', gap:'5px'}}>
                 {['Kick', 'Snare', 'HiHat', 'Clap'].map((label, rowIdx) => (
                     <div key={label} style={{display:'flex', alignItems:'center', gap:'5px'}}>
                         <div style={{width:'60px', fontSize:'0.8rem', color:'#aaa'}}>{label}</div>
                         {steps[rowIdx].map((isActive, colIdx) => (
                             <div 
                                key={colIdx}
                                onClick={() => toggleStep(rowIdx, colIdx)}
                                style={{
                                    width:'30px', height:'30px', 
                                    background: isActive ? '#00e5ff' : (colIdx === currentStep && isPlaying ? '#555' : '#333'),
                                    border: colIdx % 4 === 0 ? '1px solid #666' : '1px solid #444',
                                    cursor: 'pointer',
                                    borderRadius: '2px'
                                }}
                             />
                         ))}
                     </div>
                 ))}
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
