"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export interface LoaderProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?:
    | "circular"
    | "classic"
    | "pulse"
    | "pulse-dot"
    | "dots"
    | "typing"
    | "wave"
    | "bars"
    | "terminal"
    | "text-blink"
    | "text-shimmer"
    | "loading-dots"
  size?: "sm" | "md" | "lg"
  text?: string
}

export function Loader({
  variant = "circular",
  size = "md",
  text,
  className,
  ...props
}: LoaderProps) {
  const sizeClasses = {
    sm: "w-4 h-4",
    md: "w-6 h-6",
    lg: "w-8 h-8",
  }

  const textSizeClasses = {
    sm: "text-sm",
    md: "text-base",
    lg: "text-lg",
  }

  if (variant === "text-shimmer") {
    return (
      <div
        className={cn(
          "font-medium bg-clip-text text-transparent bg-[linear-gradient(110deg,#939393,45%,#fff,55%,#939393)] bg-[length:250%_100%] animate-shimmer-text",
          textSizeClasses[size],
          className
        )}
        style={{
             animation: "shimmer-text 2s linear infinite"
        }}
        {...props}
      >
        {text || "Thinking..."}
      </div>
    )
  }

  if (variant === "typing") {
      return (
          <div className={cn("flex space-x-1", className)} {...props}>
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-[typing_1s_ease-in-out_infinite]" style={{ animationDelay: '0ms' }}></div>
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-[typing_1s_ease-in-out_infinite]" style={{ animationDelay: '200ms' }}></div>
              <div className="w-1.5 h-1.5 bg-current rounded-full animate-[typing_1s_ease-in-out_infinite]" style={{ animationDelay: '400ms' }}></div>
          </div>
      )
  }

  // Default circular
  return (
    <div
      className={cn(
        "animate-spin rounded-full border-2 border-current border-t-transparent",
        sizeClasses[size],
        className
      )}
      {...props}
    >
      <span className="sr-only">Loading...</span>
    </div>
  )
}
