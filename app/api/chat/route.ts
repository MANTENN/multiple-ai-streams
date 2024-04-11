import OpenAI from 'openai';
import { OpenAIStream, StreamingTextResponse } from 'ai';
import { NextResponse } from 'next/server';

// Create an OpenAI API client (that's edge friendly!)
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY,
});

// Set the runtime to edge for best performance
export const runtime = 'edge';

async function fetchAiResponse(messages: any, transform: TransformStream, testStream: TransformStream) {
  const { writable, readable } = transform
  const writter = writable.getWriter()
  writter.write('')
  writter.releaseLock()

  await new Promise((resolve) => setTimeout(resolve, 30 * 1000))
  const aiResponse = await openai.chat.completions.create({
    model: 'gpt-4',
    stream: true,
    messages
  })

  const stream1 = OpenAIStream(aiResponse)
  const testWritter = testStream.writable.getWriter()
  testWritter.write(`0:" Fuck off!"\n`)
  testWritter.releaseLock()
  const responses = [stream1, testStream.readable]

  responses.reduce(
    (a, res, i, arr) =>
      a.then(() => res.pipeTo(writable, { preventClose: i + 1 !== arr.length })),
    Promise.resolve(),
  );

  // stream1.pipeTo(writable, { preventClose: true }).then(async _ => {
  //   console.log('write completed?')
  //   // writter.write(`0:" Successfully written."\n`)
  //   // writter.close()
  // })
}
export async function POST(req: Request, res: any) {
  try {
    const { messages } = await req.json();

    const transform = new TransformStream(
      {
        transform(chunk, controller) {
          controller.enqueue(chunk)
        }
      }
    )

    fetchAiResponse(messages, transform, new TransformStream())

    return new StreamingTextResponse(transform.readable, { status: 200 })
  } catch (error: any) {
    console.log('Error', error)
    return new NextResponse(error)
  }
}