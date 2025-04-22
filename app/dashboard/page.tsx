import { requireAuth } from "@/lib/auth"
import { redirect } from "next/navigation"
import DashboardClient from "./dashboard-client"
import { prisma } from "@/lib/prisma"

export default async function DashboardPage() {
  const { user } = await requireAuth()

  if (!user) {
    redirect("/login")
  }

  // Obtener las tareas del usuario desde la base de datos
  const tasks = await prisma.task.findMany({
    where: {
      userId: user.id,
    },
    orderBy: {
      createdAt: "desc",
    },
    include: {
      category: true,
    },
  })

  return (
    <div className="min-h-screen bg-gray-50">
      <DashboardClient initialTasks={tasks} user={user} />
    </div>
  )
}

