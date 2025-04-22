"use client"

import type React from "react"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import CategorySelector from "./category-selector"

interface Category {
  id: number
  name: string
  color: string
}

interface Task {
  id?: number
  title: string
  description?: string | null
  dueDate?: string | null
  categoryId?: number | null
  category?: Category | null
}

interface TaskFormProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (task: Task) => Promise<void>
  title: string
  initialData?: Task
}

export default function TaskForm({
  open,
  onOpenChange,
  onSave,
  title,
  initialData = { title: "", description: "", dueDate: null, categoryId: null },
}: TaskFormProps) {
  const [taskTitle, setTaskTitle] = useState(initialData.title || "")
  const [description, setDescription] = useState(initialData.description || "")
  const [dueDate, setDueDate] = useState(
    initialData.dueDate ? new Date(initialData.dueDate).toISOString().split("T")[0] : "",
  )
  const [categoryId, setCategoryId] = useState<number | null>(initialData.categoryId || null)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    setLoading(true)
    try {
      await onSave({
        id: initialData.id,
        title: taskTitle.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        categoryId,
      })

      // Resetear el formulario
      if (!initialData.id) {
        setTaskTitle("")
        setDescription("")
        setDueDate("")
        setCategoryId(null)
      }

      onOpenChange(false)
    } catch (error) {
      console.error("Error al guardar tarea:", error)
      alert("Error al guardar la tarea")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>
              {initialData.id ? "Edita los detalles de la tarea." : "Crea una nueva tarea para tu lista."}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="title">Título</Label>
              <Input
                id="title"
                value={taskTitle}
                onChange={(e) => setTaskTitle(e.target.value)}
                placeholder="Título de la tarea"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Descripción de la tarea"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Fecha límite (opcional)</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={(e) => setDueDate(e.target.value)} />
            </div>
            <div className="grid gap-2">
              <Label>Categoría (opcional)</Label>
              <CategorySelector selectedCategoryId={categoryId} onChange={setCategoryId} />
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
