import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextResponse } from 'next/server';

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set the runtime to edge for best performance
export const runtime = 'edge';

async function fetchAiResponse(messages: any, writable: WritableStream) {
  const writter = writable.getWriter()
  writter.write('')
  writter.releaseLock()

  await new Promise((resolve) => setTimeout(resolve, 500 * 1000))
  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages
  })

  const stream1 = OpenAIStream(aiResponse)

  stream1.pipeTo(writable)
}
export async function POST(req: Request, res: any) {
  try {
    const { messages } = await req.json();

    const { writable, readable } = new TransformStream(
      //   {
      //   transform(chunk, controller) {
      //     controller.enqueue(chunk)
      //   }
      // }
    )
    // writable.getWriter().write(`0:" 1"`)

    fetchAiResponse(messages, writable)

    return new StreamingTextResponse(readable, { status: 200 })
  } catch (error: any) {
    console.log('Error', error)
    return new NextResponse(error)
  }
}