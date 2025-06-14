"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Brain, Sparkles, CheckCircle } from "lucide-react"
import { useState, useEffect } from "react"

interface LoadingScreenProps {
  title?: string
  description?: string
}

export function LoadingScreen({
  title = "Generating Your Quiz",
  description = "Our AI is creating personalized questions based on your content...",
}: LoadingScreenProps) {
  const [currentStep, setCurrentStep] = useState(0)
  const [completedSteps, setCompletedSteps] = useState<number[]>([])

  const steps = [
    "Analyzing content...",
    "Generating Multiple Choice questions...",
    "Creating True/False questions...",
    "Building Matching questions...",
    "Crafting Essay questions...",
    "Finalizing quiz...",
  ]

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentStep((prev) => {
        const next = (prev + 1) % steps.length
        if (next === 0) {
          // Reset when we complete a cycle
          setCompletedSteps([])
        } else {
          setCompletedSteps((completed) => [...completed, prev])
        }
        return next
      })
    }, 2000) // Change step every 2 seconds

    return () => clearInterval(interval)
  }, [steps.length])

  return (
    <div className="flex items-center justify-center min-h-[400px]">
      <Card className="w-full max-w-md">
        <CardContent className="flex flex-col items-center justify-center p-8 space-y-6">
          {/* Animated Brain Icon */}
          <div className="relative">
            <Brain className="w-16 h-16 text-primary animate-pulse" />
            <div className="absolute -top-2 -right-2">
              <Sparkles className="w-6 h-6 text-yellow-500 animate-bounce" />
            </div>
          </div>

          {/* Loading Text */}
          <div className="text-center space-y-2">
            <h3 className="text-lg font-semibold">{title}</h3>
            <p className="text-sm text-muted-foreground">{description}</p>
          </div>

          {/* Loading Animation */}
          <div className="flex space-x-1">
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "0ms" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "150ms" }}></div>
            <div className="w-2 h-2 bg-primary rounded-full animate-bounce" style={{ animationDelay: "300ms" }}></div>
          </div>

          {/* Progress Steps */}
          <div className="w-full space-y-2">
            {steps.map((step, index) => (
              <div key={index} className="flex justify-between text-xs">
                <span
                  className={
                    completedSteps.includes(index)
                      ? "text-green-600"
                      : index === currentStep
                        ? "text-primary font-medium"
                        : "text-muted-foreground opacity-50"
                  }
                >
                  {step}
                </span>
                <span>
                  {completedSteps.includes(index) ? (
                    <CheckCircle className="w-3 h-3 text-green-600" />
                  ) : index === currentStep ? (
                    <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
                  ) : (
                    <span className="text-muted-foreground opacity-50">⏳</span>
                  )}
                </span>
              </div>
            ))}
          </div>

          <div className="text-xs text-muted-foreground text-center">
            Generating questions in batches for better reliability...
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
