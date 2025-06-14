"use client"

import { useState, useEffect, useCallback } from "react"
import { useQuiz } from "@/contexts/quiz-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Menu, X } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import { MatchingQuestion } from "./matching-question"

interface QuizModeProps {
  onBack: () => void
  onComplete: () => void
}

export function QuizMode({ onBack, onComplete }: QuizModeProps) {
  const { state, dispatch } = useQuiz()
  const { questions, currentQuestionIndex } = state
  const [selectedAnswer, setSelectedAnswer] = useState<string>("")
  const [essayAnswer, setEssayAnswer] = useState<string>("")
  const [startTime] = useState<Date>(new Date())
  const [timeElapsed, setTimeElapsed] = useState<number>(0)
  const [showNavigationPanel, setShowNavigationPanel] = useState(false)

  const currentQuestion = questions[currentQuestionIndex]
  const isLastQuestion = currentQuestionIndex === questions.length - 1
  const progress = ((currentQuestionIndex + 1) / questions.length) * 100

  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(Math.floor((new Date().getTime() - startTime.getTime()) / 1000))
    }, 1000)

    return () => clearInterval(timer)
  }, [startTime])

  useEffect(() => {
    // Load existing answer when navigating between questions
    if (currentQuestion?.userAnswer) {
      if (currentQuestion.type === "ESSAY") {
        setEssayAnswer(currentQuestion.userAnswer as string)
      } else {
        setSelectedAnswer(currentQuestion.userAnswer as string)
      }
    } else {
      setSelectedAnswer("")
      setEssayAnswer("")
    }
  }, [currentQuestion])

  const handleAnswerChange = useCallback(
    (questionId: string, answer: string) => {
      dispatch({
        type: "SET_USER_ANSWER",
        payload: { questionId, answer },
      })
    },
    [dispatch],
  )

  const handleAnswerSubmit = () => {
    const answer = currentQuestion.type === "ESSAY" ? essayAnswer : selectedAnswer

    if (!answer.trim()) {
      toast({
        title: "Please provide an answer",
        description: "You must answer the question before proceeding.",
        variant: "destructive",
      })
      return
    }

    handleAnswerChange(currentQuestion.id, answer)

    if (isLastQuestion) {
      dispatch({ type: "COMPLETE_QUIZ" })
      onComplete()
      toast({
        title: "Quiz completed!",
        description: "Great job! You've answered all questions.",
      })
    } else {
      dispatch({ type: "SET_CURRENT_QUESTION", payload: currentQuestionIndex + 1 })
      setSelectedAnswer("")
      setEssayAnswer("")
    }
  }

  const handlePreviousQuestion = () => {
    if (currentQuestionIndex > 0) {
      dispatch({ type: "SET_CURRENT_QUESTION", payload: currentQuestionIndex - 1 })
    }
  }

  const goToQuestion = (index: number) => {
    dispatch({ type: "SET_CURRENT_QUESTION", payload: index })
    setShowNavigationPanel(false)
  }

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60)
    const secs = seconds % 60
    return `${mins}:${secs.toString().padStart(2, "0")}`
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

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "bg-green-100 text-green-800"
      case "Medium":
        return "bg-yellow-100 text-yellow-800"
      case "Hard":
        return "bg-red-100 text-red-800"
      default:
        return "bg-gray-100 text-gray-800"
    }
  }

  const isQuestionAnswered = (questionId: string) => {
    const question = questions.find((q) => q.id === questionId)
    return question?.userAnswer && question.userAnswer.toString().trim() !== ""
  }

  if (!currentQuestion) {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">No questions available.</p>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Preview
        </Button>
      </div>
    )
  }

  return (
    <div className="relative">
      {/* Navigation Panel */}
      {showNavigationPanel && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50" onClick={() => setShowNavigationPanel(false)}>
          <div
            className="fixed right-0 top-0 h-full w-80 bg-white shadow-lg p-4 overflow-y-auto"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold">Question Navigation</h3>
              <Button variant="ghost" size="sm" onClick={() => setShowNavigationPanel(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>

            <div className="space-y-2">
              {questions.map((question, index) => (
                <button
                  key={question.id}
                  onClick={() => goToQuestion(index)}
                  className={`w-full text-left p-3 rounded border transition-colors ${
                    index === currentQuestionIndex
                      ? "bg-primary text-primary-foreground"
                      : isQuestionAnswered(question.id)
                        ? "bg-green-50 border-green-200 hover:bg-green-100"
                        : "bg-gray-50 border-gray-200 hover:bg-gray-100"
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <span className="font-medium">#{index + 1}</span>
                      <Badge variant="outline" className={getQuestionTypeColor(question.type)}>
                        {question.type}
                      </Badge>
                    </div>
                    {isQuestionAnswered(question.id) && <CheckCircle className="w-4 h-4 text-green-600" />}
                  </div>
                  <p className="text-sm text-muted-foreground mt-1 truncate">{question.question}</p>
                </button>
              ))}
            </div>
          </div>
        </div>
      )}

      <div className="space-y-6">
        {/* Quiz Header */}
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <Button variant="outline" onClick={onBack}>
              <ArrowLeft className="w-4 h-4 mr-2" />
              Back
            </Button>
            <div className="flex items-center space-x-2 text-sm text-muted-foreground">
              <Clock className="w-4 h-4" />
              <span>{formatTime(timeElapsed)}</span>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Button variant="outline" size="sm" onClick={() => setShowNavigationPanel(true)}>
              <Menu className="w-4 h-4 mr-2" />
              Questions
            </Button>

            <div className="text-sm text-muted-foreground">
              Question {currentQuestionIndex + 1} of {questions.length}
            </div>
          </div>
        </div>

        {/* Progress Bar */}
        <div className="space-y-2">
          <div className="flex justify-between text-sm">
            <span>Progress</span>
            <span>{Math.round(progress)}%</span>
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Current Question */}
        <Card className="ring-2 ring-primary">
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-2">
                <Badge className={getQuestionTypeColor(currentQuestion.type)}>
                  {currentQuestion.type === "MCQ"
                    ? "Multiple Choice"
                    : currentQuestion.type === "TF"
                      ? "True/False"
                      : currentQuestion.type === "MATCHING"
                        ? "Matching"
                        : "Essay"}
                </Badge>
                <Badge className={getDifficultyColor(currentQuestion.difficulty)}>{currentQuestion.difficulty}</Badge>
                <span className="text-sm text-muted-foreground">#{currentQuestionIndex + 1}</span>
              </div>
              <div className="flex items-center space-x-1">
                {questions.slice(0, currentQuestionIndex + 1).map((_, index) => (
                  <div
                    key={index}
                    className={`w-2 h-2 rounded-full ${
                      index < currentQuestionIndex
                        ? "bg-green-500"
                        : index === currentQuestionIndex
                          ? "bg-blue-500"
                          : "bg-gray-300"
                    }`}
                  />
                ))}
              </div>
            </div>
            <CardTitle className="text-lg">{currentQuestion.question}</CardTitle>
          </CardHeader>

          <CardContent className="space-y-4">
            {/* Multiple Choice Questions */}
            {currentQuestion.type === "MCQ" && currentQuestion.options && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  {currentQuestion.options.map((option, index) => (
                    <div key={index} className="flex items-center space-x-2">
                      <RadioGroupItem value={option} id={`option-${index}`} />
                      <Label
                        htmlFor={`option-${index}`}
                        className="flex-1 cursor-pointer p-3 rounded border hover:bg-gray-50 transition-colors"
                      >
                        <span className="font-medium mr-2">{String.fromCharCode(65 + index)}.</span>
                        {option}
                      </Label>
                    </div>
                  ))}
                </div>
              </RadioGroup>
            )}

            {/* True/False Questions */}
            {currentQuestion.type === "TF" && (
              <RadioGroup value={selectedAnswer} onValueChange={setSelectedAnswer}>
                <div className="space-y-3">
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="True" id="true" />
                    <Label
                      htmlFor="true"
                      className="flex-1 cursor-pointer p-3 rounded border hover:bg-gray-50 transition-colors"
                    >
                      True
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="False" id="false" />
                    <Label
                      htmlFor="false"
                      className="flex-1 cursor-pointer p-3 rounded border hover:bg-gray-50 transition-colors"
                    >
                      False
                    </Label>
                  </div>
                </div>
              </RadioGroup>
            )}

            {/* Essay Questions */}
            {currentQuestion.type === "ESSAY" && (
              <div className="space-y-2">
                <Label htmlFor="essay-answer">Your Answer:</Label>
                <Textarea
                  id="essay-answer"
                  placeholder="Write your detailed answer here..."
                  value={essayAnswer}
                  onChange={(e) => setEssayAnswer(e.target.value)}
                  className="min-h-[150px]"
                />
              </div>
            )}

            {/* Matching Questions */}
            {currentQuestion.type === "MATCHING" && (
              <MatchingQuestion
                question=""
                leftItems={currentQuestion.leftItems || []}
                rightItems={currentQuestion.rightItems || []}
                correctMatches={currentQuestion.correctMatches || {}}
                onAnswerChange={(matches) => {
                  const matchString = Object.entries(matches)
                    .map(([right, left]) => `${left}-${right}`)
                    .join(", ")
                  setSelectedAnswer(matchString)
                }}
                userAnswer={
                  selectedAnswer
                    ? Object.fromEntries(
                        selectedAnswer
                          .split(", ")
                          .map((pair) => {
                            const [left, right] = pair.split("-")
                            return [right, left]
                          })
                          .filter(([right, left]) => right && left),
                      )
                    : {}
                }
              />
            )}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="flex justify-between">
          <Button variant="outline" onClick={handlePreviousQuestion} disabled={currentQuestionIndex === 0}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Previous
          </Button>

          <Button onClick={handleAnswerSubmit}>
            {isLastQuestion ? (
              <>
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Quiz
              </>
            ) : (
              <>
                Next
                <ArrowRight className="w-4 h-4 ml-2" />
              </>
            )}
          </Button>
        </div>
      </div>
    </div>
  )
}
