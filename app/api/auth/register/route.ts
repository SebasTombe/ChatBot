import { type NextRequest, NextResponse } from "next/server"
import { registerUser } from "@/lib/auth"

export async function POST(req: NextRequest) {
  try {
    const { email, password, name } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "El correo electrónico y la contraseña son obligatorios" }, { status: 400 })
    }

    const user = await registerUser(email, password, name)

    return NextResponse.json({ user }, { status: 201 })
  } catch (error) {
    console.error("Error al registrar usuario:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al registrar usuario" },
      { status: 500 },
    )
  }
}

