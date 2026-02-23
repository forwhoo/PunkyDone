"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface SourceContextValue {
  showFavicon?: boolean
}

const SourceContext = React.createContext<SourceContextValue>({})

interface SourceProps extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string
  showFavicon?: boolean
}

export function Source({
  children,
  className,
  href,
  showFavicon = true,
  ...props
}: SourceProps) {
  return (
    <SourceContext.Provider value={{ showFavicon }}>
      <a
        href={href}
        target="_blank"
        rel="noopener noreferrer"
        className={cn(
          "group relative flex w-full max-w-xs flex-col gap-2 overflow-hidden rounded-lg border bg-background p-3 hover:bg-muted/50 transition-colors",
          className
        )}
        {...props}
      >
        {children}
      </a>
    </SourceContext.Provider>
  )
}

interface SourceTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  label?: React.ReactNode
  showFavicon?: boolean
}

export function SourceTrigger({
  className,
  label,
  showFavicon: showFaviconProp,
  ...props
}: SourceTriggerProps) {
  const { showFavicon: contextShowFavicon } = React.useContext(SourceContext)
  const showFavicon = showFaviconProp ?? contextShowFavicon

  return (
    <div
      className={cn("flex items-center gap-2 text-xs text-muted-foreground", className)}
      {...props}
    >
      {showFavicon && (
        <div className="h-4 w-4 rounded-sm bg-muted" />
      )}
      <span className="truncate font-medium text-foreground">{label}</span>
    </div>
  )
}

interface SourceContentProps extends React.HTMLAttributes<HTMLDivElement> {
  title?: string
  description?: string
}

export function SourceContent({
  className,
  title,
  description,
  children,
  ...props
}: SourceContentProps) {
  return (
    <div className={cn("flex flex-col gap-1", className)} {...props}>
      {title && (
        <h4 className="line-clamp-1 text-sm font-medium leading-none tracking-tight">
          {title}
        </h4>
      )}
      {description && (
        <p className="line-clamp-2 text-xs text-muted-foreground">
          {description}
        </p>
      )}
      {children}
    </div>
  )
}
