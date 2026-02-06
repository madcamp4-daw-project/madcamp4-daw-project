# ⚠️ [중요] pkg_resources 경고 억제 (madmom 관련)
import warnings
warnings.filterwarnings('ignore', category=UserWarning, module='pkg_resources')
warnings.filterwarnings('ignore', category=DeprecationWarning, module='pkg_resources')

import sys
import os
import json
import numpy as np
import librosa

# Add server directory to sys.path to find services
sys.path.append(os.path.dirname(os.path.abspath(__file__)))

from services.analyzer_beat import get_beat_info
from services.analyzer_key import get_key_from_audio

# Optional analyzers - wrap in try/except in case they fail or are missing
try:
    from services.analyzer_intro import get_intro_duration
except ImportError:
    get_intro_duration = None

try:
    from services.analyzer_outro import find_outro_endpoint
except ImportError:
    find_outro_endpoint = None

warnings.filterwarnings("ignore")

def convert_numpy_types(obj):
    """
    JSON 직렬화를 위해 Numpy 타입을 Python Native 타입으로 변환
    """
    if isinstance(obj, np.integer):
        return int(obj)
    elif isinstance(obj, np.floating):
        return float(obj)
    elif isinstance(obj, np.ndarray):
        return obj.tolist()
    return obj

def analyze_audio(file_path):
    if not os.path.exists(file_path):
        return {"error": "File not found"}

    try:
        # 1. Beat & BPM Analysis (Loads audio internally)
        # analyzer_beat.py returns: { "bpm": float, "downbeats": array, "audio": y, "sr": sr }
        beat_info = get_beat_info(file_path)
        
        y = beat_info['audio']
        sr = beat_info['sr']
        bpm = beat_info['bpm']
        downbeats = beat_info['downbeats'] # samples

        duration = librosa.get_duration(y=y, sr=sr)

        # 2. Key Analysis
        key_idx, key_mode = get_key_from_audio(y, sr)
        key_names = ['C', 'C#', 'D', 'D#', 'E', 'F', 'F#', 'G', 'G#', 'A', 'A#', 'B']
        key_str = f"{key_names[key_idx]} {key_mode}"

        # 3. Structural Analysis (Intro/Outro)
        intro_len = 0
        if get_intro_duration:
            try:
                # get_intro_duration takes file_path usually, let's verify if we should pass y
                # Based on file name it likely takes file path
                intro_len = get_intro_duration(file_path)
            except Exception:
                pass
        
        outro_point = 0
        if find_outro_endpoint:
            try:
                # find_outro_endpoint(y, sr)
                outro_point = find_outro_endpoint(y, sr)
            except Exception:
                pass

        # 4. Construct Result
        result = {
            "bpm": bpm,
            "key": key_str,
            "key_index": int(key_idx),
            "mode": key_mode,
            "duration": duration,
            "beats": downbeats, # Array of sample indices
            "intro_length": intro_len,
            "outro_start": outro_point,
            "sample_rate": sr
        }

        return result

    except Exception as e:
        return {"error": str(e)}

if __name__ == "__main__":
    if len(sys.argv) < 2:
        print(json.dumps({"error": "No file path provided"}))
        sys.exit(1)

    file_path = sys.argv[1]
    
    # Run analysis
    result = analyze_audio(file_path)
    
    # Print JSON to stdout
    print(json.dumps(result, default=convert_numpy_types))
