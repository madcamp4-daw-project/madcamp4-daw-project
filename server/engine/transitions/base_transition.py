from abc import ABC, abstractmethod
from engine.dsp.filters import EQFilter
from engine.dsp.time_stretch import TimeStretcher
from engine.dsp.effects import AudioEffects

class BaseTransition(ABC):
    """
    [Abstract Base Class]
    모든 트랜지션 전략이 상속받아야 하는 기본 규격입니다.
    공통적으로 사용하는 DSP 도구(EQ, TimeStretch, FX)를 미리 초기화합니다.
    """

    def __init__(self, sr=44100):
        self.sr = sr
        # 자식 클래스에서 self.eq, self.ts, self.fx 로 바로 사용 가능
        self.eq = EQFilter(sr)
        self.ts = TimeStretcher(sr)
        self.fx = AudioEffects(sr)

    @abstractmethod
    def process(self, data_a, data_b, **kwargs):
        """
        실제 믹싱 로직을 구현해야 하는 추상 메서드.
        모든 자식 클래스는 이 함수를 반드시 가지고 있어야 함.
        
        :param data_a: Analyzer가 분석한 Track A 데이터 (dict)
        :param data_b: Analyzer가 분석한 Track B 데이터 (dict)
        :return: Mixed Audio (numpy array)
        """
        pass