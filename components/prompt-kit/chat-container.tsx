"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

export const ChatContainerRoot = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex h-full w-full flex-col overflow-hidden", className)}
      {...props}
    >
      {children}
    </div>
  )
})
ChatContainerRoot.displayName = "ChatContainerRoot"

export const ChatContainerContent = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ children, className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("flex-1 overflow-y-auto px-4 py-4 scroll-smooth", className)}
      {...props}
    >
      {children}
    </div>
  )
})
ChatContainerContent.displayName = "ChatContainerContent"

export const ChatContainerScrollAnchor = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => {
  return (
    <div
      ref={ref}
      className={cn("h-px w-full", className)}
      {...props}
    />
  )
})
ChatContainerScrollAnchor.displayName = "ChatContainerScrollAnchor"
