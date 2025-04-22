export interface Task {
  id: string
  title: string
  completed: boolean
  createdAt: string
  dueDate?: string
  description?: string
  priority: string // Añadir campo de prioridad
}
