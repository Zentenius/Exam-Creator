"use client"

import { useState } from "react"
import { QuizConfigForm } from "@/components/quiz-config-form"
import { QuizPreview } from "@/components/quiz-preview"
import { QuizMode } from "@/components/quiz-mode"
import { QuizProvider } from "@/contexts/quiz-context"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Brain, FileText, Play, Download } from "lucide-react"
import { QuizResults } from "@/components/quiz-results"

type AppState = "config" | "preview" | "quiz" | "results"

export default function Home() {
  const [currentState, setCurrentState] = useState<AppState>("config")

  const renderCurrentState = () => {
    switch (currentState) {
      case "config":
        return <QuizConfigForm onNext={() => setCurrentState("preview")} />
      case "preview":
        return <QuizPreview onBack={() => setCurrentState("config")} onStartQuiz={() => setCurrentState("quiz")} />
      case "quiz":
        return <QuizMode onBack={() => setCurrentState("preview")} onComplete={() => setCurrentState("results")} />
      case "results":
        return <QuizResults onBack={() => setCurrentState("config")} onReview={() => setCurrentState("preview")} />
      default:
        return null
    }
  }

  const getStateIcon = (state: AppState) => {
    switch (state) {
      case "config":
        return <Brain className="w-4 h-4" />
      case "preview":
        return <FileText className="w-4 h-4" />
      case "quiz":
        return <Play className="w-4 h-4" />
      case "results":
        return <Download className="w-4 h-4" />
    }
  }

  const getStateTitle = (state: AppState) => {
    switch (state) {
      case "config":
        return "Configure Quiz"
      case "preview":
        return "Preview & Edit"
      case "quiz":
        return "Take Quiz"
      case "results":
        return "Results & Export"
    }
  }

  return (
    <QuizProvider>
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800">
        <div className="container mx-auto px-4 py-8">
          {/* Header */}
          <div className="text-center mb-8">
            <h1 className="text-4xl font-bold text-gray-900 dark:text-white mb-2">🧠 AI Quiz Generator</h1>
            <p className="text-lg text-gray-600 dark:text-gray-300">Create intelligent quizzes powered by Mistral AI</p>
          </div>

          {/* Progress Indicator */}
          <div className="flex justify-center mb-8">
            <div className="flex space-x-4">
              {(["config", "preview", "quiz", "results"] as AppState[]).map((state, index) => (
                <div
                  key={state}
                  className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
                    currentState === state
                      ? "bg-primary text-primary-foreground"
                      : index < (["config", "preview", "quiz", "results"] as AppState[]).indexOf(currentState)
                        ? "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
                        : "bg-gray-100 text-gray-600 dark:bg-gray-700 dark:text-gray-400"
                  }`}
                >
                  {getStateIcon(state)}
                  <span>{getStateTitle(state)}</span>
                </div>
              ))}
            </div>
          </div>

          {/* Main Content */}
          <Card className="max-w-4xl mx-auto">
            <CardHeader>
              <CardTitle className="flex items-center space-x-2">
                {getStateIcon(currentState)}
                <span>{getStateTitle(currentState)}</span>
              </CardTitle>
              <CardDescription>
                {currentState === "config" && "Set up your quiz parameters and provide source material"}
                {currentState === "preview" && "Review and edit generated questions before taking the quiz"}
                {currentState === "quiz" && "Answer the questions at your own pace"}
                {currentState === "results" && "View your results and export your quiz"}
              </CardDescription>
            </CardHeader>
            <CardContent>{renderCurrentState()}</CardContent>
          </Card>
        </div>
      </div>
    </QuizProvider>
  )
}
