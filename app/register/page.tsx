import RegisterForm from "@/components/register-form"
import { getCurrentUser } from "@/lib/auth"
import { redirect } from "next/navigation"

export default async function RegisterPage() {
  // Si el usuario ya está autenticado, redirigir al dashboard
  const user = await getCurrentUser()
  if (user) {
    redirect("/dashboard")
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 p-4">
      <div className="w-full max-w-md">
        <h1 className="text-3xl font-bold text-center mb-6">Gestor de Tareas por Voz</h1>
        <RegisterForm />
      </div>
    </div>
  )
}
