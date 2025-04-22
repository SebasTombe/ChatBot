import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Obtener todas las tareas del usuario actual
export async function GET(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    // Obtener el parámetro de categoría si existe
    const { searchParams } = new URL(req.url)
    const categoryId = searchParams.get("categoryId")

    // Construir la consulta
    const whereClause: any = {
      userId: user.id,
    }

    // Si se especifica una categoría, filtrar por ella
    if (categoryId) {
      whereClause.categoryId = categoryId === "null" ? null : Number(categoryId)
    }

    const tasks = await prisma.task.findMany({
      where: whereClause,
      orderBy: {
        createdAt: "desc",
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(tasks)
  } catch (error) {
    console.error("Error al obtener tareas:", error)
    return NextResponse.json({ error: "Error al obtener tareas" }, { status: 500 })
  }
}

// Crear una nueva tarea
export async function POST(req: NextRequest) {
  try {
    const user = await getCurrentUser()

    if (!user) {
      return NextResponse.json({ error: "No autorizado" }, { status: 401 })
    }

    const { title, dueDate, description, categoryId } = await req.json()

    if (!title) {
      return NextResponse.json({ error: "El título es obligatorio" }, { status: 400 })
    }

    // Si se proporciona una categoría, verificar que pertenece al usuario
    if (categoryId) {
      const category = await prisma.category.findUnique({
        where: { id: Number(categoryId) },
      })

      if (!category || category.userId !== user.id) {
        return NextResponse.json({ error: "Categoría no válida" }, { status: 400 })
      }
    }

    const task = await prisma.task.create({
      data: {
        title,
        dueDate: dueDate ? new Date(dueDate) : null,
        description,
        userId: user.id,
        categoryId: categoryId ? Number(categoryId) : null,
      },
      include: {
        category: true,
      },
    })

    return NextResponse.json(task, { status: 201 })
  } catch (error) {
    console.error("Error al crear tarea:", error)
    return NextResponse.json({ error: "Error al crear tarea" }, { status: 500 })
  }
}
