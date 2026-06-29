import * as React from "react"
import {  Dialog,
  DialogContent,
  DialogHeader,
  DialogFooter,
  DialogTitle,
  DialogDescription } from "../ui/dialog"

interface BaseModalProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  title?: string
  description?: string
  children?: React.ReactNode
  footer?: React.ReactNode
  width: number
  height: number
  background?:string
}

export function BaseModal({
  open,
  onOpenChange,
  title,
  description,
  children,
  footer,
  width,
  height,
  background
}: BaseModalProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        style={{
          width: "500vw",
          maxWidth: width + "px",
          height: height + "px",
          background: background,
          zIndex: 1000,
          display: "flex",
          flexDirection: "column",
          overflow: "hidden",
        }}
      >
        {(title || description) && (
          <DialogHeader className="shrink-0">
            {title && <DialogTitle className="text-foreground">{title}</DialogTitle>}
            {description && (
              <DialogDescription>{description}</DialogDescription>
            )}
          </DialogHeader>
        )}

        <div className="py-4 overflow-y-auto flex-1 min-h-0">{children}</div>
      </DialogContent>
    </Dialog>
  )
}








