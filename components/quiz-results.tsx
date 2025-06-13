"use client"

import { useState } from "react"
import { useQuiz } from "@/contexts/quiz-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, Trophy, Sparkles, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { MatchingQuestion } from "./matching-question"

interface QuizResultsProps {
  onBack: () => void
  onReview: () => void
}

export function QuizResults({ onBack, onReview }: QuizResultsProps) {
  const { state } = useQuiz()
  const { questions } = state
  const [feedbackLoading, setFeedbackLoading] = useState<Record<string, boolean>>({})
  const [feedback, setFeedback] = useState<Record<string, string>>({})

  // Calculate score for MCQ and TF questions
  const scorableQuestions = questions.filter((q) => q.type === "MCQ" || q.type === "TF")
  const correctAnswers = scorableQuestions.filter((q) => {
    if (q.type === "MCQ" || q.type === "TF") {
      return q.userAnswer === q.answer
    }
    return false
  })

  const score = scorableQuestions.length > 0 ? (correctAnswers.length / scorableQuestions.length) * 100 : 0
  const totalAnswered = questions.filter((q) => q.userAnswer && q.userAnswer.toString().trim() !== "").length

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-green-600"
    if (score >= 60) return "text-yellow-600"
    return "text-red-600"
  }

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case "MCQ":
        return "bg-blue-100 text-blue-800"
      case "TF":
        return "bg-green-100 text-green-800"
      case "MATCHING":
        return "bg-purple-100 text-purple-800"
      case "ESSAY":
        return "bg-orange-100 text-orange-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const handleGetFeedback = async (questionId: string, userAnswer: string, question: string) => {
    setFeedbackLoading((prev) => ({ ...prev, [questionId]: true }))

    try {
      const response = await fetch("/api/get-feedback", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          question,
          userAnswer,
          subject: state.config?.subject || "General",
        }),
      })

      if (!response.ok) {
        throw new Error("Failed to get feedback")
      }

      const { feedback: aiFeedback } = await response.json()
      setFeedback((prev) => ({ ...prev, [questionId]: aiFeedback }))

      toast({
        title: "Feedback received",
        description: "AI feedback has been generated for your answer.",
      })
    } catch (error) {
      toast({
        title: "Feedback failed",
        description: "Failed to generate feedback. Please try again.",
        variant: "destructive",
      })
    } finally {
      setFeedbackLoading((prev) => ({ ...prev, [questionId]: false }))
    }
  }

  const handleExportResults = () => {
    const resultsData = {
      config: state.config,
      questions: questions,
      score: score,
      totalAnswered: totalAnswered,
      completedAt: new Date().toISOString(),
    }

    const blob = new Blob([JSON.stringify(resultsData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${state.config?.subject || "quiz"}-results.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Results exported",
      description: "Your quiz results have been saved as a JSON file.",
    })
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          New Quiz
        </Button>
        <div className="flex space-x-2">
          <Button variant="outline" onClick={handleExportResults}>
            <Download className="w-4 h-4 mr-2" />
            Export Results
          </Button>
          <Button onClick={onReview}>Review Questions</Button>
        </div>
      </div>

      {/* Score Summary */}
      <Card>
        <CardHeader className="text-center">
          <div className="flex justify-center mb-4">
            <Trophy className={`w-16 h-16 ${getScoreColor(score)}`} />
          </div>
          <CardTitle className="text-2xl">Quiz Completed!</CardTitle>
          <CardDescription>Here's how you performed on {state.config?.subject}</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
            <div className="space-y-2">
              <div className={`text-3xl font-bold ${getScoreColor(score)}`}>
                {scorableQuestions.length > 0 ? `${Math.round(score)}%` : "N/A"}
              </div>
              <div className="text-sm text-muted-foreground">Overall Score</div>
              {scorableQuestions.length > 0 && <Progress value={score} className="w-full" />}
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-blue-600">
                {correctAnswers.length}/{scorableQuestions.length}
              </div>
              <div className="text-sm text-muted-foreground">Correct Answers</div>
            </div>
            <div className="space-y-2">
              <div className="text-3xl font-bold text-purple-600">
                {totalAnswered}/{questions.length}
              </div>
              <div className="text-sm text-muted-foreground">Questions Answered</div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Detailed Results */}
      <div className="space-y-4">
        <h3 className="text-lg font-semibold">Detailed Review</h3>

        {questions.map((question, index) => (
          <Card key={question.id}>
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Badge className={getQuestionTypeColor(question.type)}>
                    {question.type === "MCQ"
                      ? "Multiple Choice"
                      : question.type === "TF"
                        ? "True/False"
                        : question.type === "MATCHING"
                          ? "Matching"
                          : "Essay"}
                  </Badge>
                  <span className="text-sm text-muted-foreground">#{index + 1}</span>
                  {(question.type === "MCQ" || question.type === "TF") && (
                    <Badge
                      variant={question.userAnswer === question.answer ? "default" : "destructive"}
                      className={
                        question.userAnswer === question.answer
                          ? "bg-green-100 text-green-800"
                          : "bg-red-100 text-red-800"
                      }
                    >
                      {question.userAnswer === question.answer ? "Correct" : "Incorrect"}
                    </Badge>
                  )}
                </div>
              </div>
              <CardTitle className="text-base">{question.question}</CardTitle>
            </CardHeader>

            <CardContent className="space-y-4">
              {/* MCQ Display */}
              {question.type === "MCQ" && question.options && (
                <div className="space-y-2">
                  {question.options.map((option, optIndex) => (
                    <div
                      key={optIndex}
                      className={`p-2 rounded border text-sm ${
                        option === question.answer
                          ? "bg-green-50 border-green-200 text-green-800"
                          : option === question.userAnswer
                            ? "bg-red-50 border-red-200 text-red-800"
                            : "bg-gray-50 border-gray-200"
                      }`}
                    >
                      <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                      {option}
                      {option === question.answer && <span className="ml-2 text-green-600">✓ Correct</span>}
                      {option === question.userAnswer && option !== question.answer && (
                        <span className="ml-2 text-red-600">✗ Your Answer</span>
                      )}
                    </div>
                  ))}
                </div>
              )}

              {/* True/False Display */}
              {question.type === "TF" && (
                <div className="space-y-2">
                  <div className="text-sm">
                    <span className="font-medium">Your Answer: </span>
                    <span className={question.userAnswer === question.answer ? "text-green-600" : "text-red-600"}>
                      {question.userAnswer || "Not answered"}
                    </span>
                  </div>
                  <div className="text-sm">
                    <span className="font-medium">Correct Answer: </span>
                    <span className="text-green-600">{question.answer}</span>
                  </div>
                </div>
              )}

              {/* Matching Display */}
              {question.type === "MATCHING" && (
                <MatchingQuestion
                  question=""
                  leftItems={question.leftItems || []}
                  rightItems={question.rightItems || []}
                  correctMatches={question.correctMatches || {}}
                  onAnswerChange={() => {}}
                  userAnswer={
                    question.userAnswer
                      ? Object.fromEntries(
                          (question.userAnswer as string)
                            .split(", ")
                            .map((pair) => {
                              const [left, right] = pair.split("-")
                              return [right, left]
                            })
                            .filter(([right, left]) => right && left),
                        )
                      : {}
                  }
                  showAnswer={true}
                />
              )}

              {/* Essay Display */}
              {question.type === "ESSAY" && (
                <div className="space-y-3">
                  <div>
                    <h5 className="font-medium mb-2">Your Answer:</h5>
                    <div className="p-3 bg-gray-50 border rounded text-sm">{question.userAnswer || "Not answered"}</div>
                  </div>

                  <div>
                    <h5 className="font-medium mb-2">Model Answer:</h5>
                    <div className="p-3 bg-green-50 border border-green-200 rounded text-sm">{question.answer}</div>
                  </div>

                  {question.userAnswer && (
                    <div className="space-y-2">
                      <div className="flex items-center justify-between">
                        <h5 className="font-medium">AI Feedback:</h5>
                        {!feedback[question.id] && (
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() =>
                              handleGetFeedback(question.id, question.userAnswer as string, question.question)
                            }
                            disabled={feedbackLoading[question.id]}
                          >
                            {feedbackLoading[question.id] ? (
                              <>
                                <div className="animate-spin w-4 h-4 mr-2 border-2 border-current border-t-transparent rounded-full" />
                                Generating...
                              </>
                            ) : (
                              <>
                                <Sparkles className="w-4 h-4 mr-2" />
                                Get AI Feedback
                              </>
                            )}
                          </Button>
                        )}
                      </div>

                      {feedback[question.id] && (
                        <div className="p-3 bg-blue-50 border border-blue-200 rounded text-sm">
                          {feedback[question.id]}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  )
}
