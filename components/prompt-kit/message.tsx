"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface MessageContextValue {
  role: "user" | "ai" | "system" | "function" | "data" | "tool"
}

const MessageContext = React.createContext<MessageContextValue>({ role: "ai" })

export interface MessageProps extends React.HTMLAttributes<HTMLDivElement> {
  role?: "user" | "ai" | "system" | "function" | "data" | "tool"
}

export function Message({ role = "ai", children, className, ...props }: MessageProps) {
  return (
    <MessageContext.Provider value={{ role }}>
      <div
        className={cn(
          "flex w-full gap-4 p-4",
          role === "user" ? "flex-row-reverse" : "flex-row",
          className
        )}
        {...props}
      >
        {children}
      </div>
    </MessageContext.Provider>
  )
}

export interface MessageContentProps extends React.HTMLAttributes<HTMLDivElement> {
    markdown?: boolean
    content?: string
}

export function MessageContent({ className, markdown, content, children, ...props }: MessageContentProps) {
  const { role } = React.useContext(MessageContext)

  const contentToRender = content || children

  return (
    <div
      className={cn(
        "flex-1 space-y-2 overflow-hidden",
        role === "user" ? "text-right" : "text-left",
        className
      )}
      {...props}
    >
      <div className={cn(
          "inline-block rounded-2xl px-4 py-3 text-sm",
          role === "user"
            ? "bg-zinc-800 text-zinc-100 rounded-tr-sm"
            : "text-zinc-300 px-0 py-0"
      )}>
        {markdown && typeof contentToRender === 'string' ? (
             <div className="prose prose-invert prose-p:leading-relaxed prose-pre:p-0 break-words text-sm max-w-none">
                <ReactMarkdown remarkPlugins={[remarkGfm]}>{contentToRender}</ReactMarkdown>
             </div>
        ) : (
             contentToRender
        )}
      </div>
    </div>
  )
}
