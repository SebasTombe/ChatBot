"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, MicOff, Volume2, CheckCircle, Clock, LogOut, Plus, Filter } from "lucide-react"
import TaskList from "@/components/task-list"
import VoiceRecognition from "@/components/voice-recognition"
import { useRouter } from "next/navigation"
import CategoryManager from "@/components/category-manager"
import TaskForm from "@/components/task-form"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import CategoryBadge from "@/components/category-badge"

interface Category {
  id: number
  name: string
  color: string
}

interface Task {
  id: number
  title: string
  completed: boolean
  createdAt: string
  dueDate: string | null
  description: string | null
  categoryId: number | null
  category: Category | null
}

interface User {
  id: number
  email: string
  name: string | null
}

interface DashboardClientProps {
  initialTasks: Task[]
  user: User
}

export default function DashboardClient({ initialTasks, user }: DashboardClientProps) {
  const [tasks, setTasks] = useState<Task[]>(initialTasks)
  const [isListening, setIsListening] = useState(false)
  const [feedback, setFeedback] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)
  const router = useRouter()
  const [taskFormOpen, setTaskFormOpen] = useState(false)
  const [editingTask, setEditingTask] = useState<Task | null>(null)
  const [activeTab, setActiveTab] = useState("tasks")
  const [categories, setCategories] = useState<Category[]>([])
  const [selectedCategoryId, setSelectedCategoryId] = useState<number | null | "uncategorized">(null)

  useEffect(() => {
    // Cargar categorías
    fetchCategories()

    // Cargar tareas (todas inicialmente)
    fetchTasks()

    // Verificar recordatorios al cargar
    checkReminders()

    // Configurar verificación periódica de recordatorios
    const interval = setInterval(checkReminders, 60000) // Cada minuto

    return () => clearInterval(interval)
  }, [])


  // Efecto para recargar tareas cuando cambia el filtro de categoría
  useEffect(() => {
    fetchTasks()
  }, [selectedCategoryId])

  const fetchCategories = async () => {
    try {
      const response = await fetch("/api/categories")
      if (response.ok) {
        const data = await response.json()
        setCategories(data)
      }
    } catch (error) {
      console.error("Error al cargar categorías:", error)
    }
  }

  const fetchTasks = async () => {
    try {
      let url = "/api/tasks"

      // Añadir filtro de categoría si está seleccionado
      if (selectedCategoryId !== null) {
        if (selectedCategoryId === "uncategorized") {
          url += "?categoryId=null"
        } else if (typeof selectedCategoryId === "number") {
          url += `?categoryId=${selectedCategoryId}`
        }
      }

      const response = await fetch(url)
      if (response.ok) {
        const data = await response.json()
        setTasks(data)
      }
    } catch (error) {
      console.error("Error al cargar tareas:", error)
    }
  }

  const checkReminders = () => {
    const now = new Date()
    const oneDayFromNow = new Date(now.getTime() + 24 * 60 * 60 * 1000)

    const upcomingTasks = tasks.filter((task) => {
      if (!task.dueDate) return false
      const dueDate = new Date(task.dueDate)
      return !task.completed && dueDate <= oneDayFromNow && dueDate > now
    })

    if (upcomingTasks.length > 0) {
      const taskNames = upcomingTasks.map((t) => t.title).join(", ")
      const reminderText = `Recordatorio: Tienes ${upcomingTasks.length} ${upcomingTasks.length === 1 ? "tarea" : "tareas"} con fecha límite próxima: ${taskNames}`
      speakText(reminderText)
    }
  }

  const handleVoiceCommand = async (transcript: string) => {
    const lowerTranscript = transcript.toLowerCase()

    // Crear tarea
    if (lowerTranscript.includes("crear tarea") || lowerTranscript.includes("nueva tarea")) {
      const taskTitle = transcript.replace(/crear tarea|nueva tarea/i, "").trim()
      if (taskTitle) {
        try {
          // Extraer fecha si se menciona
          let dueDate = null
          const dateMatch = taskTitle.match(/para el (\d{1,2})(?: de)? ([a-zA-Z]+)/i)
          if (dateMatch) {
            const day = Number.parseInt(dateMatch[1])
            const month = getMonthNumber(dateMatch[2])
            if (month !== -1) {
              const year = new Date().getFullYear()
              dueDate = new Date(year, month, day).toISOString()
            }
          }

          // Extraer categoría si se menciona
          let categoryId = null
          const categoryMatch = taskTitle.match(/en (?:la )?categoría ([a-zA-Z0-9 ]+)/i)
          if (categoryMatch) {
            const categoryName = categoryMatch[1].trim().toLowerCase()
            const category = categories.find((c) => c.name.toLowerCase() === categoryName)
            if (category) {
              categoryId = category.id
            }
          }

          const response = await fetch("/api/tasks", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              title: taskTitle,
              dueDate,
              categoryId,
            }),
          })

          if (!response.ok) {
            throw new Error("Error al crear la tarea")
          }

          const newTask = await response.json()
          setTasks((prev) => [newTask, ...prev])

          const confirmationText = `Tarea creada: ${taskTitle}`
          setFeedback(confirmationText)
          speakText(confirmationText)
        } catch (error) {
          console.error("Error al crear tarea:", error)
          speakText("Hubo un error al crear la tarea")
        }
      }
    }

    // Consultar tareas
    else if (lowerTranscript.includes("mis tareas") || lowerTranscript.includes("tareas pendientes")) {
      const pendingTasks = tasks.filter((t) => !t.completed)
      if (pendingTasks.length === 0) {
        speakText("No tienes tareas pendientes.")
      } else {
        const taskList = pendingTasks.map((t) => t.title).join(", ")
        speakText(`Tienes ${pendingTasks.length} tareas pendientes: ${taskList}`)
      }
    }

    // Completar tarea
    else if (lowerTranscript.includes("completar tarea") || lowerTranscript.includes("marcar como completada")) {
      const taskTitle = transcript.replace(/completar tarea|marcar como completada/i, "").trim()
      const taskIndex = tasks.findIndex((t) => t.title.toLowerCase().includes(taskTitle.toLowerCase()) && !t.completed)

      if (taskIndex !== -1) {
        try {
          const taskId = tasks[taskIndex].id
          const response = await fetch(`/api/tasks/${taskId}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              completed: true,
            }),
          })

          if (!response.ok) {
            throw new Error("Error al actualizar la tarea")
          }

          const updatedTask = await response.json()
          setTasks((prev) => prev.map((t) => (t.id === taskId ? updatedTask : t)))

          const confirmationText = `Tarea completada: ${tasks[taskIndex].title}`
          setFeedback(confirmationText)
          speakText(confirmationText)
        } catch (error) {
          console.error("Error al completar tarea:", error)
          speakText("Hubo un error al completar la tarea")
        }
      } else {
        speakText("No encontré esa tarea en tu lista de pendientes.")
      }
    }

    // Eliminar tarea
    else if (lowerTranscript.includes("eliminar tarea")) {
      const taskTitle = transcript.replace(/eliminar tarea/i, "").trim()
      const taskIndex = tasks.findIndex((t) => t.title.toLowerCase().includes(taskTitle.toLowerCase()))

      console.log(taskTitle, taskIndex)
      if (taskIndex !== -1) {
        const updatedTasks = [...tasks]
        updatedTasks.splice(taskIndex, 1)
        setTasks(updatedTasks)
        const confirmationText = `Tarea eliminada: ${tasks[taskIndex].title}`
        setFeedback(confirmationText)
        speakText(confirmationText)
      } else {
        speakText("No encontré esa tarea en tu lista.")
      }
    }

    // Filtrar por categoría
    else if (
      lowerTranscript.includes("mostrar tareas de categoría") ||
      lowerTranscript.includes("filtrar por categoría")
    ) {
      const categoryName = transcript
        .replace(/mostrar tareas de categoría|filtrar por categoría/i, "")
        .trim()
        .toLowerCase()

      if (categoryName === "todas" || categoryName === "todos") {
        setSelectedCategoryId(null)
        speakText("Mostrando todas las tareas")
      } else if (categoryName === "sin categoría" || categoryName === "sin categorizar") {
        setSelectedCategoryId("uncategorized")
        speakText("Mostrando tareas sin categoría")
      } else {
        const category = categories.find((c) => c.name.toLowerCase() === categoryName)
        if (category) {
          setSelectedCategoryId(category.id)
          speakText(`Mostrando tareas de la categoría ${category.name}`)
        } else {
          speakText(`No encontré la categoría ${categoryName}`)
        }
      }
    }
  }

  const speakText = async (text: string) => {
    try {
      const response = await fetch("/api/speak", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ text }),
      })

      if (response.ok) {
        const audioBlob = await response.blob()
        const audioUrl = URL.createObjectURL(audioBlob)

        if (audioRef.current) {
          audioRef.current.src = audioUrl
          audioRef.current.play()
        }
      } else {
        // Si falla, usar la API de síntesis de voz del navegador
        if ("speechSynthesis" in window) {
          const utterance = new SpeechSynthesisUtterance(text)
          utterance.lang = "es-ES"
          window.speechSynthesis.speak(utterance)
        }
      }
    } catch (error) {
      console.error("Error al reproducir audio:", error)

      // Usar síntesis de voz del navegador como respaldo
      if ("speechSynthesis" in window) {
        const utterance = new SpeechSynthesisUtterance(text)
        utterance.lang = "es-ES"
        window.speechSynthesis.speak(utterance)
      }
    }
  }

  const getMonthNumber = (monthName: string): number => {
    const months = [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ]
    return months.findIndex((m) => monthName.toLowerCase().includes(m))
  }

  const handleLogout = async () => {
    try {
      await fetch("/api/auth/logout", {
        method: "POST",
      })
      router.push("/login")
      router.refresh()
    } catch (error) {
      console.error("Error al cerrar sesión:", error)
    }
  }

  const handleCompleteTask = async (id: number) => {
    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          completed: true,
        }),
      })

      if (!response.ok) {
        throw new Error("Error al actualizar la tarea")
      }

      const updatedTask = await response.json()
      setTasks((prev) => prev.map((t) => (t.id === id ? updatedTask : t)))
      speakText("Tarea marcada como completada")
    } catch (error) {
      console.error("Error al completar tarea:", error)
    }
  }

  const handleSaveTask = async (taskData: any) => {
    try {
      if (taskData.id) {
        // Actualizar tarea existente
        const response = await fetch(`/api/tasks/${taskData.id}`, {
          method: "PATCH",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskData),
        })

        if (!response.ok) {
          throw new Error("Error al actualizar la tarea")
        }

        const updatedTask = await response.json()
        setTasks((prev) => prev.map((t) => (t.id === taskData.id ? updatedTask : t)))
      } else {
        // Crear nueva tarea
        const response = await fetch("/api/tasks", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
          },
          body: JSON.stringify(taskData),
        })

        if (!response.ok) {
          throw new Error("Error al crear la tarea")
        }

        const newTask = await response.json()
        setTasks((prev) => [newTask, ...prev])
      }
    } catch (error) {
      console.error("Error al guardar tarea:", error)
      throw error
    }
  }

  const handleEditTask = (task: Task) => {
    setEditingTask(task)
    setTaskFormOpen(true)
  }

  const handleDeleteTask = async (id: number) => {
    if (!confirm("¿Estás seguro de que deseas eliminar esta tarea?")) return

    try {
      const response = await fetch(`/api/tasks/${id}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar la tarea")
      }

      setTasks((prev) => prev.filter((t) => t.id !== id))
    } catch (error) {
      console.error("Error al eliminar tarea:", error)
      alert("Error al eliminar la tarea")
    }
  }

  const getSelectedCategory = () => {
    if (selectedCategoryId === null) {
      return null
    } else if (selectedCategoryId === "uncategorized") {
      return { id: "uncategorized", name: "Sin categoría", color: "#94A3B8" }
    } else {
      return categories.find((c) => c.id === selectedCategoryId) || null
    }
  }

  return (
    <main className="container mx-auto p-4">
      <div className="flex justify-between items-center mb-6">
        <h1 className="text-2xl font-bold">Bienvenido, {user.name || user.email}</h1>
        <Button variant="outline" onClick={handleLogout} className="flex items-center gap-2">
          <LogOut size={16} />
          Cerrar sesión
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-6">
        <TabsList>
          <TabsTrigger value="tasks">Tareas</TabsTrigger>
          <TabsTrigger value="categories">Categorías</TabsTrigger>
        </TabsList>
        <TabsContent value="tasks">
          <Card className="mb-6">
            <CardHeader>
              <CardTitle className="text-center">Gestor de Tareas por Voz</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-col items-center gap-4">
                <div className="flex gap-4">
                  <Button
                    onClick={() => setIsListening(!isListening)}
                    variant={isListening ? "destructive" : "default"}
                    className="flex items-center gap-2"
                  >
                    {isListening ? <MicOff /> : <Mic />}
                    {isListening ? "Detener" : "Iniciar reconocimiento"}
                  </Button>

                  <Button
                    onClick={() =>
                      speakText(
                        'Puedes decir: "Crear tarea", "Mis tareas pendientes", "Completar tarea" o "Filtrar por categoría"',
                      )
                    }
                    variant="outline"
                    className="flex items-center gap-2"
                  >
                    <Volume2 />
                    Ayuda por voz
                  </Button>
                </div>

                {feedback && <div className="mt-4 p-3 bg-green-100 text-green-800 rounded-md">{feedback}</div>}

                {isListening && <VoiceRecognition onResult={handleVoiceCommand} onStop={() => setIsListening(false)} />}
              </div>
            </CardContent>
          </Card>

          <div className="flex justify-between items-center mb-4">
            <div className="flex items-center gap-2">
              <Button onClick={() => setTaskFormOpen(true)} className="flex items-center gap-2">
                <Plus size={16} />
                Nueva Tarea
              </Button>

              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="outline" className="flex items-center gap-2">
                    <Filter size={16} />
                    Filtrar
                    {getSelectedCategory() && (
                      <span className="ml-2">
                        <CategoryBadge category={getSelectedCategory() as any} />
                      </span>
                    )}
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent>
                  <DropdownMenuLabel>Filtrar por categoría</DropdownMenuLabel>
                  <DropdownMenuSeparator />
                  <DropdownMenuGroup>
                    <DropdownMenuItem onClick={() => setSelectedCategoryId(null)}>Todas las tareas</DropdownMenuItem>
                    <DropdownMenuItem onClick={() => setSelectedCategoryId("uncategorized")}>
                      Sin categoría
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    {categories.map((category) => (
                      <DropdownMenuItem key={category.id} onClick={() => setSelectedCategoryId(category.id)}>
                        <div className="w-3 h-3 rounded-full mr-2" style={{ backgroundColor: category.color }}></div>
                        {category.name}
                      </DropdownMenuItem>
                    ))}
                  </DropdownMenuGroup>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tareas Pendientes</CardTitle>
                <Clock className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <TaskList tasks={tasks.filter((t) => !t.completed)} onComplete={handleCompleteTask} />
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Tareas Completadas</CardTitle>
                <CheckCircle className="text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <TaskList tasks={tasks.filter((t) => t.completed)} onComplete={() => { }} completed />
              </CardContent>
            </Card>
          </div>
        </TabsContent>
        <TabsContent value="categories">
          <CategoryManager />
        </TabsContent>
      </Tabs>

      {/* Formulario para crear/editar tareas */}
      <TaskForm
        open={taskFormOpen}
        onOpenChange={(open) => {
          setTaskFormOpen(open)
          if (!open) setEditingTask(null)
        }}
        onSave={handleSaveTask}
        title={editingTask ? "Editar tarea" : "Crear tarea"}
        initialData={editingTask || undefined}
      />

      <audio ref={audioRef} className="hidden" />
    </main >
  )
}

