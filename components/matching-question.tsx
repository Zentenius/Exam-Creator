"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { RotateCcw } from "lucide-react"

interface MatchingItem {
  id: string
  text: string
}

interface MatchingQuestionProps {
  question: string
  leftItems: MatchingItem[]
  rightItems: MatchingItem[]
  correctMatches: Record<string, string>
  onAnswerChange: (matches: Record<string, string>) => void
  userAnswer?: Record<string, string>
  showAnswer?: boolean
}

export function MatchingQuestion({
  question,
  leftItems,
  rightItems,
  correctMatches,
  onAnswerChange,
  userAnswer = {},
  showAnswer = false,
}: MatchingQuestionProps) {
  const [matches, setMatches] = useState<Record<string, string>>(userAnswer)
  const [draggedItem, setDraggedItem] = useState<string | null>(null)
  const [dragOverItem, setDragOverItem] = useState<string | null>(null)

  useEffect(() => {
    onAnswerChange(matches)
  }, [matches, onAnswerChange])

  const handleDragStart = (e: React.DragEvent, itemId: string) => {
    setDraggedItem(itemId)
    e.dataTransfer.effectAllowed = "move"
  }

  const handleDragOver = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = "move"
    setDragOverItem(targetId)
  }

  const handleDragLeave = () => {
    setDragOverItem(null)
  }

  const handleDrop = (e: React.DragEvent, targetId: string) => {
    e.preventDefault()
    if (draggedItem) {
      const newMatches = { ...matches }

      // Remove any existing match for this dragged item
      Object.keys(newMatches).forEach((key) => {
        if (newMatches[key] === draggedItem) {
          delete newMatches[key]
        }
      })

      // Remove any existing match for this target
      delete newMatches[targetId]

      // Create new match
      newMatches[targetId] = draggedItem

      setMatches(newMatches)
    }
    setDraggedItem(null)
    setDragOverItem(null)
  }

  const handleReset = () => {
    setMatches({})
  }

  const getMatchStatus = (leftId: string, rightId: string) => {
    if (!showAnswer) return "none"

    const userMatch = matches[rightId]
    const correctMatch = correctMatches[rightId]

    if (userMatch === leftId) {
      return correctMatch === leftId ? "correct" : "incorrect"
    }

    if (correctMatch === leftId) {
      return "missed"
    }

    return "none"
  }

  const getItemStyle = (itemId: string, isLeft: boolean) => {
    let baseStyle = "p-3 rounded-lg border-2 cursor-move transition-all duration-200 "

    if (draggedItem === itemId) {
      baseStyle += "opacity-50 scale-95 "
    }

    if (isLeft) {
      const isMatched = Object.values(matches).includes(itemId)
      if (isMatched) {
        baseStyle += "bg-blue-50 border-blue-300 "
      } else {
        baseStyle += "bg-gray-50 border-gray-300 hover:border-blue-400 "
      }
    } else {
      const hasMatch = matches[itemId]
      const isCorrect = showAnswer && correctMatches[itemId] === matches[itemId]
      const isIncorrect = showAnswer && matches[itemId] && correctMatches[itemId] !== matches[itemId]

      if (dragOverItem === itemId) {
        baseStyle += "border-blue-500 bg-blue-100 "
      } else if (isCorrect) {
        baseStyle += "bg-green-50 border-green-300 "
      } else if (isIncorrect) {
        baseStyle += "bg-red-50 border-red-300 "
      } else if (hasMatch) {
        baseStyle += "bg-blue-50 border-blue-300 "
      } else {
        baseStyle += "bg-gray-50 border-gray-300 border-dashed hover:border-blue-400 "
      }
    }

    return baseStyle
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <h3 className="text-lg font-medium">{question}</h3>
        <Button variant="outline" size="sm" onClick={handleReset}>
          <RotateCcw className="w-4 h-4 mr-2" />
          Reset
        </Button>
      </div>

      <div className="text-sm text-muted-foreground mb-4">
        Drag items from the left column to match them with items in the right column.
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Left Column - Source Items */}
        <div className="space-y-3">
          <h4 className="font-medium text-center p-2 bg-gray-100 rounded">Items to Match</h4>
          {leftItems.map((item) => (
            <div
              key={item.id}
              draggable
              onDragStart={(e) => handleDragStart(e, item.id)}
              className={getItemStyle(item.id, true)}
            >
              <div className="flex items-center space-x-2">
                <Badge variant="outline" className="text-xs">
                  {String.fromCharCode(65 + leftItems.indexOf(item))}
                </Badge>
                <span>{item.text}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Right Column - Target Items */}
        <div className="space-y-3">
          <h4 className="font-medium text-center p-2 bg-gray-100 rounded">Match With</h4>
          {rightItems.map((item) => (
            <div
              key={item.id}
              onDragOver={(e) => handleDragOver(e, item.id)}
              onDragLeave={handleDragLeave}
              onDrop={(e) => handleDrop(e, item.id)}
              className={getItemStyle(item.id, false)}
            >
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-xs">
                    {rightItems.indexOf(item) + 1}
                  </Badge>
                  <span>{item.text}</span>
                </div>
                {matches[item.id] && (
                  <Badge variant="secondary" className="text-xs">
                    {String.fromCharCode(65 + leftItems.findIndex((l) => l.id === matches[item.id]))}
                  </Badge>
                )}
              </div>

              {showAnswer && correctMatches[item.id] && (
                <div className="mt-2 text-xs">
                  <span className="text-green-600 font-medium">
                    Correct: {leftItems.find((l) => l.id === correctMatches[item.id])?.text}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {showAnswer && (
        <div className="mt-4 p-3 bg-blue-50 border border-blue-200 rounded">
          <h5 className="font-medium text-blue-800 mb-2">Correct Matches:</h5>
          <div className="space-y-1 text-sm">
            {Object.entries(correctMatches).map(([rightId, leftId]) => {
              const rightItem = rightItems.find((r) => r.id === rightId)
              const leftItem = leftItems.find((l) => l.id === leftId)
              return (
                <div key={rightId} className="text-blue-700">
                  {leftItem?.text} → {rightItem?.text}
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
