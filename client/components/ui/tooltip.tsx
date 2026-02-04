"use client";

import * as React from "react";
import * as TooltipPrimitive from "@radix-ui/react-tooltip";
import { cn } from "@/lib/utils";

/**
 * 툴 컴포넌트 프로바이더
 */
const TooltipProvider = TooltipPrimitive.Provider;

/**
 * 툴팁 루트
 */
const Tooltip = TooltipPrimitive.Root;

/**
 * 툴팁 트리거
 */
const TooltipTrigger = TooltipPrimitive.Trigger;

/**
 * 툴팁 컨텐츠
 */
const TooltipContent = React.forwardRef<
  React.ElementRef<typeof TooltipPrimitive.Content>,
  React.ComponentPropsWithoutRef<typeof TooltipPrimitive.Content>
>(({ className, sideOffset = 4, ...props }, ref) => (
  <TooltipPrimitive.Content
    ref={ref}
    sideOffset={sideOffset}
    className={cn(
      "z-50 overflow-hidden rounded-md border bg-popover px-3 py-1.5 text-sm text-popover-foreground shadow-md animate-in fade-in-0 zoom-in-95 data-[state=closed]:animate-out data-[state=closed]:fade-out-0 data-[state=closed]:zoom-out-95 data-[side=bottom]:slide-in-from-top-2 data-[side=left]:slide-in-from-right-2 data-[side=right]:slide-in-from-left-2 data-[side=top]:slide-in-from-bottom-2",
      className
    )}
    {...props}
  />
));
TooltipContent.displayName = TooltipPrimitive.Content.displayName;

/**
 * 한국어 툴팁 래퍼 컴포넌트
 * 모든 버튼/기능에 상세한 한국어 설명을 제공
 */
interface TooltipWrapperProps {
  content: string;           // 툴팁 텍스트 (한국어)
  shortcut?: string;         // 키보드 단축키
  children: React.ReactNode;
  side?: "top" | "bottom" | "left" | "right";
  delayDuration?: number;
}

export function TooltipWrapper({
  content,
  shortcut,
  children,
  side = "top",
  delayDuration = 300,
}: TooltipWrapperProps) {
  return (
    <Tooltip delayDuration={delayDuration}>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent
        side={side}
        className="max-w-xs bg-[#1a1a2e] border-[#3a3a4f] text-white"
      >
        <p className="text-sm">{content}</p>
        {shortcut && (
          <p className="text-xs text-gray-400 mt-1">
            단축키: <kbd className="px-1 py-0.5 bg-[#2a2a3f] rounded text-xs">{shortcut}</kbd>
          </p>
        )}
      </TooltipContent>
    </Tooltip>
  );
}

export { Tooltip, TooltipTrigger, TooltipContent, TooltipProvider };
