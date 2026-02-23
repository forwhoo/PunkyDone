"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { ChevronDown, Sparkles } from "lucide-react"

export function ChainOfThought({
  children,
  className,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("flex flex-col gap-2 my-4 w-full max-w-2xl", className)} {...props}>
      {children}
    </div>
  )
}

export function ChainOfThoughtStep({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  const [isOpen, setIsOpen] = React.useState(true)

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden transition-all duration-200",
        isOpen ? "ring-1 ring-primary/10" : "hover:bg-muted/50",
        className
      )}
      {...props}
    >
      {React.Children.map(children, (child) => {
        if (React.isValidElement(child) && child.type === ChainOfThoughtTrigger) {
          return React.cloneElement(child as React.ReactElement<any>, { isOpen, setIsOpen })
        }
        if (React.isValidElement(child) && child.type === ChainOfThoughtContent) {
          return isOpen ? child : null
        }
        return child
      })}
    </div>
  )
}

interface ChainOfThoughtTriggerProps extends React.HTMLAttributes<HTMLDivElement> {
  isOpen?: boolean
  setIsOpen?: (isOpen: boolean) => void
}

export function ChainOfThoughtTrigger({
  className,
  children,
  isOpen,
  setIsOpen,
  ...props
}: ChainOfThoughtTriggerProps) {
  return (
    <div
      role="button"
      onClick={() => setIsOpen?.(!isOpen)}
      className={cn(
        "flex w-full items-center justify-between px-4 py-3 text-sm font-medium transition-colors hover:bg-muted/50 cursor-pointer",
        className
      )}
      {...props}
    >
      <div className="flex items-center gap-2">
        <Sparkles className="h-4 w-4 text-amber-500" />
        <span className="truncate text-muted-foreground">{children}</span>
      </div>
      <ChevronDown
        className={cn(
          "h-4 w-4 shrink-0 transition-transform duration-200 text-muted-foreground",
          isOpen && "rotate-180"
        )}
      />
    </div>
  )
}

export function ChainOfThoughtContent({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div
      className={cn(
        "px-4 pb-4 pt-0 text-sm animate-in slide-in-from-top-2 fade-in duration-200",
        className
      )}
      {...props}
    >
      <div className="pl-6 border-l-2 border-muted space-y-2 mt-2">
        {children}
      </div>
    </div>
  )
}

export function ChainOfThoughtItem({
  className,
  children,
  ...props
}: React.HTMLAttributes<HTMLDivElement>) {
  return (
    <div className={cn("text-muted-foreground/80 leading-relaxed", className)} {...props}>
      {children}
    </div>
  )
}
