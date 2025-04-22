import { type NextRequest, NextResponse } from "next/server"
import { prisma } from "@/lib/prisma"
import { getCurrentUser } from "@/lib/auth"

// Obtener todas las categorías del usuario actual
export async function GET() {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const categories = await prisma.category.findMany({
            where: {
                userId: user.id,
            },
            orderBy: {
                name: "asc",
            },
        })

        return NextResponse.json(categories)
    } catch (error) {
        console.error("Error al obtener categorías:", error)
        return NextResponse.json({ error: "Error al obtener categorías" }, { status: 500 })
    }
}

// Crear una nueva categoría
export async function POST(req: NextRequest) {
    try {
        const user = await getCurrentUser()

        if (!user) {
            return NextResponse.json({ error: "No autorizado" }, { status: 401 })
        }

        const { name, color } = await req.json()

        if (!name) {
            return NextResponse.json({ error: "El nombre es obligatorio" }, { status: 400 })
        }

        // Verificar si ya existe una categoría con el mismo nombre para este usuario
        const existingCategory = await prisma.category.findFirst({
            where: {
                name,
                userId: user.id,
            },
        })

        if (existingCategory) {
            return NextResponse.json({ error: "Ya existe una categoría con este nombre" }, { status: 400 })
        }

        const category = await prisma.category.create({
            data: {
                name,
                color: color || "#6366F1", // Color por defecto si no se proporciona
                userId: user.id,
            },
        })

        return NextResponse.json(category, { status: 201 })
    } catch (error) {
        console.error("Error al crear categoría:", error)
        return NextResponse.json({ error: "Error al crear categoría" }, { status: 500 })
    }
}
