"use client"

import { useState, useEffect, useCallback } from "react"

export const useSpeechSynthesis = () => {
  const [isSpeaking, setIsSpeaking] = useState(false)
  const [speechSynthesis, setSpeechSynthesis] = useState<SpeechSynthesis | null>(null)

  useEffect(() => {
    if (typeof window !== "undefined" && "speechSynthesis" in window) {
      setSpeechSynthesis(window.speechSynthesis)
    }
  }, [])

  const speak = useCallback(
    (text: string) => {
      if (!speechSynthesis || isSpeaking) return

      const utterance = new SpeechSynthesisUtterance(text)
      utterance.onstart = () => setIsSpeaking(true)
      utterance.onend = () => setIsSpeaking(false)
      utterance.onerror = () => setIsSpeaking(false)

      speechSynthesis.speak(utterance)
    },
    [speechSynthesis, isSpeaking],
  )

  const cancel = useCallback(() => {
    if (!speechSynthesis) return
    speechSynthesis.cancel()
    setIsSpeaking(false)
  }, [speechSynthesis])

  // Cleanup on component unmount
  useEffect(() => {
    return () => {
      if (speechSynthesis) {
        speechSynthesis.cancel()
      }
    }
  }, [speechSynthesis])

  return { isSpeaking, speak, cancel }
}
