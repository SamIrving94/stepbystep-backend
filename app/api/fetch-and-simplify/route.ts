import { JSDOM } from "jsdom"
import { Readability } from "@mozilla/readability"
import { openai } from "@ai-sdk/openai"
import { generateText } from "ai"
import { SIMPLIFY_PROMPT } from "@/lib/prompts"

export const maxDuration = 60 // Increase timeout for fetching external URLs

export async function POST(req: Request) {
  try {
    const { url } = await req.json()

    if (!url) {
      return new Response(JSON.stringify({ error: "URL is required." }), { status: 400 })
    }

    // 1. Fetch HTML content from the URL
    const response = await fetch(url)
    if (!response.ok) {
      throw new Error(`Failed to fetch URL: ${response.statusText}`)
    }
    const html = await response.text()

    // 2. Parse the HTML and extract the main content
    const doc = new JSDOM(html, { url })
    const reader = new Readability(doc.window.document)
    const article = reader.parse()

    if (!article || !article.textContent) {
      throw new Error("Could not extract readable content from the URL.")
    }
    const extractedText = article.textContent

    // 3. Send the extracted text to the AI for simplification
    const prompt = SIMPLIFY_PROMPT.replace("{{INSTRUCTIONS}}", extractedText)

    const { text } = await generateText({
      model: openai("gpt-4o"),
      prompt: prompt,
    })

    const steps = JSON.parse(text)

    if (!Array.isArray(steps)) {
      throw new Error("AI did not return a valid array of steps.")
    }

    // 4. Return both the simplified steps and the original extracted text for context
    return new Response(JSON.stringify({ steps, extractedText }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    })
  } catch (error) {
    console.error(error)
    let errorMessage = "An unexpected error occurred."
    if (error instanceof Error) {
      errorMessage = error.message
    }
    return new Response(JSON.stringify({ error: errorMessage }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    })
  }
}
