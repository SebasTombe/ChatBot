"use client"

import { useState, useEffect } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Edit, Plus, Trash2 } from "lucide-react"
import CategoryDialog from "./category-dialog"
import ConfirmationDialog from "@/components/confirmation-dialog"

interface Category {
  id: number
  name: string
  color: string
}

export default function CategoryManager() {
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [editDialogOpen, setEditDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedCategory, setSelectedCategory] = useState<Category | null>(null)

  useEffect(() => {
    fetchCategories()
  }, [])

  const fetchCategories = async () => {
    try {
      setLoading(true)
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateCategory = async (category: { name: string; color: string }) => {
    try {
      const response = await fetch("/api/categories", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(category),
      })

      if (response.ok) {
        await fetchCategories()
        setCreateDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || "Error al crear la categoría")
      }
    } catch (error) {
      console.error("Error al crear categoría:", error)
      alert("Error al crear la categoría")
    }
  }

  const handleEditCategory = async (category: { name: string; color: string }) => {
    if (!selectedCategory) return

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(category),
      })

      if (response.ok) {
        await fetchCategories()
        setEditDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || "Error al actualizar la categoría")
      }
    } catch (error) {
      console.error("Error al actualizar categoría:", error)
      alert("Error al actualizar la categoría")
    }
  }

  const handleDeleteCategory = async () => {
    if (!selectedCategory) return

    try {
      const response = await fetch(`/api/categories/${selectedCategory.id}`, {
        method: "DELETE",
      })

      if (response.ok) {
        await fetchCategories()
        setDeleteDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || "Error al eliminar la categoría")
      }
    } catch (error) {
      console.error("Error al eliminar categoría:", error)
      alert("Error al eliminar la categoría")
    }
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Categorías</CardTitle>
        <CardDescription>Gestiona las categorías para organizar tus tareas.</CardDescription>
      </CardHeader>
      <CardContent>
        <div className="flex justify-end mb-4">
          <Button onClick={() => setCreateDialogOpen(true)} className="flex items-center gap-2">
            <Plus className="h-4 w-4" />
            Nueva Categoría
          </Button>
        </div>

        {loading ? (
          <div className="text-center py-4">Cargando categorías...</div>
        ) : categories.length === 0 ? (
          <div className="text-center py-4 text-gray-500">No hay categorías. Crea una para organizar tus tareas.</div>
        ) : (
          <div className="space-y-2">
            {categories.map((category) => (
              <div
                key={category.id}
                className="flex items-center justify-between p-3 border rounded-md"
                style={{ borderLeftColor: category.color, borderLeftWidth: "4px" }}
              >
                <div className="flex items-center">
                  <div className="w-4 h-4 rounded-full mr-3" style={{ backgroundColor: category.color }}></div>
                  <span>{category.name}</span>
                </div>
                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCategory(category)
                      setEditDialogOpen(true)
                    }}
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => {
                      setSelectedCategory(category)
                      setDeleteDialogOpen(true)
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Diálogo para crear categoría */}
        <CategoryDialog
          open={createDialogOpen}
          onOpenChange={setCreateDialogOpen}
          onSave={handleCreateCategory}
          title="Crear categoría"
        />

        {/* Diálogo para editar categoría */}
        <CategoryDialog
          open={editDialogOpen}
          onOpenChange={setEditDialogOpen}
          onSave={handleEditCategory}
          title="Editar categoría"
          initialData={selectedCategory || { name: "", color: "#6366F1" }}
        />

        {/* Diálogo de confirmación para eliminar */}
        <ConfirmationDialog
          open={deleteDialogOpen}
          onOpenChange={setDeleteDialogOpen}
          title="¿Estás seguro?"
          description={`Esta acción eliminará la categoría "${selectedCategory?.name}". Las tareas asociadas a esta categoría no se eliminarán, pero quedarán sin categoría.`}
          confirmText="Eliminar"
          cancelText="Cancelar"
          onConfirm={handleDeleteCategory}
        />
      </CardContent>
    </Card>
  )
}
