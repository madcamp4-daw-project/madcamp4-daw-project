import React, { useEffect, useMemo, useRef } from 'react';
import { useDJStore } from '../../store/useDJStore';

/**
 * 디바이스 픽셀 비율 반환
 */
const getPixelRatio = () => Math.max(1, Math.floor(window.devicePixelRatio || 1));

/**
 * 값을 0~1 범위로 제한
 */
function constrainValue(v) {
  return Math.max(0, Math.min(1, v));
}

/**
 * 오디오 웨이브 렌더링 함수
 */
function renderAudioWave(
  context,
  amplitudes,
  width,
  height,
  progressRatio,
  variant,
  unitIdx,
  markerPositions,
  markerLabels
) {
  // 중앙선 기준 상/하 대칭 웨이브
  const centerY = Math.floor(height / 2);

  // 배경 그리드 라인
  context.globalAlpha = 0.12;
  for (let x = 0; x < width; x += variant === 'top' ? 40 : 28) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, height);
    context.stroke();
  }
  context.globalAlpha = 1;

  // 웨이브 렌더링
  const sampleCount = amplitudes.length;
  if (!sampleCount) return;

  // 샘플 위치 계산
  const getAmplitudeAt = (x) => {
    const t = x / Math.max(1, width - 1);
    const idx = Math.floor(t * (sampleCount - 1));
    return amplitudes[idx] ?? 0;
  };

  context.lineWidth = 1;

  for (let x = 0; x < width; x++) {
    const normalizedAmp = Math.max(0, Math.min(1, getAmplitudeAt(x)));
    const barHeight = Math.floor(normalizedAmp * (height * 0.48));

    if (barHeight === 0) continue;

    // 색상 설정: unit1은 보라색, unit2는 오렌지색
    let primaryColor = [176, 102, 255]; // 기본 보라색
    if (unitIdx === 1) {
      primaryColor = [176, 102, 255]; // 보라색
    } else if (unitIdx === 2) {
      primaryColor = [255, 159, 71]; // 오렌지색
    }

    // 수직 그라데이션 (안쪽 밝게, 바깥쪽 어둡게)
    const gradient = context.createLinearGradient(0, centerY - barHeight, 0, centerY + barHeight);
    const [r, g, b] = primaryColor;

    gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, 0.4)`);
    gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, 1.0)`);
    gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0.4)`);

    context.strokeStyle = gradient;

    context.beginPath();
    context.moveTo(x + 0.5, centerY - barHeight);
    context.lineTo(x + 0.5, centerY + barHeight);
    context.stroke();
  }

  const shouldRenderMarkers = variant === 'deck';

  // CUE 마커 (노란색 세로선으로 변경)
  if (shouldRenderMarkers && markerPositions && markerPositions.length > 0) {
    context.save();
    context.strokeStyle = 'rgba(255, 204, 0, 0.9)'; // 노란색으로 변경
    context.lineWidth = 2;
    for (const markerPos of markerPositions) {
      const cx = Math.floor(constrainValue(markerPos) * (width - 1));
      context.beginPath();
      context.moveTo(cx + 0.5, 0);
      context.lineTo(cx + 0.5, height);
      context.stroke();
    }
    context.restore();
  }

  // CUE 라벨 박스
  if (shouldRenderMarkers && markerLabels && markerLabels.length > 0) {
    context.save();
    context.font = '600 10px system-ui, -apple-system, Segoe UI, sans-serif';
    context.textBaseline = 'middle';
    context.textAlign = 'center';

    const boxHeight = 14;
    const boxPaddingX = 6;
    const y = 2 + Math.floor(boxHeight / 2);

    for (const marker of markerLabels) {
      const cx = Math.floor(constrainValue(marker.ratio) * (width - 1));
      const textWidth = Math.ceil(context.measureText(marker.name).width);
      const boxWidth = textWidth + boxPaddingX * 2;
      const halfWidth = Math.floor(boxWidth / 2);
      const left = Math.max(2, Math.min(width - boxWidth - 2, cx - halfWidth));

      context.fillStyle = 'rgba(255, 255, 255, 0.8)';
      context.strokeStyle = 'rgba(0, 0, 0, 0.7)';
      context.lineWidth = 1;
      context.fillRect(left, 2, boxWidth, boxHeight);
      context.strokeRect(left + 0.5, 2.5, boxWidth - 1, boxHeight - 1);

      context.fillStyle = 'rgba(0, 0, 0, 0.95)';
      context.fillText(marker.name, left + halfWidth, y);
    }
    context.restore();
  }

  // 재생 위치 인디케이터
  const px = Math.floor(constrainValue(progressRatio) * (width - 1));
  context.strokeStyle = 'rgba(255,255,255,0.9)';
  context.lineWidth = 2;
  context.beginPath();
  context.moveTo(px + 0.5, 0);
  context.lineTo(px + 0.5, height);
  context.stroke();
}

/**
 * AudioVisualizer 컴포넌트
 * 오디오 웨이브폼 시각화
 */
const AudioVisualizer = ({ variant = 'top', unitIdx }) => {
  const canvasRef = useRef(null);

  // 피크 데이터 구독
  const topPeaks = useDJStore((s) => s.deck1.waveformPeaks ?? null);
  const bottomPeaks = useDJStore((s) => s.deck2.waveformPeaks ?? null);
  const unitPeaks = useDJStore((s) =>
    (unitIdx === 1 ? s.deck1.waveformPeaks : s.deck2.waveformPeaks) ?? null
  );

  // 재생 위치/길이 구독
  const unit1Pos = useDJStore((s) => s.deck1.positionSec ?? 0);
  const unit1Dur = useDJStore((s) => s.deck1.durationSec ?? 0);
  const unit2Pos = useDJStore((s) => s.deck2.positionSec ?? 0);
  const unit2Dur = useDJStore((s) => s.deck2.durationSec ?? 0);
  const unit1Cues = useDJStore((s) => s.deck1.cues);
  const unit2Cues = useDJStore((s) => s.deck2.cues);

  const unitState = useDJStore((s) => {
    if (variant !== 'deck') return null;
    if (!unitIdx) return null;
    return unitIdx === 1 ? s.deck1 : s.deck2;
  });

  // 재생 진행률 (0~1)
  const progressRatio = useMemo(() => {
    const dur = unitState?.durationSec ?? 0;
    const pos = unitState?.positionSec ?? 0;
    if (!dur || dur <= 0) return 0;
    return constrainValue(pos / dur);
  }, [unitState?.durationSec, unitState?.positionSec]);

  const topProgress = useMemo(() => {
    if (!unit1Dur || unit1Dur <= 0) return 0;
    return constrainValue(unit1Pos / unit1Dur);
  }, [unit1Pos, unit1Dur]);

  const bottomProgress = useMemo(() => {
    if (!unit2Dur || unit2Dur <= 0) return 0;
    return constrainValue(unit2Pos / unit2Dur);
  }, [unit2Pos, unit2Dur]);

  const topMarkerPositions = useMemo(() => {
    if (!unit1Dur || unit1Dur <= 0) return [];
    const c1 = unit1Cues?.[1];
    const c2 = unit1Cues?.[2];
    return [c1, c2].filter((v) => typeof v === 'number' && isFinite(v)).map((sec) => constrainValue(sec / unit1Dur));
  }, [unit1Cues, unit1Dur]);

  const bottomMarkerPositions = useMemo(() => {
    if (!unit2Dur || unit2Dur <= 0) return [];
    const c1 = unit2Cues?.[1];
    const c2 = unit2Cues?.[2];
    return [c1, c2].filter((v) => typeof v === 'number' && isFinite(v)).map((sec) => constrainValue(sec / unit2Dur));
  }, [unit2Cues, unit2Dur]);

  const unitMarkerPositions = useMemo(() => {
    const dur = unitState?.durationSec ?? 0;
    if (!dur || dur <= 0) return [];
    const cues = unitState?.cues ?? {};
    const c1 = cues?.[1];
    const c2 = cues?.[2];
    return [c1, c2].filter((v) => typeof v === 'number' && isFinite(v)).map((sec) => constrainValue(sec / dur));
  }, [unitState?.cues, unitState?.durationSec]);

  const topMarkerLabels = useMemo(() => {
    if (!unit1Dur || unit1Dur <= 0) return [];
    const c1 = unit1Cues?.[1];
    const c2 = unit1Cues?.[2];
    const labels = [];
    if (typeof c1 === 'number' && isFinite(c1)) labels.push({ ratio: constrainValue(c1 / unit1Dur), name: '1' });
    if (typeof c2 === 'number' && isFinite(c2)) labels.push({ ratio: constrainValue(c2 / unit1Dur), name: '2' });
    return labels;
  }, [unit1Cues, unit1Dur]);

  const bottomMarkerLabels = useMemo(() => {
    if (!unit2Dur || unit2Dur <= 0) return [];
    const c1 = unit2Cues?.[1];
    const c2 = unit2Cues?.[2];
    const labels = [];
    if (typeof c1 === 'number' && isFinite(c1)) labels.push({ ratio: constrainValue(c1 / unit2Dur), name: '1' });
    if (typeof c2 === 'number' && isFinite(c2)) labels.push({ ratio: constrainValue(c2 / unit2Dur), name: '2' });
    return labels;
  }, [unit2Cues, unit2Dur]);

  const unitMarkerLabels = useMemo(() => {
    const dur = unitState?.durationSec ?? 0;
    if (!dur || dur <= 0) return [];
    const cues = unitState?.cues ?? {};
    const c1 = cues?.[1];
    const c2 = cues?.[2];
    const labels = [];
    if (typeof c1 === 'number' && isFinite(c1)) labels.push({ ratio: constrainValue(c1 / dur), name: '1' });
    if (typeof c2 === 'number' && isFinite(c2)) labels.push({ ratio: constrainValue(c2 / dur), name: '2' });
    return labels;
  }, [unitState?.cues, unitState?.durationSec]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = getPixelRatio();
    const rect = canvas.getBoundingClientRect();
    const w = Math.max(1, Math.floor(rect.width));
    const h = Math.max(1, Math.floor(rect.height));

    canvas.width = w * dpr;
    canvas.height = h * dpr;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.lineCap = 'round';
    ctx.strokeStyle = 'rgba(255,255,255,0.18)';

    if (variant === 'top') {
      if (!topPeaks && !bottomPeaks) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
    } else {
      if (!unitPeaks || unitPeaks.length === 0) {
        ctx.clearRect(0, 0, w, h);
        return;
      }
    }

    if (variant === 'top') {
      ctx.clearRect(0, 0, w, h);
      const halfHeight = Math.floor(h / 2);

      if (topPeaks) {
        ctx.save();
        ctx.translate(0, 0);
        renderAudioWave(ctx, topPeaks, w, halfHeight, topProgress, 'top', 1, topMarkerPositions, topMarkerLabels);
        ctx.restore();
      }

      if (bottomPeaks) {
        ctx.save();
        ctx.translate(0, halfHeight);
        renderAudioWave(ctx, bottomPeaks, w, halfHeight, bottomProgress, 'top', 2, bottomMarkerPositions, bottomMarkerLabels);
        ctx.restore();
      }
      return;
    }

    if (!unitPeaks || unitPeaks.length === 0) {
      ctx.clearRect(0, 0, w, h);
      return;
    }
    ctx.clearRect(0, 0, w, h);
    renderAudioWave(ctx, unitPeaks, w, h, progressRatio, 'deck', unitIdx, unitMarkerPositions, unitMarkerLabels);
  }, [
    variant,
    topPeaks,
    bottomPeaks,
    unitPeaks,
    progressRatio,
    topProgress,
    bottomProgress,
    topMarkerPositions,
    bottomMarkerPositions,
    unitMarkerPositions,
    topMarkerLabels,
    bottomMarkerLabels,
    unitMarkerLabels,
    unitIdx,
  ]);

  return (
    <div className={`audio-viz audio-viz--${variant}`} aria-hidden="true">
      <canvas ref={canvasRef} className="audio-viz__canvas" />
    </div>
  );
};

export default AudioVisualizer;
