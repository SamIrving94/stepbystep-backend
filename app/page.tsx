import { InstructionProcessor } from "@/components/instruction-processor"

export default function Home() {
  return (
    <div className="bg-background text-foreground min-h-screen w-full">
      <main className="container mx-auto max-w-2xl p-4 md:p-8">
        <header className="text-center mb-8">
          <h1 className="text-4xl font-bold tracking-tight">🛠️ Accessible Instruction Assistant</h1>
          <p className="text-muted-foreground mt-2">Transform complex instructions into clear, manageable steps.</p>
        </header>
        <InstructionProcessor />
      </main>
    </div>
  )
}
