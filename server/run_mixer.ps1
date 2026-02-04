# ==========================================
# [설정 영역]
# ==========================================

$TargetTrackID = "1769835817086"
$BeatFile = "best_loop_full.wav"
$OutputFile = "result_mix_bpm_sync.mp3"

# 🎹 BPM 설정
$BPM = 94   # 곡의 빠르기 (예: 120, 90, 140 등)

# 🎼 이동할 박자 수 (Beats)
# 양수 ( 4) : 비트가 4박자 늦게 나옵니다 (보컬이 먼저 나옴)
# 음수 (-4) : 보컬이 4박자 늦게 나옵니다 (비트가 먼저 나옴)
# 소수점 (0.5) 도 가능합니다 (반박자)
$ShiftBeats = 8 

# ==========================================
# [실행 영역]
# ==========================================

$BaseDir = $PSScriptRoot
$PythonScript = Join-Path -Path $BaseDir -ChildPath "services\vocal_mixer.py"
$BeatPath = Join-Path -Path $BaseDir -ChildPath "output\$BeatFile"
$OutputPath = Join-Path -Path $BaseDir -ChildPath "output\$OutputFile"

Write-Host ">>> Vocal Mix (BPM: $BPM, Shift: $ShiftBeats beats)" -ForegroundColor Cyan

if (-not (Test-Path $BeatPath)) {
    Write-Error "❌ 비트 파일 없음: $BeatPath"
    exit
}

# 파이썬 실행 (--bpm, --shift 인자 전달)
python $PythonScript --track_id "$TargetTrackID" --beat "$BeatPath" --out "$OutputPath" --bpm $BPM --shift $ShiftBeats