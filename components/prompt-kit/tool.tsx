"use client"

import * as React from "react"
import { useState } from "react"
import { cn } from "@/lib/utils"
import {
  Loader2,
  CheckCircle2,
  XCircle,
  Database,
  Search,
  Code,
  Terminal,
  FileText,
  Mail,
  Zap,
  Globe,
  Settings,
  ChevronDown,
  ChevronRight
} from "lucide-react"

export interface ToolPart {
  type: string
  state: "input-streaming" | "input-available" | "output-available" | "output-error"
  input?: any
  output?: any
  errorText?: string
}

interface ToolProps extends React.HTMLAttributes<HTMLDivElement> {
  toolPart: ToolPart
}

const ToolIconMap: Record<string, React.ComponentType<{ className?: string }>> = {
  database_query: Database,
  googleSearch: Search,
  file_search: FileText,
  api_call: Globe,
  code_execution: Code,
  email_send: Mail,
  terminal: Terminal,
  settings: Settings,
}

export function Tool({ className, toolPart, ...props }: ToolProps) {
  const [isOpen, setIsOpen] = useState(false)
  const Icon = ToolIconMap[toolPart.type] || Zap
  const isPending = toolPart.state === "input-streaming" || toolPart.state === "input-available"
  const isSuccess = toolPart.state === "output-available"
  const isError = toolPart.state === "output-error"

  return (
    <div
      className={cn(
        "rounded-lg border bg-card text-card-foreground shadow-sm w-full overflow-hidden text-sm my-2",
        className
      )}
      {...props}
    >
      {/* Header */}
      <div
        className="flex items-center gap-2 p-3 bg-muted/30 cursor-pointer hover:bg-muted/50 transition-colors"
        onClick={() => setIsOpen(!isOpen)}
      >
        <div className={cn(
          "flex items-center justify-center h-6 w-6 rounded-md",
          isPending && "bg-blue-500/10 text-blue-500",
          isSuccess && "bg-green-500/10 text-green-500",
          isError && "bg-red-500/10 text-red-500"
        )}>
          <Icon className="h-4 w-4" />
        </div>
        <div className="flex-1 font-medium truncate flex items-center gap-2">
          {toolPart.type}
          {isOpen ? <ChevronDown className="h-3 w-3 text-muted-foreground" /> : <ChevronRight className="h-3 w-3 text-muted-foreground" />}
        </div>
        <div className="text-muted-foreground">
          {isPending && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
          {isSuccess && <CheckCircle2 className="h-3.5 w-3.5 text-green-500" />}
          {isError && <XCircle className="h-3.5 w-3.5 text-red-500" />}
        </div>
      </div>

      {/* Content */}
      {isOpen && (
        <div className="p-3 space-y-3 font-mono text-xs animate-in fade-in slide-in-from-top-1 duration-200">
        {/* Input */}
        {toolPart.input && (
          <div className="space-y-1">
            <div className="text-muted-foreground uppercase text-[10px] tracking-wider font-semibold">
              Input
            </div>
            <pre className="bg-muted/50 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all">
              {JSON.stringify(toolPart.input, null, 2)}
            </pre>
          </div>
        )}

        {/* Output */}
        {isSuccess && toolPart.output && (
          <div className="space-y-1">
             <div className="text-muted-foreground uppercase text-[10px] tracking-wider font-semibold text-green-500/80">
              Output
            </div>
            <pre className="bg-green-500/5 border border-green-500/10 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all text-green-700 dark:text-green-300">
              {JSON.stringify(toolPart.output, null, 2)}
            </pre>
          </div>
        )}

        {/* Error */}
        {isError && toolPart.errorText && (
          <div className="space-y-1">
            <div className="text-muted-foreground uppercase text-[10px] tracking-wider font-semibold text-red-500/80">
              Error
            </div>
            <pre className="bg-red-500/5 border border-red-500/10 p-2 rounded-md overflow-x-auto whitespace-pre-wrap break-all text-red-700 dark:text-red-300">
              {toolPart.errorText}
            </pre>
          </div>
        )}
      </div>
      )}
    </div>
  )
}
