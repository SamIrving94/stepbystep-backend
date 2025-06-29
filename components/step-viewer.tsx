"use client"

import { useState } from "react"
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Carousel, CarouselContent, CarouselItem, CarouselNext, CarouselPrevious } from "@/components/ui/carousel"
import { Volume2, VolumeX } from "lucide-react"
import { useSpeechSynthesis } from "@/hooks/use-speech-synthesis"
import { Switch } from "@/components/ui/switch"
import { Label } from "@/components/ui/label"

interface StepViewerProps {
  steps: string[]
}

export function StepViewer({ steps }: StepViewerProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [focusMode, setFocusMode] = useState(true)
  const { speak, cancel, isSpeaking } = useSpeechSynthesis()

  const handleSpeak = (text: string) => {
    if (isSpeaking) {
      cancel()
    } else {
      speak(text)
    }
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle>Your Simplified Steps</CardTitle>
          <div className="flex items-center space-x-2">
            <Switch id="focus-mode" checked={focusMode} onCheckedChange={setFocusMode} />
            <Label htmlFor="focus-mode">Focus Mode</Label>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        <Carousel
          className="w-full"
          onSelect={(api) => setCurrentStep(api.selectedScrollSnap())}
          opts={{
            align: "start",
          }}
        >
          <CarouselContent>
            {steps.map((step, index) => (
              <CarouselItem key={index}>
                <div className={`p-1 ${focusMode && index !== currentStep ? "hidden" : ""}`}>
                  <Card className="bg-secondary">
                    <CardContent className="flex flex-col items-center justify-center p-6 gap-4">
                      <p className="text-lg md:text-xl text-center font-medium leading-relaxed">{step}</p>
                      <Button
                        variant="outline"
                        size="icon"
                        onClick={() => handleSpeak(step)}
                        aria-label={isSpeaking ? "Stop reading" : "Read step aloud"}
                      >
                        {isSpeaking ? <VolumeX className="h-5 w-5" /> : <Volume2 className="h-5 w-5" />}
                      </Button>
                    </CardContent>
                  </Card>
                </div>
              </CarouselItem>
            ))}
          </CarouselContent>
          {!focusMode && (
            <>
              <CarouselPrevious className="hidden sm:flex" />
              <CarouselNext className="hidden sm:flex" />
            </>
          )}
        </Carousel>
      </CardContent>
      <CardFooter className="flex justify-center">
        <p className="text-sm text-muted-foreground">
          Step {currentStep + 1} of {steps.length}
        </p>
      </CardFooter>
    </Card>
  )
}
