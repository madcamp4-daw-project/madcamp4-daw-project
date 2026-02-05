// server/routes/audio.js
// 최적화된 통합 버전: Job Queue + Spawn(안정적 실행)

const express = require('express');
const { spawn } = require('child_process');
const path = require('path');
const multer = require('multer');
const fs = require('fs');

const router = express.Router();

// 1. 저장소 설정
const UPLOAD_DIR = path.join(__dirname, '../uploads');
const TRACKS_DIR = path.join(UPLOAD_DIR, 'tracks');

// 폴더가 없으면 생성
if (!fs.existsSync(TRACKS_DIR)) {
    fs.mkdirSync(TRACKS_DIR, { recursive: true });
}

// Multer 설정
const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, TRACKS_DIR);
    },
    filename: (req, file, cb) => {
        // 파일명 충돌 방지를 위해 타임스탬프 사용
        // 예: 1738241234.mp3
        const uniqueSuffix = Date.now();
        const ext = path.extname(file.originalname);
        cb(null, `${uniqueSuffix}${ext}`);
    }
});

const upload = multer({ 
    storage: storage,
    limits: { fileSize: 100 * 1024 * 1024 } // 100MB 제한
});

// 간단한 인메모리 Job Queue
const jobQueue = new Map();

/**
 * 유틸리티: Python 스크립트 실행기 (Spawn 방식)
 * - 실시간 로그 처리 및 대용량 데이터 처리에 적합
 */
const runPythonScript = (scriptName, args, jobId = null) => {
    return new Promise((resolve, reject) => {
        // 1. 루트 경로 (main.py, audio_analysis.py 등) 확인
        let scriptPath = path.join(__dirname, '../', scriptName);
        
        // 2. 없으면 services 폴더 확인
        if (!fs.existsSync(scriptPath)) {
            scriptPath = path.join(__dirname, '../services', scriptName);
        }

        const pythonProcess = spawn('python', [scriptPath, ...args]);

        let resultString = '';
        let errorString = '';

        // stdout 수집 (실시간 진행률 파싱)
        pythonProcess.stdout.on('data', (data) => {
            const str = data.toString();
            resultString += str;
            
            // 실시간 로그에서 JSON 파싱 시도 (줄바꿈 기준)
            const lines = str.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed) continue;
                
                try {
                    const jsonMsg = JSON.parse(trimmed);
                    // 1. 진행률 및 메시지 업데이트
                    if (jsonMsg.progress !== undefined && jobId) {
                        const numericProgress = Number(jsonMsg.progress);
                        if (!isNaN(numericProgress)) {
                             // JobQueue 업데이트
                             const currentJob = jobQueue.get(jobId);
                             if (currentJob) {
                                 currentJob.progress = numericProgress;
                                 if (jsonMsg.message) {
                                     currentJob.message = jsonMsg.message;
                                 }
                                 jobQueue.set(jobId, currentJob);
                                 console.log(`[Job ${jobId}] Progress: ${numericProgress}% - ${jsonMsg.message || ''}`);
                             }
                        }
                    }
                } catch (e) {
                    // JSON이 아니면 무시 (일반 로그일 수 있음)
                }
            }
        });

        // stderr 수집 (Python 로그)
        pythonProcess.stderr.on('data', (data) => {
            const str = data.toString();
            errorString += str;
            if (jobId) console.error(`[Job ${jobId}] stderr: ${str.trim()}`);
        });

        pythonProcess.on('close', (code) => {
            if (code !== 0) {
                return reject(new Error(errorString || 'Python script failed'));
            }
                // 에러가 없으면 성공으로 간주
                // resultString에는 진행률 로그({"progress":...})들이 섞여 있음
                // 줄바꿈으로 나누고, 마지막으로 유효한 JSON을 찾거나, 'stems' 키가 있는 줄을 찾음
                const lines = resultString.split('\n').map(l => l.trim()).filter(l => l);
                let finalResult = null;
                
                // 뒤에서부터 검색하여 결과 JSON 찾기 (가장 마지막에 출력된 유효한 결과)
                for (let i = lines.length - 1; i >= 0; i--) {
                    try {
                        const parsed = JSON.parse(lines[i]);
                        
                        // 1순위: stems 데이터(분리) 또는 bpm 데이터(분석)가 있는 경우 (확실한 성공 결과)
                        if (parsed.stems || parsed.bpm) {
                            finalResult = parsed;
                            break;
                        }
                        
                        // 2순위: 메시지가 있고, progress가 없거나(완료메시지), 
                        // 그러나 진행률 로그(progress 있는거)는 결과로 취급하면 안됨!
                        // 단, progress: 100 이면서 stems가 없는건 그냥 진행 로그일 뿐임.
                        // 따라서 stems가 없는 progress 포함 메시지는 건너뜀.
                    } catch (e) {}
                }

                if (finalResult) {
                    resolve(finalResult);
                } else {
                    // stems를 못 찾았으면, 혹시 에러 메시지가 있는지 확인
                    const errorLog = lines.find(l => l.includes('"error"'));
                    if (errorLog) {
                         try { 
                             resolve(JSON.parse(errorLog)); 
                             return;
                         } catch {}
                    }
                    
                    // 그래도 없으면 실패로 간주하거나 raw 반환
                    // 하지만 stems가 없으면 프론트에서 아무것도 안뜸.
                    // 디버깅을 위해 로깅
                    console.error('❌ 결과 파싱 실패: 유효한 결과(stems 또는 bpm)를 찾을 수 없음', lines);
                    reject(new Error('결과에서 유효한 데이터(stems/bpm)를 찾을 수 없습니다.'));
                }

        });
    });
};

