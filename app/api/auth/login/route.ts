import { type NextRequest, NextResponse } from "next/server"
import { loginUser } from "@/lib/auth"
import { cookies } from "next/headers"

export async function POST(req: NextRequest) {
  try {
    const { email, password } = await req.json()

    if (!email || !password) {
      return NextResponse.json({ error: "El correo electrónico y la contraseña son obligatorios" }, { status: 400 })
    }

    const { token, user } = await loginUser(email, password)

    // Establecer la cookie de autenticación
    cookies().set({
      name: "auth-token",
      value: token,
      httpOnly: true,
      path: "/",
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24, // 1 día
    })

    return NextResponse.json({ user })
  } catch (error) {
    console.error("Error al iniciar sesión:", error)
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "Error al iniciar sesión" },
      { status: 401 },
    )
  }
}
