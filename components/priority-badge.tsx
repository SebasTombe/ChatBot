import { AlertTriangle, CheckCircle2, Circle } from "lucide-react"
import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

interface PriorityBadgeProps {
  priority: string
  className?: string
  showLabel?: boolean
}

export default function PriorityBadge({ priority, className = "", showLabel = true }: PriorityBadgeProps) {
  // Configuración para cada nivel de prioridad
  const config = {
    alta: {
      icon: AlertTriangle,
      color: "bg-red-100 text-red-800 border-red-200 dark:bg-red-900/30 dark:text-red-400 dark:border-red-800",
      label: "Alta",
    },
    media: {
      icon: CheckCircle2,
      color:
        "bg-amber-100 text-amber-800 border-amber-200 dark:bg-amber-900/30 dark:text-amber-400 dark:border-amber-800",
      label: "Media",
    },
    baja: {
      icon: Circle,
      color:
        "bg-green-100 text-green-800 border-green-200 dark:bg-green-900/30 dark:text-green-400 dark:border-green-800",
      label: "Baja",
    },
  }

  const { icon: Icon, color, label } = config[priority as keyof typeof config] || config.media

  return (
    <Badge className={cn("inline-flex items-center gap-1 border font-medium", color, className)}>
      <Icon className="h-3.5 w-3.5" />
      {showLabel && <span>{label}</span>}
    </Badge>
  )
}
