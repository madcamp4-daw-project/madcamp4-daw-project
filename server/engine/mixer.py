from engine.transitions.blend_mix import BlendMixStrategy
from engine.transitions.drop_mix import DropMixStrategy

class AutoDJMixer:
    """
    [Main Engine]
    요청된 모드(Mode)에 따라 적절한 Transition Strategy를 선택하고 실행합니다.
    """
    
    # 지원하는 모드 목록
    STRATEGIES = {
        "BLEND": BlendMixStrategy,
        "DROP": DropMixStrategy
    }

    def __init__(self, sr=44100):
        self.sr = sr

    def mix(self, data_a, data_b, mode="BLEND", **kwargs):
        """
        두 트랙 데이터를 받아 믹싱합니다.
        :param mode: "BLEND" or "DROP"
        """
        mode = mode.upper()
        
        # 1. 전략 선택 (Factory Pattern)
        strategy_class = self.STRATEGIES.get(mode)
        
        if not strategy_class:
            # 기본값 설정 혹은 에러 처리
            print(f"⚠️ Unknown Mode '{mode}', defaulting to BLEND")
            strategy_class = BlendMixStrategy
        
        print(f"🎚️ Mixer: Selected Strategy -> [{mode}]")
        
        # 2. 전략 인스턴스 생성
        mixer_strategy = strategy_class(sr=self.sr)
        
        # 3. 실행 (Process)
        try:
            final_mix = mixer_strategy.process(data_a, data_b, **kwargs)
            return final_mix
            
        except Exception as e:
            print(f"❌ Mixing Error: {str(e)}")
            # 에러 발생 시 원본 연결해서 반환 (비상 대책)
            import numpy as np
            return np.concatenate((data_a['audio'], data_b['audio']))