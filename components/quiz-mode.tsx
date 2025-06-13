"use client"

import { useState, useEffect } from "react"
import { useQuiz } from "@/contexts/quiz-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { RadioGroup, RadioGroupItem } from "@/components/ui/radio-group"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Progress } from "@/components/ui/progress"
import { ArrowLeft, ArrowRight, CheckCircle, Clock, Menu, X, LayoutGrid, List } from "lucide-react"
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
  const [fullPageMode, setFullPageMode] = useState(false)
  const [answers, setAnswers] = useState<Record<string, string>>({})

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
    // Load existing answers
    const existingAnswers: Record<string, string> = {}
    questions.forEach((q) => {
      if (q.userAnswer) {
        existingAnswers[q.id] = q.userAnswer as string
      }
    })
    setAnswers(existingAnswers)
  }, [questions])

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

  const handleAnswerChange = (questionId: string, answer: string) => {
    setAnswers((prev) => ({ ...prev, [questionId]: answer }))
    dispatch({
      type: "SET_USER_ANSWER",
      payload: { questionId, answer },
    })
  }

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

  const handleCompleteAllQuestions = () => {
    const unansweredQuestions = questions.filter((q) => !answers[q.id] || !answers[q.id].trim())

    if (unansweredQuestions.length > 0) {
      toast({
        title: "Incomplete questions",
        description: `Please answer all questions. ${unansweredQuestions.length} questions remaining.`,
        variant: "destructive",
      })
      return
    }

    dispatch({ type: "COMPLETE_QUIZ" })
    onComplete()
    toast({
      title: "Quiz completed!",
      description: "Great job! You've answered all questions.",
    })
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
    return answers[questionId] && answers[questionId].trim() !== ""
  }

  const renderSingleQuestion = (question: any, index: number, isCurrentQuestion = false) => (
    <Card key={question.id} className={isCurrentQuestion ? "ring-2 ring-primary" : ""}>
      <CardHeader>
        <div className="flex items-center justify-between">
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
            <Badge className={getDifficultyColor(question.difficulty)}>{question.difficulty}</Badge>
            <span className="text-sm text-muted-foreground">#{index + 1}</span>
          </div>
          {isQuestionAnswered(question.id) && (
            <Badge className="bg-green-100 text-green-800">
              <CheckCircle className="w-3 h-3 mr-1" />
              Answered
            </Badge>
          )}
        </div>
        <CardTitle className="text-lg">{question.question}</CardTitle>
      </CardHeader>

      <CardContent className="space-y-4">
        {/* Multiple Choice Questions */}
        {question.type === "MCQ" && question.options && (
          <RadioGroup
            value={isCurrentQuestion ? selectedAnswer : answers[question.id] || ""}
            onValueChange={(value) => {
              if (isCurrentQuestion) {
                setSelectedAnswer(value)
              } else {
                handleAnswerChange(question.id, value)
              }
            }}
          >
            <div className="space-y-3">
              {question.options.map((option: string, optIndex: number) => (
                <div key={optIndex} className="flex items-center space-x-2">
                  <RadioGroupItem value={option} id={`${question.id}-option-${optIndex}`} />
                  <Label
                    htmlFor={`${question.id}-option-${optIndex}`}
                    className="flex-1 cursor-pointer p-3 rounded border hover:bg-gray-50 transition-colors"
                  >
                    <span className="font-medium mr-2">{String.fromCharCode(65 + optIndex)}.</span>
                    {option}
                  </Label>
                </div>
              ))}
            </div>
          </RadioGroup>
        )}

        {/* True/False Questions */}
        {question.type === "TF" && (
          <RadioGroup
            value={isCurrentQuestion ? selectedAnswer : answers[question.id] || ""}
            onValueChange={(value) => {
              if (isCurrentQuestion) {
                setSelectedAnswer(value)
              } else {
                handleAnswerChange(question.id, value)
              }
            }}
          >
            <div className="space-y-3">
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="True" id={`${question.id}-true`} />
                <Label
                  htmlFor={`${question.id}-true`}
                  className="flex-1 cursor-pointer p-3 rounded border hover:bg-gray-50 transition-colors"
                >
                  True
                </Label>
              </div>
              <div className="flex items-center space-x-2">
                <RadioGroupItem value="False" id={`${question.id}-false`} />
                <Label
                  htmlFor={`${question.id}-false`}
                  className="flex-1 cursor-pointer p-3 rounded border hover:bg-gray-50 transition-colors"
                >
                  False
                </Label>
              </div>
            </div>
          </RadioGroup>
        )}

        {/* Essay Questions */}
        {question.type === "ESSAY" && (
          <div className="space-y-2">
            <Label htmlFor={`${question.id}-essay`}>Your Answer:</Label>
            <Textarea
              id={`${question.id}-essay`}
              placeholder="Write your detailed answer here..."
              value={isCurrentQuestion ? essayAnswer : answers[question.id] || ""}
              onChange={(e) => {
                if (isCurrentQuestion) {
                  setEssayAnswer(e.target.value)
                } else {
                  handleAnswerChange(question.id, e.target.value)
                }
              }}
              className="min-h-[150px]"
            />
          </div>
        )}

        {/* Matching Questions */}
        {question.type === "MATCHING" && (
          <MatchingQuestion
            question=""
            leftItems={question.leftItems || []}
            rightItems={question.rightItems || []}
            correctMatches={question.correctMatches || {}}
            onAnswerChange={(matches) => {
              const matchString = Object.entries(matches)
                .map(([right, left]) => `${left}-${right}`)
                .join(", ")
              if (isCurrentQuestion) {
                setSelectedAnswer(matchString)
              } else {
                handleAnswerChange(question.id, matchString)
              }
            }}
            userAnswer={
              (isCurrentQuestion ? selectedAnswer : answers[question.id])
                ? Object.fromEntries(
                    ((isCurrentQuestion ? selectedAnswer : answers[question.id]) || "")
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
  )

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
            <Button variant="outline" size="sm" onClick={() => setFullPageMode(!fullPageMode)}>
              {fullPageMode ? <List className="w-4 h-4 mr-2" /> : <LayoutGrid className="w-4 h-4 mr-2" />}
              {fullPageMode ? "Single Question" : "Full Page"}
            </Button>

            <Button variant="outline" size="sm" onClick={() => setShowNavigationPanel(true)}>
              <Menu className="w-4 h-4 mr-2" />
              Questions
            </Button>

            {!fullPageMode && (
              <div className="text-sm text-muted-foreground">
                Question {currentQuestionIndex + 1} of {questions.length}
              </div>
            )}
          </div>
        </div>

        {/* Progress Bar */}
        {!fullPageMode && (
          <div className="space-y-2">
            <div className="flex justify-between text-sm">
              <span>Progress</span>
              <span>{Math.round(progress)}%</span>
            </div>
            <Progress value={progress} className="w-full" />
          </div>
        )}

        {/* Full Page Mode */}
        {fullPageMode ? (
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-semibold">All Questions</h2>
              <div className="text-sm text-muted-foreground">
                {Object.keys(answers).filter((id) => answers[id] && answers[id].trim()).length} of {questions.length}{" "}
                answered
              </div>
            </div>

            <div className="space-y-6">
              {questions.map((question, index) => renderSingleQuestion(question, index, false))}
            </div>

            <div className="flex justify-center">
              <Button onClick={handleCompleteAllQuestions} size="lg">
                <CheckCircle className="w-4 h-4 mr-2" />
                Complete Quiz
              </Button>
            </div>
          </div>
        ) : (
          /* Single Question Mode */
          <>
            {renderSingleQuestion(currentQuestion, currentQuestionIndex, true)}

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
          </>
        )}
      </div>
    </div>
  )
}
