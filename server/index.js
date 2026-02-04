// server/index.js
const express = require('express');
const cors = require('cors');
const path = require('path');
const fs = require('fs');

// 라우터 가져오기
const audioRouter = require('./routes/audio');

const app = express();
const PORT = 3001; // 프론트엔드가 3000번을 쓸 테니 백엔드는 3001번

// 미들웨어 설정
app.use(cors()); // 프론트엔드와 통신을 위해 필수
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// 로깅 미들웨어 (라우트보다 먼저 정의해야 함)
app.use((req, res, next) => {
    console.log(`[요청옴] ${req.method} ${req.url}`);
    next();
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