import { type NextRequest, NextResponse } from "next/server"
import AWS from "aws-sdk"

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

    // Configurar AWS
    const polly = new AWS.Polly({
      region: "us-east-1",
      accessKeyId: process.env.AWS_ACCESS_KEY_ID,
      secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    })

    // Usar una voz estándar en lugar de neural para mayor compatibilidad
    const params = {
      OutputFormat: "mp3",
      Text: text,
      TextType: "text",
      VoiceId: "Penelope", // Voz en español (femenina) estándar
      // Omitir Engine para usar el estándar
    }

    const synthResult = await polly.synthesizeSpeech(params).promise()

    if (!synthResult.AudioStream) {
      console.error("No se generó el stream de audio")
      return NextResponse.json({ error: "No se pudo generar el audio" }, { status: 500 })
    }

    // Convertir el AudioStream a un Buffer
    const audioBuffer = Buffer.from(synthResult.AudioStream as AWS.Polly.AudioStream)

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
