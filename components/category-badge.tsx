import { Badge } from "@/components/ui/badge"

interface Category {
  id: number
  name: string
  color: string
}

interface CategoryBadgeProps {
  category: Category | null
  className?: string
}

export default function CategoryBadge({ category, className = "" }: CategoryBadgeProps) {
  if (!category) return null

  return (
    <Badge
      className={`text-xs font-normal ${className}`}
      style={{ backgroundColor: category.color, color: getContrastColor(category.color) }}
    >
      {category.name}
    </Badge>
  )
}

// Función para determinar si se debe usar texto blanco o negro según el color de fondo
function getContrastColor(hexColor: string): string {
  // Convertir hex a RGB
  const r = Number.parseInt(hexColor.slice(1, 3), 16)
  const g = Number.parseInt(hexColor.slice(3, 5), 16)
  const b = Number.parseInt(hexColor.slice(5, 7), 16)

  // Calcular luminosidad
  const luminance = (0.299 * r + 0.587 * g + 0.114 * b) / 255

  // Usar texto blanco para colores oscuros y negro para colores claros
  return luminance > 0.5 ? "#000000" : "#ffffff"
}
