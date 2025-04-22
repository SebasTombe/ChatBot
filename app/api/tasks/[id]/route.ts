import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Actualizar una tarea
export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const taskId = Number.parseInt(params.id)
    const { title, completed, dueDate, description, categoryId } = await req.json()

    // Verificar que la tarea pertenece al usuario
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask || existingTask.userId !== user.id) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    // Si se proporciona una categoría, verificar que pertenece al usuario
    if (categoryId !== undefined) {
      if (categoryId !== null) {
        const category = await prisma.category.findUnique({
          where: { id: Number(categoryId) },
        })

        if (!category || category.userId !== user.id) {
          return NextResponse.json({ error: "Categoría no válida" }, { status: 400 })
        }
      }
    }

    const task = await prisma.task.update({
      where: { id: taskId },
      data: {
        title: title !== undefined ? title : existingTask.title,
        completed: completed !== undefined ? completed : existingTask.completed,
        dueDate: dueDate !== undefined ? new Date(dueDate) : existingTask.dueDate,
        description: description !== undefined ? description : existingTask.description,
        categoryId:
          categoryId !== undefined ? (categoryId === null ? null : Number(categoryId)) : existingTask.categoryId,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(task)
  } catch (error) {
    console.error("Error al actualizar tarea:", error)
    return NextResponse.json({ error: "Error al actualizar tarea" }, { status: 500 })
  }
}

// Eliminar una tarea
export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const taskId = Number.parseInt(params.id)

    // Verificar que la tarea pertenece al usuario
    const existingTask = await prisma.task.findUnique({
      where: { id: taskId },
    })

    if (!existingTask || existingTask.userId !== user.id) {
      return NextResponse.json({ error: "Tarea no encontrada" }, { status: 404 })
    }

    await prisma.task.delete({
      where: { id: taskId },
    })

    return NextResponse.json({ success: true })
  } catch (error) {
    console.error("Error al eliminar tarea:", error)
    return NextResponse.json({ error: "Error al eliminar tarea" }, { status: 500 })
  }
}
