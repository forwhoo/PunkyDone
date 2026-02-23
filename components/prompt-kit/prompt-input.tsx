"use client"

import * as React from "react"
import { cn } from "@/lib/utils"

interface PromptInputProps extends React.HTMLAttributes<HTMLDivElement> {
    value?: string
    onValueChange?: (value: string) => void
    onSubmit?: () => void
    isLoading?: boolean
    maxHeight?: number | string
    children?: React.ReactNode
}

export const PromptInputContext = React.createContext<{
    onSubmit?: () => void
    isLoading?: boolean
    value?: string
    setValue?: (value: string) => void
}>({})

export function PromptInput({
    children,
    value,
    onValueChange,
    onSubmit,
    isLoading,
    maxHeight,
    className,
    ...props
}: PromptInputProps) {
    return (
        <PromptInputContext.Provider value={{ onSubmit, isLoading, value, setValue: onValueChange }}>
            <div
                className={cn(
                    "relative flex w-full items-end overflow-hidden rounded-xl border border-input bg-background shadow-sm focus-within:ring-1 focus-within:ring-ring",
                    className
                )}
                {...props}
            >
                {children}
            </div>
        </PromptInputContext.Provider>
    )
}

export function PromptInputTextarea({
    className,
    placeholder,
    ...props
}: React.TextareaHTMLAttributes<HTMLTextAreaElement>) {
    const { onSubmit, value, setValue } = React.useContext(PromptInputContext)
    const textareaRef = React.useRef<HTMLTextAreaElement>(null)

    React.useEffect(() => {
        if (textareaRef.current) {
            textareaRef.current.style.height = "auto"
            textareaRef.current.style.height = `${textareaRef.current.scrollHeight}px`
        }
    }, [value])

    const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
        if (e.key === "Enter" && !e.shiftKey) {
            e.preventDefault()
            onSubmit?.()
        }
        props.onKeyDown?.(e)
    }

    const handleChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        setValue?.(e.target.value)
        props.onChange?.(e)
    }

    return (
        <textarea
            ref={textareaRef}
            className={cn(
                "flex max-h-[200px] min-h-[44px] w-full resize-none bg-transparent px-4 py-3 text-sm placeholder:text-muted-foreground focus:outline-none disabled:cursor-not-allowed disabled:opacity-50 no-scrollbar",
                className
            )}
            placeholder={placeholder}
            value={value}
            onChange={handleChange}
            onKeyDown={handleKeyDown}
            rows={1}
            {...props}
        />
    )
}

export function PromptInputActions({
    children,
    className,
    ...props
}: React.HTMLAttributes<HTMLDivElement>) {
    return (
        <div className={cn("flex items-center gap-2 p-2", className)} {...props}>
            {children}
        </div>
    )
}
