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
        const scriptPath = path.join(__dirname, '../services', scriptName);
        const pythonProcess = spawn('python', [scriptPath, ...args]);

        let resultString = '';
        let errorString = '';

        // stdout 수집
        pythonProcess.stdout.on('data', (data) => {
            const str = data.toString();
            resultString += str;
            // Job이 있다면 진행상황 로깅 가능 (여기선 생략)
            if (jobId) console.log(`[Job ${jobId}] stdout: ${str.trim()}`);
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
            try {
                // JSON 부분만 파싱 시도 (로그가 섞여 있을 수 있으므로)
                // 보통 마지막 줄이나 전체 출력 중 JSON을 찾음
                // 여기서는 간단하게 전체를 파싱 시도
                const result = JSON.parse(resultString);
                resolve(result);
            } catch (e) {
                // 출력이 JSON이 아닐 경우 (단순 성공 메시지 등)
                // 에러가 없으면 성공으로 간주하고 raw string 반환
                if (resultString.trim()) {
                    resolve({ raw: resultString.trim() });
                } else {
                    reject(new Error(`Failed to parse output: ${resultString}`));
                }
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

        console.log(`🔍 분석 시작: ${req.file.filename}`);

        // 분석 스크립트 실행
        // 주의: 파일 경로 전체를 넘김
        const analysisResult = await runPythonScript('audio_analysis.py', [req.file.path]);

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

    console.log(`🔨 분리 작업 시작 (Job: ${jobId}, File: ${targetFilename})`);

    // 즉시 응답 (Non-blocking)
    res.json({ success: true, jobId, message: '분리 작업이 백그라운드에서 시작되었습니다.' });

    // 백그라운드 실행
    // stem_separation.py는 이제 파일명만 받으면 알아서 경로를 찾도록 수정되었음
    runPythonScript('stem_separation.py', [targetFilename], jobId)
        .then(result => {
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
 * 4. (보너스) 블렌딩 API 예시
 */
router.post('/blend', (req, res) => {
    const { sourceId, targetId } = req.body;
    const jobId = `job_blend_${Date.now()}`;
    
    jobQueue.set(jobId, { status: 'processing', type: 'blend' });
    res.json({ success: true, jobId, message: '블렌딩 시작' });

    // transition.py 실행 로직 (나중에 구현)
    // ...
});

module.exports = router;