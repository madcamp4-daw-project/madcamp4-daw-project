// server/routes/audio.js
// 오디오 처리 API 엔드포인트
// 리팩토링됨 - 라우트 경로 및 변수명 변경

const express = require('express');
const { exec } = require('child_process');
const { promisify } = require('util');
const path = require('path');
const multer = require('multer');
const fs = require('fs').promises;

const router = express.Router();
const execAsync = promisify(exec);

// 파일 업로드 설정
const upload = multer({
  dest: 'uploads/temp/',
  limits: { fileSize: 100 * 1024 * 1024 } // 100MB 제한
});

// Python 스크립트 경로
const SERVICES_DIR = path.join(__dirname, '../services');

/**
 * 오디오 파일 업로드 및 자동 분석
 * POST /api/sound/upload
 */
router.post('/upload', upload.single('file'), async (req, res) => {
  try {
    if (!req.file) {
      return res.status(400).json({
        success: false,
        error: '파일이 업로드되지 않았습니다.',
        code: 'NO_FILE'
      });
    }

    const { title, artist } = req.body;
    const uploadedPath = req.file.path;

    // Python 스크립트로 트랙 분석 실행
    const analysisScript = path.join(SERVICES_DIR, 'audio_analysis.py');
    const { stdout } = await execAsync(`python3 "${analysisScript}" "${uploadedPath}"`);

    const analysisResult = JSON.parse(stdout);

    res.json({
      success: true,
      trackId: 123,
      analysis: analysisResult,
      message: '파일 업로드 및 분석 완료'
    });

  } catch (error) {
    console.error('업로드 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'UPLOAD_FAILED'
    });
  }
});

/**
 * 레이어 분리 실행
 * POST /api/sound/split
 */
router.post('/split', async (req, res) => {
  try {
    const { trackId } = req.body;

    if (!trackId) {
      return res.status(400).json({
        success: false,
        error: 'trackId가 필요합니다.',
        code: 'MISSING_TRACK_ID'
      });
    }

    const audioFilePath = `uploads/tracks/${trackId}.wav`;
    const outputDir = path.join(__dirname, `../output/layers/${trackId}`);

    // Python 스크립트 실행
    const separationScript = path.join(SERVICES_DIR, 'stem_separation.py');
    const { stdout } = await execAsync(
      `python3 "${separationScript}" "${audioFilePath}" "${outputDir}"`
    );

    const separationResult = JSON.parse(stdout);

    res.json({
      success: true,
      layers: separationResult.layers,
      message: '레이어 분리 완료'
    });

  } catch (error) {
    console.error('레이어 분리 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'LAYER_SEPARATION_FAILED'
    });
  }
});

/**
 * 오디오 분석 (재실행)
 * POST /api/sound/inspect
 */
router.post('/inspect', async (req, res) => {
  try {
    const { trackId } = req.body;

    if (!trackId) {
      return res.status(400).json({
        success: false,
        error: 'trackId가 필요합니다.',
        code: 'MISSING_TRACK_ID'
      });
    }

    const audioFilePath = `uploads/tracks/${trackId}.wav`;

    // Python 스크립트 실행
    const analysisScript = path.join(SERVICES_DIR, 'audio_analysis.py');
    const { stdout } = await execAsync(`python3 "${analysisScript}" "${audioFilePath}"`);

    const analysisResult = JSON.parse(stdout);

    res.json({
      success: true,
      analysis: analysisResult
    });

  } catch (error) {
    console.error('트랙 분석 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'ANALYSIS_FAILED'
    });
  }
});

/**
 * 블렌드 시퀀스 생성
 * POST /api/sound/blend
 */
router.post('/blend', async (req, res) => {
  try {
    const { sourceId, targetId, blendPoint } = req.body;

    if (!sourceId || !targetId || blendPoint === undefined) {
      return res.status(400).json({
        success: false,
        error: 'sourceId, targetId, blendPoint가 모두 필요합니다.',
        code: 'MISSING_PARAMETERS'
      });
    }

    // 레이어 경로 구성
    const sourceLayers = {
      drums: `output/layers/${sourceId}/drums.wav`,
      bass: `output/layers/${sourceId}/bass.wav`,
      vocals: `output/layers/${sourceId}/vocals.wav`,
      other: `output/layers/${sourceId}/other.wav`
    };

    const targetLayers = {
      drums: `output/layers/${targetId}/drums.wav`,
      bass: `output/layers/${targetId}/bass.wav`,
      vocals: `output/layers/${targetId}/vocals.wav`,
      other: `output/layers/${targetId}/other.wav`
    };

    const sourceAnalysis = { bpm: 128.5, beats: [], downbeats: [] };
    const targetAnalysis = { bpm: 130.0, beats: [], downbeats: [] };

    // Python 스크립트 실행
    const blendScript = path.join(SERVICES_DIR, 'transition.py');
    const scriptArgs = JSON.stringify({
      sourceLayers,
      targetLayers,
      sourceAnalysis,
      targetAnalysis,
      blendPoint
    });

    const { stdout } = await execAsync(
      `python3 "${blendScript}" '${scriptArgs}'`
    );

    const blendResult = JSON.parse(stdout);

    res.json({
      success: true,
      blendId: 789,
      outputPath: blendResult.outputPath,
      duration: blendResult.duration || 0,
      message: '블렌드 시퀀스 생성 완료'
    });

  } catch (error) {
    console.error('블렌드 생성 오류:', error);
    res.status(500).json({
      success: false,
      error: error.message,
      code: 'BLEND_FAILED'
    });
  }
});

module.exports = router;
