"use client"

import type React from "react"

import { useState } from "react"
import { useQuiz } from "@/contexts/quiz-context"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Eye, EyeOff, Edit2, Trash2, Play, ArrowLeft, Download, Upload } from "lucide-react"
import { toast } from "@/hooks/use-toast"
import type { Question } from "@/contexts/quiz-context"

interface QuizPreviewProps {
  onBack: () => void
  onStartQuiz: () => void
}

export function QuizPreview({ onBack, onStartQuiz }: QuizPreviewProps) {
  const { state, dispatch } = useQuiz()
  const [editingIndex, setEditingIndex] = useState<number | null>(null)
  const [editingQuestion, setEditingQuestion] = useState<Question | null>(null)

  const { questions, showAnswers } = state

  const handleEditQuestion = (index: number) => {
    setEditingIndex(index)
    setEditingQuestion({ ...questions[index] })
  }

  const handleSaveEdit = () => {
    if (editingIndex !== null && editingQuestion) {
      dispatch({
        type: "UPDATE_QUESTION",
        payload: { index: editingIndex, question: editingQuestion },
      })
      setEditingIndex(null)
      setEditingQuestion(null)
      toast({
        title: "Question updated",
        description: "Your changes have been saved.",
      })
    }
  }

  const handleDeleteQuestion = (index: number) => {
    dispatch({ type: "DELETE_QUESTION", payload: index })
    toast({
      title: "Question deleted",
      description: "The question has been removed from your quiz.",
    })
  }

  const handleExportJSON = () => {
    const quizData = {
      config: state.config,
      questions: questions,
    }
    const blob = new Blob([JSON.stringify(quizData, null, 2)], { type: "application/json" })
    const url = URL.createObjectURL(blob)
    const a = document.createElement("a")
    a.href = url
    a.download = `${state.config?.subject || "quiz"}.json`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)

    toast({
      title: "Quiz exported",
      description: "Your quiz has been saved as a JSON file.",
    })
  }

  const handleImportJSON = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/json") {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const quizData = JSON.parse(e.target?.result as string)
          if (quizData.config && quizData.questions) {
            dispatch({ type: "SET_CONFIG", payload: quizData.config })
            dispatch({ type: "SET_QUESTIONS", payload: quizData.questions })
            toast({
              title: "Quiz imported",
              description: "Your quiz has been loaded successfully.",
            })
          }
        } catch (error) {
          toast({
            title: "Import failed",
            description: "Invalid quiz file format.",
            variant: "destructive",
          })
        }
      }
      reader.readAsText(file)
    }
  }

  const getQuestionTypeColor = (type: string) => {
    switch (type) {
      case "MCQ":
        return "bg-blue-100 text-blue-800 border-blue-200"
      case "TF":
        return "bg-green-100 text-green-800 border-green-200"
      case "MATCHING":
        return "bg-purple-100 text-purple-800 border-purple-200"
      case "ESSAY":
        return "bg-orange-100 text-orange-800 border-orange-200"
      default:
        return "bg-gray-100 text-gray-800 border-gray-200"
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

  if (questions.length === 0) {
    return (
      <div className="text-center space-y-4">
        <p className="text-muted-foreground">No questions generated yet.</p>
        <Button onClick={onBack}>
          <ArrowLeft className="w-4 h-4 mr-2" />
          Back to Configuration
        </Button>
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Header Actions */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center space-x-2">
          <Button variant="outline" onClick={onBack}>
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back
          </Button>
          <Button variant="outline" onClick={() => dispatch({ type: "TOGGLE_ANSWERS" })}>
            {showAnswers ? <EyeOff className="w-4 h-4 mr-2" /> : <Eye className="w-4 h-4 mr-2" />}
            {showAnswers ? "Hide" : "Show"} Answers
          </Button>
        </div>

        <div className="flex items-center space-x-2">
          <label htmlFor="import-json">
            <Button variant="outline" asChild>
              <span>
                <Upload className="w-4 h-4 mr-2" />
                Import JSON
              </span>
            </Button>
          </label>
          <input id="import-json" type="file" accept=".json" onChange={handleImportJSON} className="hidden" />

          <Button variant="outline" onClick={handleExportJSON}>
            <Download className="w-4 h-4 mr-2" />
            Export JSON
          </Button>

          <Button onClick={onStartQuiz}>
            <Play className="w-4 h-4 mr-2" />
            Start Quiz
          </Button>
        </div>
      </div>

      {/* Quiz Summary */}
      <Card>
        <CardHeader>
          <CardTitle>Quiz Summary</CardTitle>
          <CardDescription>
            {questions.length} questions generated for {state.config?.subject}
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-2">
            {Object.entries(
              questions.reduce(
                (acc, q) => {
                  acc[q.type] = (acc[q.type] || 0) + 1
                  return acc
                },
                {} as Record<string, number>,
              ),
            ).map(([type, count]) => (
              <Badge key={type} variant="outline" className={getQuestionTypeColor(type)}>
                {type === "MCQ"
                  ? "Multiple Choice"
                  : type === "TF"
                    ? "True/False"
                    : type === "MATCHING"
                      ? "Matching"
                      : "Essay"}
                : {count}
              </Badge>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Questions List */}
      <div className="space-y-4">
        {questions.map((question, index) => (
          <Card key={question.id} className="relative">
            <CardHeader className="pb-3">
              <div className="flex items-start justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className={getQuestionTypeColor(question.type)}>
                    {question.type}
                  </Badge>
                  <Badge variant="outline" className={getDifficultyColor(question.difficulty)}>
                    {question.difficulty}
                  </Badge>
                  <span className="text-sm text-muted-foreground">#{index + 1}</span>
                </div>
                <div className="flex items-center space-x-1">
                  <Button variant="ghost" size="sm" onClick={() => handleEditQuestion(index)}>
                    <Edit2 className="w-4 h-4" />
                  </Button>
                  <Button variant="ghost" size="sm" onClick={() => handleDeleteQuestion(index)}>
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>
            </CardHeader>

            <CardContent>
              {editingIndex === index ? (
                <div className="space-y-4">
                  <Textarea
                    value={editingQuestion?.question || ""}
                    onChange={(e) =>
                      setEditingQuestion((prev) => (prev ? { ...prev, question: e.target.value } : null))
                    }
                    placeholder="Question text"
                  />

                  {question.type === "MCQ" && editingQuestion?.options && (
                    <div className="space-y-2">
                      <label className="text-sm font-medium">Options:</label>
                      {editingQuestion.options.map((option, optIndex) => (
                        <Input
                          key={optIndex}
                          value={option}
                          onChange={(e) => {
                            const newOptions = [...editingQuestion.options!]
                            newOptions[optIndex] = e.target.value
                            setEditingQuestion((prev) => (prev ? { ...prev, options: newOptions } : null))
                          }}
                          placeholder={`Option ${optIndex + 1}`}
                        />
                      ))}
                    </div>
                  )}

                  <Input
                    value={
                      Array.isArray(editingQuestion?.answer)
                        ? editingQuestion.answer.join(", ")
                        : editingQuestion?.answer || ""
                    }
                    onChange={(e) => setEditingQuestion((prev) => (prev ? { ...prev, answer: e.target.value } : null))}
                    placeholder="Correct answer"
                  />

                  <div className="flex space-x-2">
                    <Button onClick={handleSaveEdit}>Save</Button>
                    <Button variant="outline" onClick={() => setEditingIndex(null)}>
                      Cancel
                    </Button>
                  </div>
                </div>
              ) : (
                <div className="space-y-3">
                  <p className="font-medium">{question.question}</p>

                  {question.type === "MCQ" && question.options && (
                    <div className="space-y-1">
                      {question.options.map((option, optIndex) => (
                        <div
                          key={optIndex}
                          className={`p-2 rounded border text-sm ${
                            showAnswers && option === question.answer
                              ? "bg-green-50 border-green-200 text-green-800"
                              : "bg-gray-50 border-gray-200"
                          }`}
                        >
                          {String.fromCharCode(65 + optIndex)}. {option}
                        </div>
                      ))}
                    </div>
                  )}

                  {showAnswers && (
                    <div className="p-3 bg-green-50 border border-green-200 rounded">
                      <p className="text-sm font-medium text-green-800">
                        Answer: {Array.isArray(question.answer) ? question.answer.join(", ") : question.answer}
                      </p>
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
