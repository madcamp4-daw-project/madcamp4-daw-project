// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 라우터 가져오기
const audioRouter = require('./routes/audio');

const app = express();
const PORT = process.env.PORT || 3001;

// 미들웨어 설정
app.use(cors()); // 프론트엔드와 통신을 위해 필수
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 상세 로깅 미들웨어 (라우트보다 먼저 정의해야 함)
app.use((req, res, next) => {
    const startTime = Date.now();
    const timestamp = new Date().toISOString();
    
    // 요청 로깅
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📥 [${timestamp}] ${req.method} ${req.url}`);
    if (req.body && Object.keys(req.body).length > 0) {
        console.log(`   📦 Body:`, JSON.stringify(req.body, null, 2));
    }
    if (req.file) {
        console.log(`   📎 File: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)} KB)`);
    }
    
    // 응답 로깅
    const originalSend = res.send;
    res.send = function(body) {
        const duration = Date.now() - startTime;
        console.log(`📤 [응답] Status: ${res.statusCode} | 처리시간: ${duration}ms`);
        if (res.statusCode >= 400) {
            console.log(`   ❌ Error Response:`, typeof body === 'string' ? body.substring(0, 200) : body);
        }
        console.log(`${'='.repeat(60)}\n`);
        return originalSend.call(this, body);
    };
    
    next();
});

// Health Check Endpoint
app.get('/health', (req, res) => {
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// 정적 파일 제공 (업로드된 파일이나 결과물 접근용)
// 예: http://localhost:3001/uploads/tracks/파일이름.wav
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));
app.use('/output', express.static(path.join(__dirname, 'output')));

// 라우트 등록
app.use('/api/sound', audioRouter);

// 서버 시작
app.listen(PORT, () => {
    console.log(`✅ Server running on http://localhost:${PORT}`);
    
    // 필수 폴더 확인 및 생성 (서버 켤 때마다 체크)
    const dirs = [
        'uploads/temp', 
        'uploads/tracks', 
        'output/layers', 
        'output/blends',
        'output/aligned_layers'
    ];
    dirs.forEach(dir => {
        const dirPath = path.join(__dirname, dir);
        if (!fs.existsSync(dirPath)) {
            fs.mkdirSync(dirPath, { recursive: true });
            console.log(`📁 Created directory: ${dir}`);
        }
    });
});