/**
 * 1. 업로드 및 분석 (동기 처리)
 * - 파일 저장 -> audio_analysis.py 실행 -> 결과 반환
 */
router.post('/upload', upload.single('file'), async (req, res) => {
    try {
        if (!req.file) throw new Error('파일이 없습니다.');

        console.log(`\n🎵 ===== 파일 업로드 시작 =====`);
        console.log(`   📁 파일명: ${req.file.originalname}`);
        console.log(`   💾 저장명: ${req.file.filename}`);
        console.log(`   📏 크기: ${(req.file.size / 1024 / 1024).toFixed(2)} MB`);
        console.log(`   📂 경로: ${req.file.path}`);

        console.log(`\n🔍 오디오 분석 시작...`);
        // 분석 스크립트 실행
        // 주의: 파일 경로 전체를 넘김
        const analysisResult = await runPythonScript('audio_analysis.py', [req.file.path]);
        
        console.log(`✅ 분석 완료:`);
        console.log(`   🎼 BPM: ${analysisResult.bpm || 'N/A'}`);
        console.log(`   🎹 Key: ${analysisResult.key || 'N/A'}`);
        console.log(`   ⏱️ Duration: ${analysisResult.duration?.toFixed(1) || 'N/A'}s`);

        // 성공 응답
        res.json({
            success: true,
            trackId: req.file.filename, // 클라이언트는 이 ID를 가지고 분리 요청을 함
            originalName: req.file.originalname,
            analysis: analysisResult,
            message: '업로드 및 분석 완료'
        });

    } catch (error) {
        console.error('업로드 실패:', error);
        res.status(500).json({ success: false, error: error.message });
    }
});

/**
 * 2. 레이어 분리 요청 (비동기 Job Queue)
 * - 클라이언트는 기다리지 않고 Job ID만 받고 연결 종료
 * - 서버는 백그라운드에서 Demucs 실행
 */
router.post('/split', (req, res) => {
    const { trackId } = req.body;
    
    // 확장자가 없는 trackId가 들어오면, 파일을 찾기 위해 매칭 시도
    let targetFilename = trackId;
    if (!fs.existsSync(path.join(TRACKS_DIR, targetFilename))) {
        // .mp3나 .wav를 붙여서 파일이 있는지 확인
        if (fs.existsSync(path.join(TRACKS_DIR, `${trackId}.mp3`))) {
            targetFilename = `${trackId}.mp3`;
        } else if (fs.existsSync(path.join(TRACKS_DIR, `${trackId}.wav`))) {
            targetFilename = `${trackId}.wav`;
        }
    }

    if (!targetFilename) {
        return res.status(404).json({ error: 'File not found on server' });
    }

    // Job 생성
    const jobId = `job_split_${Date.now()}`;
    jobQueue.set(jobId, { status: 'processing', type: 'separation', startTime: Date.now() });

    console.log(`\n🔨 ===== 스템 분리 요청 =====`);
    console.log(`   🎵 TrackId: ${targetFilename}`);
    console.log(`   🔨 분리 작업 시작 (Job: ${jobId})`);

    // 즉시 응답 (Non-blocking)
    res.json({ success: true, jobId, message: '분리 작업이 백그라운드에서 시작되었습니다.' });

    // 백그라운드 실행
    // stem_separation.py는 이제 파일명만 받으면 알아서 경로를 찾도록 수정되었음
    runPythonScript('stem_separation.py', [targetFilename], jobId)
        .then(result => {
             // Python 스크립트가 명시적으로 error 필드를 반환했을 경우 실패 처리
             if (result.error) {
                 console.error(`❌ 분리 실패 (Job: ${jobId}):`, result.error);
                 jobQueue.set(jobId, { 
                     status: 'failed', 
                     error: result.error,
                     failedAt: Date.now()
                 });
                 return;
             }

            console.log(`✅ 분리 완료 (Job: ${jobId})`);
            jobQueue.set(jobId, { 
                status: 'completed', 
                result: result,
                completedAt: Date.now()
            });
        })
        .catch(err => {
            console.error(`❌ 분리 실패 (Job: ${jobId}):`, err.message);
            jobQueue.set(jobId, { 
                status: 'failed', 
                error: err.message,
                failedAt: Date.now()
            });
        });
});

