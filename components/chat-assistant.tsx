"use client"

import { useChat } from "ai/react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Send, User, Bot } from "lucide-react"
import { cn } from "@/lib/utils"

interface ChatAssistantProps {
  instructionContext: string
}

export function ChatAssistant({ instructionContext }: ChatAssistantProps) {
  const { messages, input, handleInputChange, handleSubmit, isLoading } = useChat({
    api: "/api/chat",
    body: {
      instructionContext,
    },
  })

  return (
    <Card className="w-full">
      <CardHeader>
        <CardTitle>Need Help? Ask Me Anything!</CardTitle>
      </CardHeader>
      <CardContent>
        <ScrollArea className="h-[300px] w-full pr-4">
          <div className="space-y-4">
            {messages.map((m) => (
              <div
                key={m.id}
                className={cn("flex gap-3 text-slate-600 text-sm", m.role === "user" ? "justify-end" : "justify-start")}
              >
                {m.role === "assistant" && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-primary text-primary-foreground shadow">
                    <Bot className="h-5 w-5" />
                  </div>
                )}
                <div className={cn("rounded-lg px-4 py-2", m.role === "user" ? "bg-muted" : "bg-secondary")}>
                  <p className="leading-relaxed">{m.content}</p>
                </div>
                {m.role === "user" && (
                  <div className="flex h-8 w-8 shrink-0 select-none items-center justify-center rounded-md border bg-background shadow">
                    <User className="h-5 w-5" />
                  </div>
                )}
              </div>
            ))}
          </div>
        </ScrollArea>
      </CardContent>
      <CardFooter>
        <form onSubmit={handleSubmit} className="flex w-full items-center space-x-2">
          <Input
            id="message"
            placeholder="e.g., What does 'sauté' mean?"
            className="flex-1"
            autoComplete="off"
            value={input}
            onChange={handleInputChange}
            disabled={isLoading}
          />
          <Button type="submit" size="icon" disabled={isLoading || !input.trim()}>
            <Send className="h-4 w-4" />
            <span className="sr-only">Send Message</span>
          </Button>
        </form>
      </CardFooter>
    </Card>
  )
}
