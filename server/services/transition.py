# server/services/transition.py
# DJ Bridge Engine (Best Loop Extension)
# Strategy: Replace weak Outro with the extracted Best Loop from the same song.

import sys
import json
import os
import logging
import numpy as np
import librosa
import ffmpeg 
from scipy.spatial.distance import cdist

# ffmpeg.exe 경로 설정
current_dir = os.path.dirname(os.path.abspath(__file__))
if current_dir not in os.environ["PATH"]:
    os.environ["PATH"] += os.pathsep + current_dir

sys.stdout.reconfigure(encoding='utf-8')
sys.stderr.reconfigure(encoding='utf-8')

logging.basicConfig(level=logging.INFO, stream=sys.stderr)
logger = logging.getLogger(__name__)

# --- [Function 1] Best Loop Finder (Internal) ---
def find_best_loop_interval(file_path, bars=4):
    """
    오디오 파일을 분석하여 가장 반복적인 4마디 구간의 (시작, 끝) 시간을 반환
    """
    try:
        y, sr = librosa.load(file_path, sr=22050) # 속도를 위해 22k로 분석
        tempo, beat_frames = librosa.beat.beat_track(y=y, sr=sr)
        beat_samples = librosa.frames_to_samples(beat_frames)
        
        beats_per_loop = 4 * bars # 4마디 = 16박자
        
        if len(beat_samples) < beats_per_loop + 1:
            return 0, 0 # 실패 시 0초 반환

        loops_specs = []
        loop_intervals = []

        # 1마디(4박자) 간격으로 윈도우 이동하며 4마디(16박자) 구간 분석
        for i in range(0, len(beat_samples) - beats_per_loop, 4):
            start = beat_samples[i]
            end = beat_samples[i + beats_per_loop]
            
            segment = y[start:end]
            if len(segment) < sr * 2.0: continue

            mels = librosa.feature.melspectrogram(y=segment, sr=sr, n_mels=128)
            mels_resized = librosa.util.fix_length(mels, size=128, axis=1) # 해상도 낮춰서 빠른 비교
            loops_specs.append(mels_resized.flatten())
            loop_intervals.append((start/sr, end/sr)) # 초 단위 저장

        if not loops_specs:
            return 0, 0

        # 유사도 분석
        stack = np.array(loops_specs)
        mean_pattern = np.mean(stack, axis=0).reshape(1, -1)
        distances = cdist(stack, mean_pattern, metric='euclidean')
        best_idx = np.argmin(distances)
        
        return loop_intervals[best_idx] # (Start_Time, End_Time) 반환

    except Exception as e:
        logger.warning(f"Loop analysis failed: {e}")
        return 0, 0