/**
 * 3. 작업 상태 조회 (Polling)
 * - 클라이언트가 1~2초마다 이 API를 호출해서 완료 여부 확인
 */
router.get('/status/:jobId', (req, res) => {
    const job = jobQueue.get(req.params.jobId);
    if (!job) {
        return res.status(404).json({ success: false, message: 'Job not found' });
    }
    res.json({ success: true, ...job });
});

/**
 * 4. 블렌딩 API (Blend Mix / Drop Mix 지원)
 * @param {string} sourceId - 소스 트랙 ID (Track A)
 * @param {string} targetId - 타겟 트랙 ID (Track B)
 * @param {string} mixType - 믹싱 타입: "blend" (기본) 또는 "drop"
 * @param {number} bridgeBars - Drop Mix 시 브릿지 길이 (마디 수, 기본: 4)
 */
router.post('/blend', (req, res) => {
    const { sourceId, targetId, mixType = 'blend', bridgeBars = 4 } = req.body;
    
    console.log(`\n🎛️ ===== BLEND/MIX API 요청 =====`);
    console.log(`   📥 sourceId (Track A): ${sourceId}`);
    console.log(`   📥 targetId (Track B): ${targetId}`);
    console.log(`   🎚️ mixType: ${mixType} (서버에서 BPM 기반으로 자동 결정됨)`);
    console.log(`   📊 bridgeBars: ${bridgeBars}`);
    
    // 유효성 검사
    if (!sourceId || !targetId) {
        console.error(`❌ 유효성 검사 실패: sourceId 또는 targetId가 없습니다.`);
        return res.status(400).json({ 
            success: false, 
            error: 'sourceId and targetId are required',
            code: 'MISSING_PARAMETERS'
        });
    }
    
    // mixType 유효성 검사
    const validMixTypes = ['blend', 'drop'];
    if (!validMixTypes.includes(mixType.toLowerCase())) {
        console.error(`❌ 유효성 검사 실패: 잘못된 mixType: ${mixType}`);
        return res.status(400).json({ 
            success: false, 
            error: `Invalid mixType: ${mixType}. Use 'blend' or 'drop'.`,
            code: 'INVALID_MIX_TYPE'
        });
    }
    
    const jobId = `job_blend_${Date.now()}`;
    
    jobQueue.set(jobId, { 
        status: 'processing', 
        type: 'blend',
        mixType: mixType,
        startTime: Date.now() 
    });
    
    console.log(`✅ Job 생성 완료: ${jobId}`);
    console.log(`   🎵 Track A: ${sourceId}`);
    console.log(`   🎵 Track B: ${targetId}`);
    
    // 즉시 응답 (Non-blocking)
    res.json({ 
        success: true, 
        jobId, 
        mixType,
        message: `${mixType === 'blend' ? 'Blend' : 'Drop'} Mix 작업이 시작되었습니다.` 
    });

    // 백그라운드 실행: mix_engine.py 호출
    const inputJson = JSON.stringify({
        trackA: sourceId,
        trackB: targetId,
        mixType: mixType,
        bridgeBars: bridgeBars
    });
    
    runPythonScript('mix_engine.py', [inputJson], jobId)
        .then(result => {
            console.log(`✅ Mix 완료 (Job: ${jobId})`);
            jobQueue.set(jobId, { 
                status: 'completed', 
                result: result,
                mixType: mixType,
                completedAt: Date.now()
            });
        })
        .catch(err => {
            console.error(`❌ Mix 실패 (Job: ${jobId}):`, err.message);
            jobQueue.set(jobId, { 
                status: 'failed', 
                error: err.message,
                mixType: mixType,
                failedAt: Date.now()
            });
        });
});

module.exports = router;