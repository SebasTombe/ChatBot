import { type NextRequest, NextResponse } from "next/server"
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly"

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "Se requiere texto para sintetizar" }, { status: 400 })
    }

    // Verificar credenciales
    if (!process.env.AWS_ACCESS_KEY_ID || !process.env.AWS_SECRET_ACCESS_KEY) {
      console.error("Credenciales de AWS no configuradas")
      return NextResponse.json({ error: "Credenciales de AWS no configuradas" }, { status: 500 })
    }

    // Crear cliente de Polly con la versión 3 del SDK
    const pollyClient = new PollyClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
      },
    })

    // Configurar parámetros para la síntesis de voz
    const params = {
      OutputFormat: "mp3",
      Text: text,
      TextType: "text",
      VoiceId: "Conchita", // Voz en español (femenina)
      Engine: "neural", // Usar el motor neural para mejor calidad
      LanguageCode: "es-ES",
    }

    // Ejecutar comando de síntesis
    const command = new SynthesizeSpeechCommand(params)
    const synthResult = await pollyClient.send(command)

    // Verificar que se haya generado el audio
    if (!synthResult.AudioStream) {
      console.error("No se generó el stream de audio")
      return NextResponse.json({ error: "No se pudo generar el audio" }, { status: 500 })
    }

    // Convertir el AudioStream a un Buffer
    const chunks = []
    const reader = synthResult.AudioStream.getReader()

    let done = false
    while (!done) {
      const { value, done: doneReading } = await reader.read()
      done = doneReading
      if (value) {
        chunks.push(value)
      }
    }

    const audioBuffer = Buffer.concat(chunks)

    // Devolver el audio como respuesta
    return new NextResponse(audioBuffer, {
      headers: {
        "Content-Type": "audio/mpeg",
        "Content-Length": audioBuffer.length.toString(),
      },
    })
  } catch (error) {
    console.error("Error al sintetizar voz:", error)
    return NextResponse.json(
      {
        error: "Error al sintetizar voz",
        details: error instanceof Error ? error.message : String(error),
      },
      { status: 500 },
    )
  }
}
