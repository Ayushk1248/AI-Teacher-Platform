export type TeacherLessonId = 'ai-teacher-demo-lesson-1' | 'ai-teacher-demo-lesson-2' | string

export type TeacherLesson = {
  id: TeacherLessonId
  title: string
  subtitle: string
  objective: string
  summary: string
  keyPoints: string[]
  teachingPrompt: string
  visualPayload?: string
  question: {
    type?: 'mcq' | 'freeform'
    prompt: string
    options?: string[]
    correctIndex?: number
    expectedAnswer?: string
    explanation: string
    teacherPrompt: string
    visualPayload?: string
  }
  reexplanation: string
  completionMessage: string
  nextTopicSuggestion?: string
}

export type TeacherEvaluation = {
  isCorrect: boolean
  feedback: string
  correctAnswer: string
  reexplanation: string
  nextCta: string
  visualPayload?: string
}

export type LessonContinuation = {
  nextLessonId?: TeacherLessonId
  completed: boolean
  message: string
}

export interface TeacherEngine {
  readonly isReal: boolean
  getLessonById(lessonId: TeacherLessonId, topic?: string, preferences?: any): Promise<TeacherLesson>
  evaluateAnswer(lesson: TeacherLesson, studentAnswer: any): Promise<TeacherEvaluation>
  continueLesson(lessonId: TeacherLessonId): Promise<LessonContinuation>
}

const teacherLessons: Record<string, TeacherLesson> = {
  'ai-teacher-demo-lesson-1': {
    id: 'ai-teacher-demo-lesson-1',
    title: 'Introduction to Neural Networks',
    subtitle: 'Starter lesson',
    objective: 'Understand what neurons, layers, and activations do.',
    summary:
      'A neural network is a system inspired by the brain. It learns patterns by adjusting the strength of connections between neurons as it processes examples and compares its predictions to the target answer.',
    keyPoints: [
      'Inputs flow forward through connected layers.',
      'Each neuron combines input signals and a bias.',
      'An activation function lets the model capture non-linear patterns.',
    ],
    teachingPrompt:
      'Today we are tracing how a tiny neural network turns inputs into predictions.',
    visualPayload: `\`\`\`python
import numpy as np

# 3-Layer Neural Network Forward Pass
def forward_pass(x, W1, b1, W2, b2):
    # Hidden Layer with ReLU Activation
    h = np.maximum(0, np.dot(x, W1) + b1)
    # Output Layer
    y = np.dot(h, W2) + b2
    return y
\`\`\``,
    question: {
      type: 'mcq',
      prompt: 'What happens if we remove the activation function from a stacked neural network?',
      options: [
        'The network becomes better at learning complex shapes.',
        'The whole network collapses into a single linear function.',
        'The output layer stops receiving any data.',
        'The model learns faster without any cost.',
      ],
      correctIndex: 1,
      explanation:
        'Stacking linear layers without non-linearity is mathematically equivalent to one linear transformation, so the network can only model straight-line patterns.',
      teacherPrompt:
        'I want to check your understanding before we move on.',
      visualPayload: `\`\`\`text
Linear Stack:   f(x) = W2 * (W1 * x + b1) + b2
Simplified:     f(x) = W_eff * x + b_eff
Result:         No non-linear capacity!
\`\`\``,
    },
    reexplanation:
      'Think of the bias as a starting offset. Even when all the inputs are zero, the neuron still has a baseline value. That is why the model can shift its decision boundary and learn patterns that are not locked to the origin.',
    completionMessage:
      'Great work. You now understand the building blocks of a neural network and how it transforms inputs into decisions.',
  },
  'ai-teacher-demo-lesson-2': {
    id: 'ai-teacher-demo-lesson-2',
    title: 'How Neural Networks Learn',
    subtitle: 'Starter lesson',
    objective: 'Understand prediction, error, and adjustment.',
    summary:
      'Neural networks learn by comparing a prediction to a target and then adjusting the internal weights so the error shrinks over time. This repeated improvement is the heart of training.',
    keyPoints: [
      'A loss function measures how far the prediction is from the target.',
      'Gradient descent nudges weights in the direction that reduces loss.',
      'Repeated updates gradually improve performance over many passes.',
    ],
    teachingPrompt:
      'Now we are looking at how the model improves its answer after each prediction.',
    question: {
      type: 'mcq',
      prompt: 'What does gradient descent primarily do during training?',
      options: [
        'It increases the model size to improve recall.',
        'It changes weights in the direction that reduces loss.',
        'It stores the training examples in a database.',
        'It freezes all model parameters before evaluation.',
      ],
      correctIndex: 1,
      explanation:
        'Gradient descent computes the direction of steepest loss decrease and updates the weights so the model gradually moves toward a better solution.',
      teacherPrompt:
        'Before we finish, let me check whether the training idea feels clear.',
    },
    reexplanation:
      'The loss tells us how wrong the model is. Gradient descent then follows the negative gradient, which points toward the fastest reduction in that error, so the model moves step by step toward a better solution.',
    completionMessage:
      'Excellent. You have seen how a model measures error, updates its weights, and gradually becomes more accurate over repeated rounds of training.',
  },
}

