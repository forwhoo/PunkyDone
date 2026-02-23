import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import {
  Empty,
  EmptyContent,
  EmptyDescription,
  EmptyHeader,
  EmptyMedia,
  EmptyTitle,
} from "@/components/ui/empty"
import { PlusIcon } from "lucide-react"

interface EmptyAvatarGroupProps {
    title?: string;
    description?: string;
    actionLabel?: string;
    onAction?: () => void;
}

export function EmptyAvatarGroup({
    title = "No Data Available",
    description = "We couldn't find enough data to display this section.",
    actionLabel = "Refresh Data",
    onAction
}: EmptyAvatarGroupProps) {
  return (
    <Empty>
      <EmptyHeader>
        <EmptyMedia>
          <div className="flex -space-x-2 justify-center">
            <Avatar className="ring-2 ring-background grayscale">
              <AvatarImage src="https://github.com/shadcn.png" alt="@shadcn" />
              <AvatarFallback>CN</AvatarFallback>
            </Avatar>
            <Avatar className="ring-2 ring-background grayscale opacity-70">
              <AvatarImage
                src="https://github.com/maxleiter.png"
                alt="@maxleiter"
              />
              <AvatarFallback>LR</AvatarFallback>
            </Avatar>
            <Avatar className="ring-2 ring-background grayscale opacity-40">
              <AvatarImage
                src="https://github.com/evilrabbit.png"
                alt="@evilrabbit"
              />
              <AvatarFallback>ER</AvatarFallback>
            </Avatar>
          </div>
        </EmptyMedia>
        <EmptyTitle>{title}</EmptyTitle>
        <EmptyDescription>
          {description}
        </EmptyDescription>
      </EmptyHeader>
      {onAction && (
          <EmptyContent>
            <Button size="sm" onClick={onAction} className="gap-2">
              <PlusIcon className="w-4 h-4" />
              {actionLabel}
            </Button>
          </EmptyContent>
      )}
    </Empty>
  )
}
