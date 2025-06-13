import { generateText } from "ai"
import { mistral } from "@ai-sdk/mistral"
import { type NextRequest, NextResponse } from "next/server"

export async function POST(request: NextRequest) {
  try {
    const { question, userAnswer, subject } = await request.json()

    const prompt = `You are an expert educator providing constructive feedback on student answers.

Subject: ${subject}
Question: ${question}
Student's Answer: ${userAnswer}

Please provide detailed, constructive feedback on this answer. Include:
1. What the student did well
2. Areas for improvement
3. Specific suggestions for better understanding
4. Additional insights or connections to the broader topic

Keep the feedback encouraging but honest, and aim to help the student learn and improve.`

    const { text } = await generateText({
      model: mistral("mistral-small-2503"),
      prompt: prompt,
      temperature: 0.7,
      maxTokens: 500,
    })

    return NextResponse.json({ feedback: text })
  } catch (error) {
    console.error("Error generating feedback:", error)
    return NextResponse.json({ error: "Failed to generate feedback" }, { status: 500 })
  }
}
