"use client"

import type React from "react"

import { createContext, useContext, useReducer, type ReactNode } from "react"

export interface Question {
  id: string
  type: "MCQ" | "TF" | "MATCHING" | "ESSAY"
  question: string
  options?: string[]
  answer: string | string[]
  difficulty: "Easy" | "Medium" | "Hard"
  userAnswer?: string | string[]
  // New fields for matching questions
  leftItems?: Array<{ id: string; text: string }>
  rightItems?: Array<{ id: string; text: string }>
  correctMatches?: Record<string, string>
}

export interface QuizConfig {
  subject: string
  difficulty: "Easy" | "Medium" | "Hard"
  notes: string
  questionCounts: {
    MCQ: number
    TF: number
    MATCHING: number
    ESSAY: number
  }
}

interface QuizState {
  config: QuizConfig | null
  questions: Question[]
  currentQuestionIndex: number
  showAnswers: boolean
  isGenerating: boolean
  quizStarted: boolean
  quizCompleted: boolean
}

type QuizAction =
  | { type: "SET_CONFIG"; payload: QuizConfig }
  | { type: "SET_QUESTIONS"; payload: Question[] }
  | { type: "UPDATE_QUESTION"; payload: { index: number; question: Question } }
  | { type: "DELETE_QUESTION"; payload: number }
  | { type: "SET_CURRENT_QUESTION"; payload: number }
  | { type: "TOGGLE_ANSWERS" }
  | { type: "SET_GENERATING"; payload: boolean }
  | { type: "START_QUIZ" }
  | { type: "COMPLETE_QUIZ" }
  | { type: "SET_USER_ANSWER"; payload: { questionId: string; answer: string | string[] } }
  | { type: "RESET_QUIZ" }

const initialState: QuizState = {
  config: null,
  questions: [],
  currentQuestionIndex: 0,
  showAnswers: false,
  isGenerating: false,
  quizStarted: false,
  quizCompleted: false,
}

function quizReducer(state: QuizState, action: QuizAction): QuizState {
  switch (action.type) {
    case "SET_CONFIG":
      return { ...state, config: action.payload }
    case "SET_QUESTIONS":
      return { ...state, questions: action.payload }
    case "UPDATE_QUESTION":
      const updatedQuestions = [...state.questions]
      updatedQuestions[action.payload.index] = action.payload.question
      return { ...state, questions: updatedQuestions }
    case "DELETE_QUESTION":
      return {
        ...state,
        questions: state.questions.filter((_, index) => index !== action.payload),
      }
    case "SET_CURRENT_QUESTION":
      return { ...state, currentQuestionIndex: action.payload }
    case "TOGGLE_ANSWERS":
      return { ...state, showAnswers: !state.showAnswers }
    case "SET_GENERATING":
      return { ...state, isGenerating: action.payload }
    case "START_QUIZ":
      return { ...state, quizStarted: true, currentQuestionIndex: 0 }
    case "COMPLETE_QUIZ":
      return { ...state, quizCompleted: true }
    case "SET_USER_ANSWER":
      return {
        ...state,
        questions: state.questions.map((q) =>
          q.id === action.payload.questionId ? { ...q, userAnswer: action.payload.answer } : q,
        ),
      }
    case "RESET_QUIZ":
      return initialState
    default:
      return state
  }
}

const QuizContext = createContext<{
  state: QuizState
  dispatch: React.Dispatch<QuizAction>
} | null>(null)

export function QuizProvider({ children }: { children: ReactNode }) {
  const [state, dispatch] = useReducer(quizReducer, initialState)

  return <QuizContext.Provider value={{ state, dispatch }}>{children}</QuizContext.Provider>
}

export function useQuiz() {
  const context = useContext(QuizContext)
  if (!context) {
    throw new Error("useQuiz must be used within a QuizProvider")
  }
  return context
}
