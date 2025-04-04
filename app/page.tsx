"use client"

import { useState, useEffect, useRef } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Mic, MicOff, Volume2, CheckCircle, Clock } from "lucide-react"
import TaskList from "@/components/task-list"
import VoiceRecognition from "@/components/voice-recognition"
import type { Task } from "@/types/task"

export default function Home() {
  const [tasks, setTasks] = useState<Task[]>([])
  const [isListening, setIsListening] = useState(false)
  const [feedback, setFeedback] = useState("")
  const audioRef = useRef<HTMLAudioElement | null>(null)

  useEffect(() => {
    // Cargar tareas guardadas al iniciar
    const savedTasks = localStorage.getItem("tasks")
    if (savedTasks) {
      setTasks(JSON.parse(savedTasks))
    }

    // Verificar recordatorios al cargar
    checkReminders()

    // Configurar verificación periódica de recordatorios
    const interval = setInterval(checkReminders, 60000) // Cada minuto

    return () => clearInterval(interval)
  }, [])

  useEffect(() => {
    // Guardar tareas cuando cambien
    localStorage.setItem("tasks", JSON.stringify(tasks))
  }, [tasks])

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
        const newTask: Task = {
          id: Date.now().toString(),
          title: taskTitle,
          completed: false,
          createdAt: new Date().toISOString(),
        }

        // Extraer fecha si se menciona
        const dateMatch = taskTitle.match(/para el (\d{1,2})(?: de)? ([a-zA-Z]+)/i)
        if (dateMatch) {
          const day = Number.parseInt(dateMatch[1])
          const month = getMonthNumber(dateMatch[2])
          if (month !== -1) {
            const year = new Date().getFullYear()
            newTask.dueDate = new Date(year, month, day).toISOString()
          }
        }

        setTasks((prev) => [...prev, newTask])
        const confirmationText = `Tarea creada: ${taskTitle}`
        setFeedback(confirmationText)
        speakText(confirmationText)
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
        const updatedTasks = [...tasks]
        updatedTasks[taskIndex].completed = true
        setTasks(updatedTasks)
        const confirmationText = `Tarea completada: ${tasks[taskIndex].title}`
        setFeedback(confirmationText)
        speakText(confirmationText)
      } else {
        speakText("No encontré esa tarea en tu lista de pendientes.")
      }
    }

    // Completar tarea
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

      if (!response.ok) {
        throw new Error(`Error en la respuesta: ${response.status}`)
      }

      const audioBlob = await response.blob()
      const audioUrl = URL.createObjectURL(audioBlob)

      if (audioRef.current) {
        audioRef.current.src = audioUrl
        audioRef.current.onended = () => {
          URL.revokeObjectURL(audioUrl) // Liberar memoria cuando termine
        }
        await audioRef.current.play()
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

  return (
    <main className="container mx-auto p-4">
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
                onClick={() => speakText('Puedes decir: "Crear tarea", "Mis tareas pendientes" o "Completar tarea"')}
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

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle>Tareas Pendientes</CardTitle>
            <Clock className="text-muted-foreground" />
          </CardHeader>
          <CardContent>
            <TaskList
              tasks={tasks.filter((t) => !t.completed)}
              onComplete={(id) => {
                const updatedTasks = tasks.map((t) => (t.id === id ? { ...t, completed: true } : t))
                setTasks(updatedTasks)
                speakText("Tarea marcada como completada")
              }}
            />
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

      <audio ref={audioRef} className="hidden" />
    </main>
  )
}

