"use client"

import { useEffect, useState } from "react"

interface VoiceRecognitionProps {
  onResult: (transcript: string) => void
  onStop: () => void
}

export default function VoiceRecognition({ onResult, onStop }: VoiceRecognitionProps) {
  const [transcript, setTranscript] = useState("")
  const [isListening, setIsListening] = useState(true)

  useEffect(() => {
    let recognition: any = null

    if ("webkitSpeechRecognition" in window || "SpeechRecognition" in window) {
      // Usar el reconocimiento de voz del navegador
      const SpeechRecognition = window.webkitSpeechRecognition || window.SpeechRecognition
      recognition = new SpeechRecognition()
      recognition.continuous = false
      recognition.interimResults = true
      recognition.lang = "es-ES"

      recognition.onstart = () => {
        setIsListening(true)
      }

      recognition.onresult = (event: any) => {
        const current = event.resultIndex
        const currentTranscript = event.results[current][0].transcript
        setTranscript(currentTranscript)

        // Si es un resultado final, enviar al manejador
        if (event.results[current].isFinal) {
          onResult(currentTranscript)
        }
      }

      recognition.onerror = (event: any) => {
        console.error("Error en reconocimiento de voz:", event.error)
        setIsListening(false)
        onStop()
      }

      recognition.onend = () => {
        setIsListening(false)
        onStop()
      }

      recognition.start()
    } else {
      console.error("El reconocimiento de voz no está soportado en este navegador")
      onStop()
    }

    return () => {
      if (recognition) {
        recognition.stop()
      }
    }
  }, [onResult, onStop])

  return (
    <div className="p-4 bg-gray-100 rounded-md w-full max-w-md">
      <div className="text-sm text-gray-500 mb-2">{isListening ? "Escuchando..." : "Procesando..."}</div>
      <div className="font-medium">{transcript || "Di algo..."}</div>
    </div>
  )
}

