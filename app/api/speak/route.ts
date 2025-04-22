import { type NextRequest, NextResponse } from "next/server"
import { PollyClient, SynthesizeSpeechCommand } from "@aws-sdk/client-polly"
import { Readable } from "stream"

export async function POST(req: NextRequest) {
  try {
    const { text } = await req.json()

    if (!text) {
      return NextResponse.json({ error: "Se requiere texto para sintetizar" }, { status: 400 })
    }

    if (!process.env.VITE_AWS_ACCESS_KEY_ID || !process.env.VITE_AWS_SECRET_ACCESS_KEY) {
      console.error("Credenciales de AWS no configuradas")
      return NextResponse.json({ error: "Credenciales de AWS no configuradas" }, { status: 500 })
    }

    const pollyClient = new PollyClient({
      region: "us-east-1",
      credentials: {
        accessKeyId: process.env.VITE_AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.VITE_AWS_SECRET_ACCESS_KEY,
      },
    })

    const params = {
      OutputFormat: "mp3",
      Text: text,
      TextType: "text",
      VoiceId: "Conchita",
      Engine: "standard",
      LanguageCode: "es-ES",
    }

    const command = new SynthesizeSpeechCommand(params)
    const synthResult = await pollyClient.send(command)

    if (!synthResult.AudioStream) {
      console.error("No se generó el stream de audio")
      return NextResponse.json({ error: "No se pudo generar el audio" }, { status: 500 })
    }

    const audioStream = synthResult.AudioStream as Readable
    const chunks: Buffer[] = []

    for await (const chunk of audioStream) {
      chunks.push(Buffer.from(chunk))
    }

    const audioBuffer = Buffer.concat(chunks)

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
