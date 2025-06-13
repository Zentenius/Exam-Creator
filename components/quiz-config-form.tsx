"use client"

import type React from "react"

import { useState } from "react"
import { useQuiz } from "@/contexts/quiz-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Upload, FileText, Settings, Sparkles, Download } from "lucide-react"
import { toast } from "@/hooks/use-toast"

interface QuizConfigFormProps {
  onNext: () => void
}

export function QuizConfigForm({ onNext }: QuizConfigFormProps) {
  const { dispatch } = useQuiz()
  const [formData, setFormData] = useState({
    subject: "",
    difficulty: "Medium" as "Easy" | "Medium" | "Hard",
    notes: "",
    questionCounts: {
      MCQ: 5,
      TF: 3,
      MATCHING: 2,
      ESSAY: 1,
    },
  })

  const handleJSONImport = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "application/json") {
      const reader = new FileReader()
      reader.onload = (e) => {
        try {
          const quizData = JSON.parse(e.target?.result as string)
          if (quizData.config && quizData.questions) {
            setFormData(quizData.config)
            dispatch({ type: "SET_CONFIG", payload: quizData.config })
            dispatch({ type: "SET_QUESTIONS", payload: quizData.questions })
            toast({
              title: "Quiz imported successfully",
              description: "Your quiz configuration and questions have been loaded.",
            })
            onNext() // Go directly to preview since we have questions
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

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0]
    if (file && file.type === "text/plain") {
      const reader = new FileReader()
      reader.onload = (e) => {
        const content = e.target?.result as string
        setFormData((prev) => ({ ...prev, notes: content }))
        toast({
          title: "File uploaded successfully",
          description: "Your notes have been loaded into the text area.",
        })
      }
      reader.readAsText(file)
    } else {
      toast({
        title: "Invalid file type",
        description: "Please upload a .txt file.",
        variant: "destructive",
      })
    }
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (!formData.subject.trim() || !formData.notes.trim()) {
      toast({
        title: "Missing information",
        description: "Please provide both subject and notes.",
        variant: "destructive",
      })
      return
    }

    dispatch({ type: "SET_CONFIG", payload: formData })

    // Generate questions
    dispatch({ type: "SET_GENERATING", payload: true })

    try {
      const response = await fetch("/api/generate-questions", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(formData),
      })

      if (!response.ok) {
        throw new Error("Failed to generate questions")
      }

      const { questions } = await response.json()
      dispatch({ type: "SET_QUESTIONS", payload: questions })

      toast({
        title: "Questions generated!",
        description: `Generated ${questions.length} questions successfully.`,
      })

      onNext()
    } catch (error) {
      toast({
        title: "Generation failed",
        description: "Failed to generate questions. Please try again.",
        variant: "destructive",
      })
    } finally {
      dispatch({ type: "SET_GENERATING", payload: false })
    }
  }

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case "Easy":
        return "text-green-600 bg-green-50 border-green-200"
      case "Medium":
        return "text-yellow-600 bg-yellow-50 border-yellow-200"
      case "Hard":
        return "text-red-600 bg-red-50 border-red-200"
      default:
        return "text-gray-600 bg-gray-50 border-gray-200"
    }
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Subject and Difficulty */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="subject" className="flex items-center space-x-2">
            <Settings className="w-4 h-4" />
            <span>Subject/Topic</span>
          </Label>
          <Input
            id="subject"
            placeholder="e.g., World History, Biology, JavaScript"
            value={formData.subject}
            onChange={(e) => setFormData((prev) => ({ ...prev, subject: e.target.value }))}
            required
          />
        </div>

        <div className="space-y-2">
          <Label htmlFor="difficulty">Difficulty Level</Label>
          <Select
            value={formData.difficulty}
            onValueChange={(value: "Easy" | "Medium" | "Hard") =>
              setFormData((prev) => ({ ...prev, difficulty: value }))
            }
          >
            <SelectTrigger className={getDifficultyColor(formData.difficulty)}>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="Easy" className="text-green-600">
                Easy
              </SelectItem>
              <SelectItem value="Medium" className="text-yellow-600">
                Medium
              </SelectItem>
              <SelectItem value="Hard" className="text-red-600">
                Hard
              </SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Notes Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <FileText className="w-5 h-5" />
            <span>Source Material</span>
          </CardTitle>
          <CardDescription>
            Provide your study notes or content that the AI will use to generate questions
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center space-x-2">
            <Label htmlFor="file-upload" className="cursor-pointer">
              <div className="flex items-center space-x-2 px-3 py-2 border border-dashed border-gray-300 rounded-md hover:border-gray-400 transition-colors">
                <Upload className="w-4 h-4" />
                <span className="text-sm">Upload .txt file</span>
              </div>
            </Label>
            <Input id="file-upload" type="file" accept=".txt" onChange={handleFileUpload} className="hidden" />
            <span className="text-sm text-muted-foreground">or paste below</span>
          </div>

          <Textarea
            placeholder="Paste your study notes, lecture content, or any material you want to create questions from..."
            value={formData.notes}
            onChange={(e) => setFormData((prev) => ({ ...prev, notes: e.target.value }))}
            className="min-h-[200px]"
            required
          />
        </CardContent>
      </Card>

      {/* Question Type Configuration */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center space-x-2">
            <Sparkles className="w-5 h-5" />
            <span>Question Configuration</span>
          </CardTitle>
          <CardDescription>Specify how many questions of each type to generate</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {Object.entries(formData.questionCounts).map(([type, count]) => (
              <div key={type} className="space-y-2">
                <Label htmlFor={type} className="text-sm font-medium">
                  {type === "MCQ"
                    ? "Multiple Choice"
                    : type === "TF"
                      ? "True/False"
                      : type === "MATCHING"
                        ? "Matching"
                        : "Essay"}
                </Label>
                <Input
                  id={type}
                  type="number"
                  min="0"
                  max="20"
                  value={count}
                  onChange={(e) =>
                    setFormData((prev) => ({
                      ...prev,
                      questionCounts: {
                        ...prev.questionCounts,
                        [type]: Number.parseInt(e.target.value) || 0,
                      },
                    }))
                  }
                  className="text-center"
                />
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      <div className="flex gap-2">
        <label htmlFor="json-import" className="flex-1">
          <Button type="button" variant="outline" className="w-full" asChild>
            <span>
              <Download className="w-4 h-4 mr-2" />
              Import Existing Quiz
            </span>
          </Button>
        </label>
        <input id="json-import" type="file" accept=".json" onChange={handleJSONImport} className="hidden" />

        <Button type="submit" className="flex-1" size="lg">
          <Sparkles className="w-4 h-4 mr-2" />
          Generate New Quiz
        </Button>
      </div>
    </form>
  )
}
