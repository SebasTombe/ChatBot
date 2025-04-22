"use client"

import { CheckCircle, Circle, Calendar } from "lucide-react"
import { formatDistanceToNow } from "date-fns"
import { es } from "date-fns/locale"
import CategoryBadge from "./category-badge"

interface Category {
  id: number
  name: string
  color: string
}

interface Task {
  id: number
  title: string
  completed: boolean
  createdAt: string
  dueDate: string | null
  description: string | null
  category: Category | null
}

interface TaskListProps {
  tasks: Task[]
  onComplete: (id: number) => void
  completed?: boolean
}

export default function TaskList({ tasks, onComplete, completed = false }: TaskListProps) {
  if (tasks.length === 0) {
    return (
      <div className="text-center text-gray-500 py-4">No hay tareas {completed ? "completadas" : "pendientes"}</div>
    )
  }

  return (
    <ul className="space-y-2">
      {tasks.map((task) => (
        <li
          key={task.id}
          className={`flex items-start justify-between p-3 rounded-md ${
            completed ? "bg-gray-50" : "bg-white border border-gray-200"
          }`}
        >
          <div className="flex items-start gap-3">
            <button
              onClick={() => !completed && onComplete(task.id)}
              className={`mt-1 ${completed ? "text-green-500" : "text-gray-400 hover:text-blue-500"}`}
            >
              {completed ? <CheckCircle size={18} /> : <Circle size={18} />}
            </button>

            <div>
              <div className="flex items-center gap-2">
                <p className={completed ? "text-gray-500 line-through" : "text-gray-800"}>{task.title}</p>
                {task.category && <CategoryBadge category={task.category} />}
              </div>

              <div className="flex items-center gap-2 text-xs text-gray-500 mt-1">
                {task.createdAt && (
                  <span>Creada {formatDistanceToNow(new Date(task.createdAt), { addSuffix: true, locale: es })}</span>
                )}

                {task.dueDate && (
                  <div className="flex items-center gap-1">
                    <Calendar size={12} />
                    <span>Vence {formatDistanceToNow(new Date(task.dueDate), { addSuffix: true, locale: es })}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