# --- [Function 2] Main Blender ---
def create_blend_sequence(source_layers, target_layers, source_analysis, target_analysis, bars=4):
    try:
        logger.info(f"🎛️ 스마트 트랜지션 시작 (Outro 교체 모드, {bars}마디)")
        
        base_dir = os.getcwd() 
        def resolve_path(p):
            if not os.path.isabs(p): return os.path.join(base_dir, p)
            return p

        for l in [source_layers, target_layers]:
            for k, v in l.items(): l[k] = resolve_path(v)

        # 1. 정보 계산
        bpm_a = float(source_analysis.get('bpm', 120))
        bpm_b = float(target_analysis.get('bpm', 120))
        
        sec_per_bar_a = (60 / bpm_a) * 4
        sec_per_bar_b = (60 / bpm_b) * 4
        
        bridge_duration = sec_per_bar_a * bars
        b_intro_duration = sec_per_bar_b * bars
        
        # 2. 곡 A 길이 측정 (Outro 시점을 알기 위해)
        def get_dur(p):
            try: return float(ffmpeg.probe(p)['format']['duration'])
            except: return 0.0
            
        dur_a = 0
        for p in source_layers.values():
            d = get_dur(p)
            if d > dur_a: dur_a = d
            
        # 3. ★ 핵심: Song A의 Best Loop 구간 찾기 ★
        # 드럼 트랙을 기준으로 분석합니다.
        loop_start, loop_end = find_best_loop_interval(source_layers['drums'], bars=bars)
        loop_len = loop_end - loop_start
        
        if loop_len == 0:
            logger.warning("⚠️ 루프 찾기 실패. 일반 Outro로 대체합니다.")
            loop_start = max(0, dur_a - bridge_duration)
            loop_len = bridge_duration

        logger.info(f"🔍 Song A Best Loop 발견: {loop_start:.2f}초 ~ {loop_end:.2f}초 (길이: {loop_len:.2f}s)")

        # -------------------------------------------------------------------
        # [PART 1] Song A Body
        # Outro가 나오기 전까지만 재생 (Best Loop로 교체할 거니까)
        # -------------------------------------------------------------------
        cutoff_point = max(0, dur_a - bridge_duration)
        
        part1_inputs = [ffmpeg.input(source_layers[k]).filter('atrim', end=cutoff_point).filter('asetpts', 'PTS-STARTPTS') 
                        for k in ['vocals','drums','bass','other']]
        part1_mix = ffmpeg.filter(part1_inputs, 'amix', inputs=4, duration='shortest', dropout_transition=0)

        # -------------------------------------------------------------------
        # [PART 2] Bridge (Replacement)
        # 배경: Song A의 Best Loop (Outro 아님!)
        # 전경: Song B의 Intro Teaser (No Vocals)
        # -------------------------------------------------------------------
        
        # (A) Loop Background (Drums + Bass + Other)
        # Vocals는 뺍니다 (Loop 구간에 가사가 있으면 어색할 수 있음, 보통 Inst Loop 선호)
        bridge_bg_inputs = []
        for k in ['drums', 'bass', 'other']:
            # loop_start 지점에서 loop_len 만큼 잘라내기
            stream = ffmpeg.input(source_layers[k]).filter('atrim', start=loop_start, duration=loop_len).filter('asetpts', 'PTS-STARTPTS')
            
            # 만약 브릿지가 루프보다 길면(거의 없겠지만), 루핑 처리 (여기선 1회만 사용 가정)
            bridge_bg_inputs.append(stream)
            
        bridge_bg_mix = ffmpeg.filter(bridge_bg_inputs, 'amix', inputs=3, duration='longest', dropout_transition=0)
        
        # 길이가 모자라면 강제로 맞춤 (atrim이나 apad 사용 가능하지만, beat detection이 정확하면 거의 맞음)

        # (B) Teaser Foreground (Song B Intro - No Vocals, No Drums)
        # Song A의 BPM에 맞춰 Time Stretch
        tempo_factor = bpm_a / bpm_b
        bridge_fg_inputs = []
        
        for k in ['bass', 'other']: # 드럼도 B곡 꺼는 뺌 (A 루프 드럼을 살리기 위해)
            stream = ffmpeg.input(target_layers[k]).filter('atrim', start=0, duration=b_intro_duration).filter('asetpts', 'PTS-STARTPTS')
            
            # Time Stretch
            ratio = tempo_factor
            while ratio > 2.0: stream = stream.filter('atempo', 2.0); ratio /= 2.0
            while ratio < 0.5: stream = stream.filter('atempo', 0.5); ratio /= 0.5
            if abs(ratio - 1.0) > 0.01: stream = stream.filter('atempo', ratio)
            
            bridge_fg_inputs.append(stream)
            
        bridge_fg_mix = ffmpeg.filter(bridge_fg_inputs, 'amix', inputs=2, duration='longest', dropout_transition=0)

        # Bridge Combine
        part2_mix = ffmpeg.filter([bridge_bg_mix, bridge_fg_mix], 'amix', inputs=2, duration='first', dropout_transition=0)

        # -------------------------------------------------------------------
        # [PART 3] Song B Start
        # -------------------------------------------------------------------
        part3_inputs = []
        for k in ['drums', 'bass', 'other', 'vocals']:
            part3_inputs.append(
                ffmpeg.input(target_layers[k])
                .filter('atrim', start=0) # 처음부터 다시 시작
                .filter('asetpts', 'PTS-STARTPTS')
            )
        part3_mix = ffmpeg.filter(part3_inputs, 'amix', inputs=4, duration='longest', dropout_transition=0)

        # -------------------------------------------------------------------
        # [FINAL] Concat
        # -------------------------------------------------------------------
        final_output = ffmpeg.filter(
            [part1_mix, part2_mix, part3_mix],
            'concat', n=3, v=0, a=1
        )

        output_dir = os.path.join(base_dir, 'server', 'output', 'blends')
        os.makedirs(output_dir, exist_ok=True)
        output_filename = f"smart_trans_{bars}bars_{int(bpm_a)}.mp3"
        output_path = os.path.join(output_dir, output_filename)
        
        logger.info(f"💾 렌더링 시작: {output_path}")
        ffmpeg.output(final_output, output_path, audio_bitrate='320k', acodec='libmp3lame').overwrite_output().run(quiet=True)
        
        return output_path

    except Exception as e:
        logger.error(f"Error: {str(e)}")
        raise

if __name__ == '__main__':
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No input"}))
        sys.exit(1)
    
    try:
        input_arg = sys.argv[1]
        if os.path.isfile(input_arg):
            with open(input_arg, 'r', encoding='utf-8') as f: args = json.load(f)
        else:
            args = json.loads(input_arg)
        
        bars = int(args.get('blendPoint', 4)) # 기본 4마디
        
        output_path = create_blend_sequence(
            args['sourceLayers'], args['targetLayers'],
            args['sourceAnalysis'], args['targetAnalysis'],
            bars
        )
        print(json.dumps({"success": True, "outputPath": output_path}, ensure_ascii=False))
        
    except Exception as e:
        print(json.dumps({"success": False, "error": str(e)}, ensure_ascii=False))
        sys.exit(1)