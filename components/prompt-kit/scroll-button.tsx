"use client"

import * as React from "react"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ArrowDown } from "lucide-react"

export interface ScrollButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
    scrollRef?: React.RefObject<HTMLElement>
    containerRef?: React.RefObject<HTMLElement>
    threshold?: number
    variant?: "default" | "outline" | "ghost"
    size?: "default" | "sm" | "lg" | "icon"
}

export function ScrollButton({
    scrollRef,
    containerRef,
    threshold = 50,
    variant = "outline",
    size = "icon",
    className,
    children,
    ...props
}: ScrollButtonProps) {
    const [isVisible, setIsVisible] = React.useState(false)

    React.useEffect(() => {
        const container = containerRef?.current
        if (!container) return

        const handleScroll = () => {
            if (container.scrollHeight > container.clientHeight &&
                container.scrollTop < container.scrollHeight - container.clientHeight - threshold) {
                setIsVisible(true)
            } else {
                setIsVisible(false)
            }
        }

        container.addEventListener('scroll', handleScroll)
        return () => container.removeEventListener('scroll', handleScroll)
    }, [containerRef, threshold])

    const handleClick = (e: React.MouseEvent<HTMLButtonElement>) => {
        if (scrollRef?.current) {
            scrollRef.current.scrollIntoView({ behavior: 'smooth' })
        } else if (containerRef?.current) {
            containerRef.current.scrollTo({ top: containerRef.current.scrollHeight, behavior: 'smooth' })
        }
        props.onClick?.(e)
    }

    if (!isVisible) return null

    return (
        <Button
            variant={variant}
            size={size}
            onClick={handleClick}
            className={cn(
                "rounded-full shadow-md",
                className
            )}
            {...props}
        >
            {children || <ArrowDown className="h-4 w-4" />}
        </Button>
    )
}
