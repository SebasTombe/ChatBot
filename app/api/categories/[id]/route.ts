import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Actualizar una categoría
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const categoryId = Number.parseInt(params.id)
    const { name, color } = await req.json()

    // Verificar que la categoría pertenece al usuario
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!existingCategory || existingCategory.userId !== user.id) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    // Si se está cambiando el nombre, verificar que no exista otra categoría con ese nombre
    if (name && name !== existingCategory.name) {
      const duplicateCategory = await prisma.category.findFirst({
        where: {
          name,
          userId: user.id,
          id: { not: categoryId }, // Excluir la categoría actual
        },
      })

      if (duplicateCategory) {
        return NextResponse.json({ error: "Ya existe una categoría con este nombre" }, { status: 400 })
      }
    }

    const category = await prisma.category.update({
      where: { id: categoryId },
      data: {
        name: name !== undefined ? name : existingCategory.name,
        color: color !== undefined ? color : existingCategory.color,
      },
    })

    return NextResponse.json(category)
  } catch (error) {
    console.error("Error al actualizar categoría:", error)
    return NextResponse.json({ error: "Error al actualizar categoría" }, { status: 500 })
  }
}

// Eliminar una categoría
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const categoryId = Number.parseInt(params.id)

    // Verificar que la categoría pertenece al usuario
    const existingCategory = await prisma.category.findUnique({
      where: { id: categoryId },
    })

    if (!existingCategory || existingCategory.userId !== user.id) {
      return NextResponse.json({ error: "Categoría no encontrada" }, { status: 404 })
    }

    // Actualizar las tareas asociadas para quitar la referencia a la categoría
    await prisma.task.updateMany({
      where: {
        categoryId,
        userId: user.id,
      },
      data: {
        categoryId: null,
      },
    })

    // Eliminar la categoría
    await prisma.category.delete({
      where: { id: categoryId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar categoría:", error)
    return NextResponse.json({ error: "Error al eliminar categoría" }, { status: 500 })
  }
}
