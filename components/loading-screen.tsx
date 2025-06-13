"use client"

import { Card, CardContent } from "@/components/ui/card"
import { Brain, Sparkles } from "lucide-react"

interface LoadingScreenProps {
  title?: string
  description?: string
}

export function LoadingScreen({
  title = "Generating Your Quiz",
  description = "Our AI is creating personalized questions based on your content...",
}: LoadingScreenProps) {
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
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Analyzing content...</span>
              <span>✓</span>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>Generating questions...</span>
              <div className="animate-spin w-3 h-3 border border-current border-t-transparent rounded-full"></div>
            </div>
            <div className="flex justify-between text-xs text-muted-foreground opacity-50">
              <span>Finalizing quiz...</span>
              <span>⏳</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  )
}
