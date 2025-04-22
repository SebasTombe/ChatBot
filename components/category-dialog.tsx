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

interface CategoryDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  onSave: (category: { name: string; color: string }) => void
  title: string
  initialData?: { name: string; color: string }
}

// Lista de colores predefinidos
const PRESET_COLORS = [
  "#EF4444", // Rojo
  "#F97316", // Naranja
  "#F59E0B", // Ámbar
  "#10B981", // Esmeralda
  "#06B6D4", // Cian
  "#3B82F6", // Azul
  "#6366F1", // Indigo
  "#8B5CF6", // Violeta
  "#EC4899", // Rosa
  "#6B7280", // Gris
]

export default function CategoryDialog({
  open,
  onOpenChange,
  onSave,
  title,
  initialData = { name: "", color: "#6366F1" },
}: CategoryDialogProps) {
  const [name, setName] = useState(initialData.name)
  const [color, setColor] = useState(initialData.color)

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (name.trim()) {
      onSave({ name: name.trim(), color })
      setName("")
      setColor("#6366F1")
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <form onSubmit={handleSubmit}>
          <DialogHeader>
            <DialogTitle>{title}</DialogTitle>
            <DialogDescription>Crea una nueva categoría para organizar tus tareas.</DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label htmlFor="name">Nombre</Label>
              <Input
                id="name"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Nombre de la categoría"
                required
              />
            </div>
            <div className="grid gap-2">
              <Label>Color</Label>
              <div className="flex flex-wrap gap-2">
                {PRESET_COLORS.map((presetColor) => (
                  <button
                    key={presetColor}
                    type="button"
                    className={`w-8 h-8 rounded-full border-2 ${
                      color === presetColor ? "border-black dark:border-white" : "border-transparent"
                    }`}
                    style={{ backgroundColor: presetColor }}
                    onClick={() => setColor(presetColor)}
                  />
                ))}
                <div className="flex items-center">
                  <Input
                    type="color"
                    value={color}
                    onChange={(e) => setColor(e.target.value)}
                    className="w-8 h-8 p-0 border-0"
                  />
                </div>
              </div>
            </div>
          </div>
          <DialogFooter>
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)}>
              Cancelar
            </Button>
            <Button type="submit">Guardar</Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