export class MockTeacherEngine implements TeacherEngine {
  readonly isReal = false

  async getLessonById(lessonId: TeacherLessonId): Promise<TeacherLesson> {
    // Artificial delay to simulate network
    await new Promise(r => setTimeout(r, 600))
    
    // Fallback if ID doesn't exist (e.g. if a random topic ID was passed)
    const lesson = teacherLessons[lessonId as string] ?? teacherLessons['ai-teacher-demo-lesson-1']
    return lesson
  }

  async evaluateAnswer(lesson: TeacherLesson, studentAnswer: any): Promise<TeacherEvaluation> {
    await new Promise(r => setTimeout(r, 800))
    
    let isCorrect = false
    let correctAnswerStr = 'N/A'
    
    if (lesson.question.type === 'mcq' && typeof studentAnswer === 'number') {
      isCorrect = studentAnswer === lesson.question.correctIndex
      correctAnswerStr = lesson.question.options?.[lesson.question.correctIndex ?? 0] ?? ''
    } else if (lesson.question.type === 'freeform') {
      // Mock simple keyword check for freeform
      isCorrect = typeof studentAnswer === 'string' && studentAnswer.length > 10
      correctAnswerStr = lesson.question.expectedAnswer ?? 'A detailed correct explanation.'
    }

    if (isCorrect) {
      return {
        isCorrect: true,
        feedback: 'Correct. That understanding matches the lesson objective.',
        correctAnswer: correctAnswerStr,
        reexplanation: lesson.question.explanation,
        nextCta: 'Continue lesson',
        visualPayload: lesson.question.visualPayload,
      }
    }

    return {
      isCorrect: false,
      feedback: 'Not quite. The idea is close, but there is one important piece missing.',
      correctAnswer: correctAnswerStr,
      reexplanation: lesson.reexplanation,
      nextCta: 'Review concept',
      visualPayload: lesson.question.visualPayload,
    }
  }

  async continueLesson(lessonId: TeacherLessonId): Promise<LessonContinuation> {
    await new Promise(r => setTimeout(r, 400))
    const lesson = teacherLessons[lessonId as string] ?? teacherLessons['ai-teacher-demo-lesson-1']

    if (lessonId === 'ai-teacher-demo-lesson-1') {
      return {
        nextLessonId: 'ai-teacher-demo-lesson-2',
        completed: false,
        message: 'Nice progression. The next lesson builds on this idea and introduces how the model learns from error.',
      }
    }

    return {
      completed: true,
      message: lesson.completionMessage,
    }
  }
}

export class RealTeacherEngine implements TeacherEngine {
  readonly isReal = true

  async getLessonById(lessonId: TeacherLessonId, topic?: string, preferences?: any): Promise<TeacherLesson> {
    const learnerPreferences = {
      level: preferences?.level ?? 'Beginner',
      language: preferences?.language ?? 'English',
      goal: preferences?.goal ?? 'General curiosity',
      timeMinutes: preferences?.timeMinutes ?? preferences?.time ?? 20,
    }

    const res = await fetch('/api/teacher/generate-lesson', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        topic: topic ?? lessonId,
        preferences: learnerPreferences,
      }),
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText || 'Failed to generate lesson from AI API.')
    }
    
    const data = await res.json() as { lesson: TeacherLesson }
    return data.lesson
  }

  async evaluateAnswer(lesson: TeacherLesson, studentAnswer: any): Promise<TeacherEvaluation> {
    const res = await fetch('/api/teacher/evaluate-answer', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        lessonContext: lesson,
        studentAnswer,
      }),
    })
    
    if (!res.ok) {
      const errorText = await res.text()
      throw new Error(errorText || 'Failed to evaluate answer from AI API.')
    }
    
    return res.json()
  }

  async continueLesson(lessonId: TeacherLessonId): Promise<LessonContinuation> {
    // Currently, Real AI Engine continuation isn't fully backed by a separate endpoint in the original spec.
    // It's meant to generate a new lesson ID based on previous context. For now, we mock the continuation behavior.
    return {
      completed: true,
      message: 'Great job completing this AI-generated lesson.',
    }
  }
}

export function getTeacherEngine(): TeacherEngine {
  if (process.env.NEXT_PUBLIC_USE_REAL_AI_TEACHER === 'true') {
    return new RealTeacherEngine()
  }
  return new MockTeacherEngine()
}
