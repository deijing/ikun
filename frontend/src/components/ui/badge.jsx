import * as React from "react"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-bold transition-colors focus:outline-none focus:ring-2 focus:ring-ring focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-primary-foreground hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-secondary-foreground hover:bg-secondary/80",
        destructive:
          "border-transparent bg-destructive text-destructive-foreground hover:bg-destructive/80",
        outline: "text-foreground",
        success:
          "border-transparent bg-emerald-100 text-emerald-700 dark:bg-emerald-900/20 dark:text-emerald-300",
        warning:
          "border-transparent bg-amber-100 text-amber-700 dark:bg-amber-900/20 dark:text-amber-300",
        info:
          "border-transparent bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-300",
        // 身份专属徽章
        admin:
          "border-transparent bg-gradient-to-r from-red-500 to-orange-500 text-white shadow-sm shadow-red-500/20",
        reviewer:
          "border-transparent bg-gradient-to-r from-emerald-500 to-teal-600 text-white shadow-sm shadow-emerald-500/20",
        contestant:
          "border-transparent bg-gradient-to-r from-blue-500 to-cyan-500 text-white shadow-sm shadow-blue-500/20",
        spectator:
          "border-transparent bg-slate-100 text-slate-600 dark:bg-slate-800 dark:text-slate-400",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
)

function Badge({ className, variant, ...props }) {
  return (
    <div className={cn(badgeVariants({ variant }), className)} {...props} />
  )
}

export { Badge, badgeVariants }
