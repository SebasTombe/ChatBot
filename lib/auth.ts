import { compare, hash } from "bcryptjs"
import { prisma } from "./prisma"
import { cookies } from "next/headers"
import { SignJWT, jwtVerify } from "jose"

// Clave secreta para JWT
const secretKey = new TextEncoder().encode(process.env.JWT_SECRET || "default_secret_key_change_in_production")

// Función para crear un token JWT
export async function createToken(payload: any) {
  return await new SignJWT(payload)
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("1d")
    .sign(secretKey)
}

// Función para verificar un token JWT
export async function verifyToken(token: string) {
  try {
    const { payload } = await jwtVerify(token, secretKey)
    return payload
  } catch (error) {
    return null
  }
}

// Función para obtener el usuario actual desde la cookie
export async function getCurrentUser() {
  const cookieStore = cookies()
  const token = cookieStore.get("auth-token")?.value

  if (!token) return null

  try {
    const payload = await verifyToken(token)
    if (!payload || !payload.id) return null

    const user = await prisma.user.findUnique({
      where: { id: Number(payload.id) },
      select: {
        id: true,
        email: true,
        name: true,
      },
    })

    return user
  } catch (error) {
    return null
  }
}

// Función para registrar un nuevo usuario
export async function registerUser(email: string, password: string, name?: string) {
  // Verificar si el usuario ya existe
  const existingUser = await prisma.user.findUnique({
    where: { email },
  })

  if (existingUser) {
    throw new Error("El correo electrónico ya está registrado")
  }

  // Encriptar la contraseña
  const hashedPassword = await hash(password, 10)

  // Crear el usuario
  const user = await prisma.user.create({
    data: {
      email,
      password: hashedPassword,
      name,
    },
  })

  return {
    id: user.id,
    email: user.email,
    name: user.name,
  }
}

// Función para iniciar sesión
export async function loginUser(email: string, password: string) {
  // Buscar el usuario
  const user = await prisma.user.findUnique({
    where: { email },
  })

  if (!user) {
    throw new Error("Credenciales incorrectas")
  }

  // Verificar la contraseña
  const passwordMatch = await compare(password, user.password)

  if (!passwordMatch) {
    throw new Error("Credenciales incorrectas")
  }

  // Crear token JWT
  const token = await createToken({
    id: user.id,
    email: user.email,
  })

  return {
    token,
    user: {
      id: user.id,
      email: user.email,
      name: user.name,
    },
  }
}

// Middleware para proteger rutas
export async function requireAuth() {
  const user = await getCurrentUser()

  if (!user) {
    return {
      redirect: {
        destination: "/login",
        permanent: false,
      },
    }
  }

  return { user }
}

