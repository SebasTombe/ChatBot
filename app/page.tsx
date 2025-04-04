import { redirect } from "next/navigation"
import { getCurrentUser } from "@/lib/auth"

export default async function Home() {
  const user = await getCurrentUser()

  // Si el usuario no está autenticado, redirigir a la página de inicio de sesión
  if (!user) {
    redirect("/login")
  }

  // Si el usuario está autenticado, redirigir al dashboard
  redirect("/dashboard")
}

