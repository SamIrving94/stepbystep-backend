"use client"

import { useState } from "react"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Loader2, Sparkles, RefreshCw, Link } from "lucide-react"
import { StepViewer } from "@/components/step-viewer"
import { ChatAssistant } from "@/components/chat-assistant"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Input } from "@/components/ui/input"

export function InstructionProcessor() {
  const [activeTab, setActiveTab] = useState("text")
  const [originalInstructions, setOriginalInstructions] = useState("")
  const [url, setUrl] = useState("")
  const [instructionContext, setInstructionContext] = useState("")
  const [simplifiedSteps, setSimplifiedSteps] = useState<string[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handleSimplify = async () => {
    setIsLoading(true)
    setError(null)
    setSimplifiedSteps([])
    setInstructionContext("")

    try {
      let response
      if (activeTab === "text") {
        if (!originalInstructions.trim()) {
          throw new Error("Please enter some instructions to simplify.")
        }
        response = await fetch("/api/simplify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ instructions: originalInstructions }),
        })
        if (response.ok) {
          setInstructionContext(originalInstructions)
        }
      } else {
        if (!url.trim()) {
          throw new Error("Please enter a URL to simplify.")
        }
        response = await fetch("/api/fetch-and-simplify", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ url }),
        })
      }

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Failed to simplify instructions.")
      }

      const data = await response.json()
      setSimplifiedSteps(data.steps)
      if (data.extractedText) {
        setInstructionContext(data.extractedText)
      }
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }

  const handleReset = () => {
    setOriginalInstructions("")
    setUrl("")
    setInstructionContext("")
    setSimplifiedSteps([])
    setError(null)
    setIsLoading(false)
    setActiveTab("text")
  }

  if (simplifiedSteps.length > 0) {
    return (
      <div className="space-y-8">
        <StepViewer steps={simplifiedSteps} />
        <ChatAssistant instructionContext={instructionContext} />
        <div className="text-center">
          <Button variant="outline" onClick={handleReset}>
            <RefreshCw className="mr-2 h-4 w-4" />
            Start Over
          </Button>
        </div>
      </div>
    )
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Input Instructions</CardTitle>
        <CardDescription>Paste text or a link to a recipe, DIY guide, or article.</CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="text">Paste Text</TabsTrigger>
            <TabsTrigger value="link">From Link</TabsTrigger>
          </TabsList>
          <TabsContent value="text" className="mt-4">
            <Textarea
              placeholder="e.g., First, preheat your oven to 350°F. While it's heating, mix the flour, sugar, and eggs in a large bowl..."
              value={originalInstructions}
              onChange={(e) => setOriginalInstructions(e.target.value)}
              rows={10}
              className="text-base"
              disabled={isLoading}
            />
          </TabsContent>
          <TabsContent value="link" className="mt-4">
            <div className="relative">
              <Link className="absolute left-3 top-1/2 -translate-y-1/2 h-5 w-5 text-muted-foreground" />
              <Input
                type="url"
                placeholder="https://example.com/recipes/your-favorite-dish"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                className="pl-10 text-base"
                disabled={isLoading}
              />
            </div>
          </TabsContent>
        </Tabs>

        {error && <p className="mt-4 text-sm text-destructive">{error}</p>}

        <Button onClick={handleSimplify} disabled={isLoading} className="w-full mt-4">
          {isLoading ? (
            <>
              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              Simplifying...
            </>
          ) : (
            <>
              <Sparkles className="mr-2 h-4 w-4" />
              Simplify Instructions
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  )
}
