"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
// Importar los íconos necesarios para la prioridad
import { CheckCircle, Clock, LogOut, Plus, Filter, MicOff, Mic, Volume2 } from "lucide-react"
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
// Después de importar CategoryBadge, importar PriorityBadge
import CategoryBadge from "@/components/category-badge"
import ConfirmationDialog from "@/components/confirmation-dialog"

interface Category {
  id: number
  name: string
  color: string
}

// Actualizar la interfaz Task para incluir priority
interface Task {
  id: number
  title: string
  completed: boolean
  createdAt: string
  dueDate: string | null
  description: string | null
  categoryId: number | null
  category: Category | null
  priority: string
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
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)
  const [taskToDelete, setTaskToDelete] = useState<number | null>(null)
  const [voiceConfirmOpen, setVoiceConfirmOpen] = useState(false)
  const [pendingVoiceAction, setPendingVoiceAction] = useState<{ type: string; data: any } | null>(null)
  // Añadir este estado para el diálogo de confirmación de cierre de sesión
  const [logoutConfirmOpen, setLogoutConfirmOpen] = useState(false)

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

  // En el método fetchTasks, actualizar para ordenar por prioridad
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

        // Ordenar las tareas por prioridad
        const priorityOrder = { alta: 0, media: 1, baja: 2 }
        const sortedTasks = [...data].sort((a, b) => {
          const priorityA = priorityOrder[a.priority as keyof typeof priorityOrder] || 1
          const priorityB = priorityOrder[b.priority as keyof typeof priorityOrder] || 1
          return priorityA - priorityB
        })

        setTasks(sortedTasks)
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

    // Asignar categoría a una tarea específica
    else if (
      lowerTranscript.includes("asignar categoría") ||
      lowerTranscript.includes("cambiar categoría") ||
      lowerTranscript.includes("poner categoría")
    ) {
      // Extraer el nombre de la tarea y la categoría
      const match = transcript.match(/(?:asignar|cambiar|poner) categoría (.+?) (?:a|para) (?:la )?tarea (.+)/i)

      if (match) {
        const categoryName = match[1].trim().toLowerCase()
        const taskTitle = match[2].trim()

        // Buscar la categoría por nombre
        const category = categories.find((c) => c.name.toLowerCase() === categoryName)

        if (!category) {
          speakText(`No encontré la categoría ${categoryName}. Por favor, crea esta categoría primero.`)
          return
        }

        // Buscar la tarea por título
        const task = tasks.find((t) => t.title.toLowerCase().includes(taskTitle.toLowerCase()) && !t.completed)

        if (!task) {
          speakText(`No encontré la tarea "${taskTitle}" en tu lista de pendientes.`)
          return
        }

        // Actualizar la tarea con la nueva categoría
        try {
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              categoryId: category.id,
            }),
          })

          if (!response.ok) {
            throw new Error("Error al actualizar la tarea")
          }

          const updatedTask = await response.json()
          setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)))

          const confirmationText = `He asignado la categoría ${category.name} a la tarea "${task.title}"`
          setFeedback(confirmationText)
          speakText(confirmationText)
        } catch (error) {
          console.error("Error al asignar categoría:", error)
          speakText("Hubo un error al asignar la categoría a la tarea")
        }
      } else {
        speakText(
          "No entendí qué categoría quieres asignar a qué tarea. Por favor, intenta de nuevo con el formato: Asignar categoría [nombre de categoría] a tarea [nombre de tarea]",
        )
      }
    }

    // Asignar categoría a todas las tareas o a un grupo de tareas
    else if (
      lowerTranscript.includes("asignar categoría a todas") ||
      lowerTranscript.includes("cambiar categoría de todas") ||
      lowerTranscript.includes("categorizar todas")
    ) {
      // Extraer el nombre de la categoría
      const match = transcript.match(
        /(?:asignar categoría|cambiar categoría|categorizar) (?:a |de )?todas (?:las tareas )?(?:a |como |en )?(.+)/i,
      )

      if (match) {
        const categoryName = match[1].trim().toLowerCase()

        // Buscar la categoría por nombre
        const category = categories.find((c) => c.name.toLowerCase() === categoryName)

        if (!category) {
          speakText(`No encontré la categoría ${categoryName}. Por favor, crea esta categoría primero.`)
          return
        }

        // Obtener todas las tareas pendientes
        const pendingTasks = tasks.filter((t) => !t.completed)

        if (pendingTasks.length === 0) {
          speakText("No tienes tareas pendientes para categorizar.")
          return
        }

        // Guardar la acción pendiente y mostrar el diálogo de confirmación
        setPendingVoiceAction({
          type: "assignCategoryToAll",
          data: {
            categoryId: category.id,
            categoryName: category.name,
            pendingTasks: pendingTasks,
          },
        })
        setVoiceConfirmOpen(true)

        const confirmationText = `¿Quieres asignar la categoría ${category.name} a tus ${pendingTasks.length} tareas pendientes?`
        setFeedback(confirmationText)
        speakText(confirmationText)
        return
      } else {
        speakText(
          "No entendí qué categoría quieres asignar a todas las tareas. Por favor, intenta de nuevo con el formato: Asignar categoría a todas las tareas como [nombre de categoría]",
        )
      }
    }

    // Quitar categoría de una tarea
    else if (
      lowerTranscript.includes("quitar categoría") ||
      lowerTranscript.includes("eliminar categoría") ||
      lowerTranscript.includes("remover categoría")
    ) {
      // Extraer el nombre de la tarea
      const match = transcript.match(/(?:quitar|eliminar|remover) categoría (?:de |a )?(?:la )?tarea (.+)/i)

      if (match) {
        const taskTitle = match[1].trim()

        // Buscar la tarea por título
        const task = tasks.find((t) => t.title.toLowerCase().includes(taskTitle.toLowerCase()))

        if (!task) {
          speakText(`No encontré la tarea "${taskTitle}" en tu lista.`)
          return
        }

        if (!task.categoryId) {
          speakText(`La tarea "${task.title}" no tiene una categoría asignada.`)
          return
        }

        // Actualizar la tarea para quitar la categoría
        try {
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              categoryId: null,
            }),
          })

          if (!response.ok) {
            throw new Error("Error al actualizar la tarea")
          }

          const updatedTask = await response.json()
          setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)))

          const confirmationText = `He quitado la categoría de la tarea "${task.title}"`
          setFeedback(confirmationText)
          speakText(confirmationText)
        } catch (error) {
          console.error("Error al quitar categoría:", error)
          speakText("Hubo un error al quitar la categoría de la tarea")
        }
      } else {
        speakText(
          "No entendí de qué tarea quieres quitar la categoría. Por favor, intenta de nuevo con el formato: Quitar categoría de tarea [nombre de tarea]",
        )
      }
    }

    // Actualizar el manejo de comandos de voz para incluir prioridad
    else if (
      lowerTranscript.includes("asignar prioridad") ||
      lowerTranscript.includes("cambiar prioridad") ||
      lowerTranscript.includes("marcar como prioritaria")
    ) {
      // Extraer el nivel de prioridad y el nombre de la tarea
      const match =
        transcript.match(
          /(?:asignar|cambiar) prioridad (?:a|de) (?:la )?tarea (.+?) (?:como|a) (?:prioridad )?(alta|media|baja)/i,
        ) || transcript.match(/marcar (?:la )?tarea (.+?) como (?:prioridad )?(alta|media|baja)/i)

      if (match) {
        const taskTitle = match[1].trim()
        const priority = match[2].toLowerCase()

        // Buscar la tarea por título
        const task = tasks.find((t) => t.title.toLowerCase().includes(taskTitle.toLowerCase()))

        if (!task) {
          speakText(`No encontré la tarea "${taskTitle}" en tu lista.`)
          return
        }

        // Actualizar la tarea con la nueva prioridad
        try {
          const response = await fetch(`/api/tasks/${task.id}`, {
            method: "PATCH",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              priority: priority,
            }),
          })

          console.log('respuesta', response);
          
          /*if (!response.ok) {
            throw new Error("Error al actualizar la tarea")
          }*/

          const updatedTask = await response.json()
          setTasks((prev) => prev.map((t) => (t.id === task.id ? updatedTask : t)))

          const confirmationText = `He cambiado la prioridad de la tarea "${task.title}" a ${priority}`
          setFeedback(confirmationText)
          speakText(confirmationText)
        } catch (error) {
          console.error("Error al asignar prioridad:", error)
          speakText("Hubo un error al asignar la prioridad a la tarea")
        }
      } else {
        speakText(
          "No entendí qué prioridad quieres asignar a qué tarea. Por favor, intenta de nuevo con el formato: Asignar prioridad a tarea [nombre de tarea] como [alta/media/baja]",
        )
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

  // Modificar la función handleLogout
  const handleLogout = () => {
    setLogoutConfirmOpen(true)
  }

  // Añadir esta función para realizar el cierre de sesión
  const confirmLogout = async () => {
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
    setTaskToDelete(id)
    setDeleteConfirmOpen(true)
  }

  const confirmDeleteTask = async () => {
    if (!taskToDelete) return

    try {
      const response = await fetch(`/api/tasks/${taskToDelete}`, {
        method: "DELETE",
      })

      if (!response.ok) {
        throw new Error("Error al eliminar la tarea")
      }

      setTasks((prev) => prev.filter((t) => t.id !== taskToDelete))
      setDeleteConfirmOpen(false)
      setTaskToDelete(null)
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

  const executeConfirmedVoiceAction = async () => {
    if (!pendingVoiceAction) return

    switch (pendingVoiceAction.type) {
      case "assignCategoryToAll": {
        const { categoryId, categoryName, pendingTasks } = pendingVoiceAction.data

        let updatedCount = 0
        const updatePromises = pendingTasks.map(async (task: Task) => {
          try {
            const response = await fetch(`/api/tasks/${task.id}`, {
              method: "PATCH",
              headers: {
                "Content-Type": "application/json",
              },
              body: JSON.stringify({
                categoryId: categoryId,
              }),
            })

            if (response.ok) {
              updatedCount++
              return await response.json()
            }
            return null
          } catch (error) {
            console.error(`Error al actualizar tarea ${task.id}:`, error)
            return null
          }
        })

        Promise.all(updatePromises).then((updatedTasks) => {
          // Filtrar tareas nulas (las que fallaron)
          const validUpdatedTasks = updatedTasks.filter((t) => t !== null)

          // Actualizar el estado de las tareas
          setTasks((prev) => {
            const newTasks = [...prev]
            validUpdatedTasks.forEach((updatedTask) => {
              const index = newTasks.findIndex((t) => t.id === updatedTask.id)
              if (index !== -1) {
                newTasks[index] = updatedTask
              }
            })
            return newTasks
          })

          const resultText = `He asignado la categoría ${categoryName} a ${updatedCount} tareas pendientes.`
          setFeedback(resultText)
          speakText(resultText)
        })
        break
      }
      // Puedes añadir más casos para otras acciones que requieran confirmación
    }

    setVoiceConfirmOpen(false)
    setPendingVoiceAction(null)
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
                        'Puedes decir: "Crear tarea", "Mis tareas pendientes", "Completar tarea", "Filtrar por categoría", "Asignar categoría [nombre] a tarea [título]", "Asignar categoría a todas como [nombre]", "Quitar categoría de tarea [título]" o "Asignar prioridad a tarea [título] como [alta/media/baja]"',
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
                <TaskList tasks={tasks.filter((t) => t.completed)} onComplete={() => {}} completed />
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

      {/* Diálogo de confirmación para eliminar tarea */}
      <ConfirmationDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Eliminar tarea"
        description="¿Estás seguro de que deseas eliminar esta tarea? Esta acción no se puede deshacer."
        confirmText="Eliminar"
        cancelText="Cancelar"
        onConfirm={confirmDeleteTask}
      />

      {/* Diálogo de confirmación para acciones por voz */}
      <ConfirmationDialog
        open={voiceConfirmOpen}
        onOpenChange={setVoiceConfirmOpen}
        title="Confirmar acción"
        description={
          pendingVoiceAction?.type === "assignCategoryToAll"
            ? `¿Quieres asignar la categoría ${pendingVoiceAction.data.categoryName} a ${pendingVoiceAction.data.pendingTasks.length} tareas pendientes?`
            : "¿Confirmas esta acción?"
        }
        confirmText="Confirmar"
        cancelText="Cancelar"
        onConfirm={executeConfirmedVoiceAction}
      />
      {/* Diálogo de confirmación para cerrar sesión */}
      <ConfirmationDialog
        open={logoutConfirmOpen}
        onOpenChange={setLogoutConfirmOpen}
        title="Cerrar sesión"
        description="¿Estás seguro de que deseas cerrar sesión?"
        confirmText="Cerrar sesión"
        cancelText="Cancelar"
        onConfirm={confirmLogout}
      />
    </main>
  )
}
