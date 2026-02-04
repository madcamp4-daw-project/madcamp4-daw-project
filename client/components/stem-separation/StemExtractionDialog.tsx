"use client";

import React, { useState, useCallback } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Progress } from "@/components/ui/progress";
import { Loader2 } from "lucide-react";
import type { StemExtractionOptions, StemJobStatus } from "@/lib/api/stemSeparation";
import {
  mockUploadForSeparation,
  mockCheckStatus,
} from "@/lib/api/stemSeparation";

/**
 * FL Studio 스타일 Stem 추출 다이얼로그 Props
 */
interface StemExtractionDialogProps {
  isOpen: boolean;                    // 다이얼로그 열림 상태
  onClose: () => void;                // 닫기 콜백
  onExtract: (stems: StemJobStatus['stems']) => void; // 추출 완료 콜백
  fileName?: string;                  // 원본 파일명
  audioFile?: File;                   // 추출할 오디오 파일
}

/**
 * FL Studio 21.2 스타일 "Extract stems from sample" 다이얼로그
 * Drums, Bass, Vocals, Instruments 4개 스템 추출 옵션 제공
 */
export function StemExtractionDialog({
  isOpen,
  onClose,
  onExtract,
  fileName = "Sample",
  audioFile,
}: StemExtractionDialogProps) {
  // 스템 선택 상태
  const [stems, setStems] = useState({
    drums: true,
    bass: true,
    vocals: true,
    instruments: true,
  });

  // CPU 제한 옵션
  const [limitCpu, setLimitCpu] = useState(false);

  // 완료 후 동작 선택
  const [afterAction, setAfterAction] = useState<StemExtractionOptions["afterAction"]>("mute_clip");

  // 처리 상태
  const [isProcessing, setIsProcessing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState("");

  /**
   * 개별 스템 토글 핸들러
   */
  const toggleStem = useCallback((stem: keyof typeof stems) => {
    setStems((prev) => ({ ...prev, [stem]: !prev[stem] }));
  }, []);

  /**
   * 추출 시작 핸들러
   */
  const handleExtract = useCallback(async () => {
    // 최소 1개 스템 선택 확인
    if (!stems.drums && !stems.bass && !stems.vocals && !stems.instruments) {
      alert("최소 1개의 스템을 선택해주세요.");
      return;
    }

    setIsProcessing(true);
    setProgress(0);
    setStatusMessage("업로드 중...");

    try {
      // Mock API 호출 (백엔드 연동 시 실제 API로 교체)
      const file = audioFile || new File([""], "test.wav");
      const response = await mockUploadForSeparation(file, {
        stems,
        limitCpu,
        afterAction,
      });

      setStatusMessage("처리 중...");

      // 진행 상태 폴링
      let currentProgress = 0;
      while (currentProgress < 100) {
        const status = await mockCheckStatus(response.jobId, currentProgress);
        currentProgress = status.progress;
        setProgress(status.progress);
        setStatusMessage(status.message || `처리 중... ${status.progress}%`);

        if (status.status === "completed" && status.stems) {
          setStatusMessage("완료!");
          onExtract(status.stems);
          setTimeout(() => {
            setIsProcessing(false);
            onClose();
          }, 500);
          return;
        }

        if (status.status === "failed") {
          throw new Error(status.error || "처리 실패");
        }
      }
    } catch (error) {
      console.error("Stem extraction failed:", error);
      setStatusMessage("오류가 발생했습니다.");
      setIsProcessing(false);
    }
  }, [stems, limitCpu, afterAction, audioFile, onExtract, onClose]);

  /**
   * 스템 체크박스 컴포넌트
   */
  const StemCheckbox = ({
    id,
    label,
    checked,
    onChange,
  }: {
    id: string;
    label: string;
    checked: boolean;
    onChange: () => void;
  }) => (
    <div className="flex items-center space-x-2">
      {/* FL Studio 스타일 빨간 원형 체크박스 */}
      <button
        onClick={onChange}
        className={`w-4 h-4 rounded-full border-2 transition-colors ${
          checked
            ? "bg-red-500 border-red-500"
            : "bg-transparent border-gray-500"
        }`}
        disabled={isProcessing}
        aria-label={label}
      />
      <Label
        htmlFor={id}
        className="text-sm text-gray-300 cursor-pointer select-none"
        onClick={onChange}
      >
        {label}
      </Label>
    </div>
  );

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="bg-[#2a2a2a] border-[#3a3a3a] text-white max-w-md">
        <DialogHeader>
          <DialogTitle className="text-lg font-medium">
            Extract stems from sample
          </DialogTitle>
        </DialogHeader>

        <div className="py-4 space-y-6">
          {/* 스템 선택 그리드 (2x2) */}
          <div className="grid grid-cols-2 gap-4">
            <StemCheckbox
              id="drums"
              label="Drums"
              checked={stems.drums}
              onChange={() => toggleStem("drums")}
            />
            <StemCheckbox
              id="bass"
              label="Bass"
              checked={stems.bass}
              onChange={() => toggleStem("bass")}
            />
            <StemCheckbox
              id="instruments"
              label="Instruments"
              checked={stems.instruments}
              onChange={() => toggleStem("instruments")}
            />
            <StemCheckbox
              id="vocals"
              label="Vocals"
              checked={stems.vocals}
              onChange={() => toggleStem("vocals")}
            />
          </div>

          {/* CPU 제한 옵션 */}
          <div className="flex items-center space-x-2">
            <Checkbox
              id="limitCpu"
              checked={limitCpu}
              onCheckedChange={(checked) => setLimitCpu(!!checked)}
              disabled={isProcessing}
              className="border-gray-500 data-[state=checked]:bg-gray-600"
            />
            <Label
              htmlFor="limitCpu"
              className="text-sm text-gray-400 cursor-pointer"
            >
              Limit CPU usage
            </Label>
          </div>

          {/* 완료 후 동작 선택 */}
          <div className="flex items-center space-x-4">
            <Select
              value={afterAction}
              onValueChange={(value) =>
                setAfterAction(value as StemExtractionOptions["afterAction"])
              }
              disabled={isProcessing}
            >
              <SelectTrigger className="w-[180px] bg-[#1e1e1e] border-[#3a3a3a] text-white">
                <SelectValue placeholder="When done" />
              </SelectTrigger>
              <SelectContent className="bg-[#2a2a2a] border-[#3a3a3a]">
                <SelectItem
                  value="mute_clip"
                  className="text-white hover:bg-[#3a3a3a]"
                >
                  Mute source clip
                </SelectItem>
                <SelectItem
                  value="mute_track"
                  className="text-white hover:bg-[#3a3a3a]"
                >
                  Mute source track
                </SelectItem>
                <SelectItem
                  value="nothing"
                  className="text-white hover:bg-[#3a3a3a]"
                >
                  Do nothing
                </SelectItem>
              </SelectContent>
            </Select>
            <span className="text-sm text-gray-400">When done</span>
          </div>

          {/* 진행 상태 표시 */}
          {isProcessing && (
            <div className="space-y-2">
              <Progress value={progress} className="h-2 bg-[#1e1e1e]" />
              <p className="text-sm text-gray-400 text-center">
                {statusMessage}
              </p>
            </div>
          )}
        </div>

        <DialogFooter className="flex justify-end space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            disabled={isProcessing}
            className="bg-transparent border-[#3a3a3a] text-gray-300 hover:bg-[#3a3a3a]"
          >
            Cancel
          </Button>
          <Button
            onClick={handleExtract}
            disabled={isProcessing}
            className="bg-[#3a3a3a] hover:bg-[#4a4a4a] text-white"
          >
            {isProcessing ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                Processing...
              </>
            ) : (
              "Extract"
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

export default StemExtractionDialog;
