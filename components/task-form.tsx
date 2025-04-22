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
import ConfirmationDialog from "@/components/confirmation-dialog"

// Añadir import de RadioGroup
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Circle, CheckCircle2, AlertTriangle } from "lucide-react"

interface Category {
  id: number
  name: string
  color: string
}

// Actualizar la interfaz Task para incluir priority
interface Task {
  id?: number
  title: string
  description?: string | null
  dueDate?: string | null
  categoryId?: number | null
  category?: Category | null
  priority?: string
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

  // Añadir estos estados para manejar cambios sin guardar
  const [hasChanges, setHasChanges] = useState(false)
  const [attemptingClose, setAttemptingClose] = useState(false)

  // Después de useState, añadir el estado para la prioridad
  const [priority, setPriority] = useState(initialData.priority || "media")

  // Modificar los manejadores de cambio para detectar cambios
  const handleTitleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setTaskTitle(e.target.value)
    setHasChanges(true)
  }

  const handleDescriptionChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setDescription(e.target.value)
    setHasChanges(true)
  }

  const handleDueDateChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setDueDate(e.target.value)
    setHasChanges(true)
  }

  const handleCategoryChange = (id: number | null) => {
    setCategoryId(id)
    setHasChanges(true)
  }

  // Añadir el manejador de cambio de prioridad
  const handlePriorityChange = (value: string) => {
    setPriority(value)
    setHasChanges(true)
  }

  // Modificar el manejo de cierre del diálogo
  const handleCloseAttempt = () => {
    if (hasChanges) {
      setAttemptingClose(true)
    } else {
      onOpenChange(false)
    }
  }

  const confirmClose = () => {
    setAttemptingClose(false)
    onOpenChange(false)
    setHasChanges(false)
  }

  // Después del envío exitoso, resetear el estado de cambios
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!taskTitle.trim()) return

    setLoading(true)
    try {
      // En el handleSubmit, añadir priority al objeto de tarea
      await onSave({
        id: initialData.id,
        title: taskTitle.trim(),
        description: description.trim() || null,
        dueDate: dueDate ? new Date(dueDate).toISOString() : null,
        categoryId,
        priority,
      })

      // Resetear el formulario
      if (!initialData.id) {
        setTaskTitle("")
        setDescription("")
        setDueDate("")
        setCategoryId(null)
      }

      setHasChanges(false)
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
                onChange={handleTitleChange}
                placeholder="Título de la tarea"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="description">Descripción (opcional)</Label>
              <Textarea
                id="description"
                value={description}
                onChange={handleDescriptionChange}
                placeholder="Descripción de la tarea"
                rows={3}
              />
            </div>
            <div className="grid gap-2">
              <Label htmlFor="dueDate">Fecha límite (opcional)</Label>
              <Input id="dueDate" type="date" value={dueDate} onChange={handleDueDateChange} />
            </div>
            <div className="grid gap-2">
              <Label>Categoría (opcional)</Label>
              <CategorySelector selectedCategoryId={categoryId} onChange={handleCategoryChange} />
            </div>
            {/* Después del campo de categoría, añadir el selector de prioridad */}
            <div className="grid gap-2">
              <Label>Prioridad</Label>
              <RadioGroup value={priority} onValueChange={handlePriorityChange} className="flex space-x-2">
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="alta" id="alta" />
                  <Label htmlFor="alta" className="cursor-pointer flex items-center gap-1">
                    <AlertTriangle className="h-4 w-4 text-red-500" />
                    Alta
                  </Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="media" id="media" />
                  <Label htmlFor="media" className="cursor-pointer flex items-center gap-1">
                    <CheckCircle2 className="h-4 w-4 text-amber-500" />
                    Media
                  </Label>
                </div>
                <div className="flex items-center space-x-1">
                  <RadioGroupItem value="baja" id="baja" />
                  <Label htmlFor="baja" className="cursor-pointer flex items-center gap-1">
                    <Circle className="h-4 w-4 text-green-500" />
                    Baja
                  </Label>
                </div>
              </RadioGroup>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={handleCloseAttempt}>
              Cancelar
            </Button>
            <Button type="submit" disabled={loading}>
              {loading ? "Guardando..." : "Guardar"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
      {/* Diálogo de confirmación para cerrar sin guardar */}
      <ConfirmationDialog
        open={attemptingClose}
        onOpenChange={setAttemptingClose}
        title="Cambios sin guardar"
        description="Tienes cambios sin guardar. ¿Estás seguro de que quieres cerrar sin guardar?"
        confirmText="Cerrar sin guardar"
        cancelText="Continuar editando"
        onConfirm={confirmClose}
      />
    </Dialog>
  )
}
