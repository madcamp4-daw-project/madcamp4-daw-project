# logic/selector.py (예시 로직)
def select_transition_strategy(track_a_info, track_b_info):
    bpm_diff = abs(track_a_info['bpm'] - track_b_info['bpm'])
    
    # 규칙 1: BPM 차이가 5% 미만이면 자연스럽게 섞기 (Transition A)
    if bpm_diff / track_a_info['bpm'] < 0.05:
        return "BLEND_MIX"
    
    # 규칙 2: BPM 차이가 크거나 장르가 급격히 바뀌면 끊고 가기 (Transition B)
    else:
        return "DROP_MIX"