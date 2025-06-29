import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { SIMPLIFY_PROMPT } from "@/lib/prompts"

export const maxDuration = 30

export async function POST(req: Request) {
  try {
    const { instructions } = await req.json()

    if (!instructions) {
      return new Response(JSON.stringify({ error: "Instructions are required." }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      })
    }

    const prompt = SIMPLIFY_PROMPT.replace("{{INSTRUCTIONS}}", instructions)

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    })

    // The AI is instructed to return a JSON array string. We parse it here.
    const steps = JSON.parse(text)

    if (!Array.isArray(steps)) {
      throw new Error("AI did not return a valid array of steps.")
    }

    return new Response(JSON.stringify({ steps }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error(error)
    let errorMessage = "An unexpected error occurred."
    if (error instanceof Error) {
      errorMessage = error.message
    }
    if (error instanceof SyntaxError) {
      errorMessage = "Failed to parse the AI's response. The format might be incorrect."
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
