import { openai } from "@ai-sdk/openai"
import { streamText } from "ai"
import { QA_PROMPT_TEMPLATE } from "@/lib/prompts"

export const maxDuration = 30

export async function POST(req: Request) {
  const { messages, data } = await req.json()
  const { instructionContext } = data

  const systemPrompt = QA_PROMPT_TEMPLATE.replace("{{INSTRUCTIONS}}", instructionContext)

  const result = await streamText({
    model: openai("gpt-4o"),
    system: systemPrompt,
    messages,
  })

  return result.toAIStreamResponse()
}
