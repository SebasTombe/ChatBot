"use client"

import { useState, useEffect } from "react"
import { Check, Plus, Tag } from "lucide-react"
import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Skeleton } from "@/components/ui/skeleton"
import CategoryBadge from "./category-badge"
import CategoryDialog from "./category-dialog"

interface Category {
  id: number
  name: string
  color: string
}

interface CategorySelectorProps {
  selectedCategoryId: number | null
  onChange: (categoryId: number | null) => void
}

export default function CategorySelector({ selectedCategoryId, onChange }: CategorySelectorProps) {
  const [open, setOpen] = useState(false)
  const [categories, setCategories] = useState<Category[]>([])
  const [loading, setLoading] = useState(true)
  const [dialogOpen, setDialogOpen] = useState(false)

  const selectedCategory = categories.find((category) => category.id === selectedCategoryId) || null

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
        const newCategory = await response.json()
        setCategories((prev) => [...prev, newCategory])
        onChange(newCategory.id)
        setDialogOpen(false)
      } else {
        const error = await response.json()
        alert(error.error || "Error al crear la categoría")
      }
    } catch (error) {
      console.error("Error al crear categoría:", error)
      alert("Error al crear la categoría")
    }
  }

  return (
    <div className="flex items-center space-x-2">
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <Button variant="outline" className="justify-start w-full max-w-xs">
            {selectedCategory ? (
              <CategoryBadge category={selectedCategory} />
            ) : (
              <>
                <Tag className="mr-2 h-4 w-4" />
                <span>Seleccionar categoría</span>
              </>
            )}
          </Button>
        </PopoverTrigger>
        <PopoverContent className="p-0" align="start" side="bottom">
          <Command>
            <CommandInput placeholder="Buscar categoría..." />
            <CommandList>
              <CommandEmpty>No se encontraron categorías.</CommandEmpty>
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    onChange(null)
                    setOpen(false)
                  }}
                  className="justify-between"
                >
                  <span>Sin categoría</span>
                  {selectedCategoryId === null && <Check className="h-4 w-4" />}
                </CommandItem>
                {loading ? (
                  <div className="p-2">
                    <Skeleton className="h-8 w-full" />
                    <Skeleton className="h-8 w-full mt-2" />
                  </div>
                ) : (
                  categories.map((category) => (
                    <CommandItem
                      key={category.id}
                      onSelect={() => {
                        onChange(category.id)
                        setOpen(false)
                      }}
                      className="justify-between"
                    >
                      <CategoryBadge category={category} />
                      {selectedCategoryId === category.id && <Check className="h-4 w-4" />}
                    </CommandItem>
                  ))
                )}
              </CommandGroup>
              <CommandSeparator />
              <CommandGroup>
                <CommandItem
                  onSelect={() => {
                    setOpen(false)
                    setDialogOpen(true)
                  }}
                >
                  <Plus className="mr-2 h-4 w-4" />
                  <span>Crear categoría</span>
                </CommandItem>
              </CommandGroup>
            </CommandList>
          </Command>
        </PopoverContent>
      </Popover>

      <CategoryDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        onSave={handleCreateCategory}
        title="Crear categoría"
      />
    </div>
  )
}
