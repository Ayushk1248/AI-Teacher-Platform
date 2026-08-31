export type TeacherLessonId = 'ai-teacher-demo-lesson-1' | 'ai-teacher-demo-lesson-2'

export type TeacherLesson = {
  id: TeacherLessonId
  title: string
  subtitle: string
  objective: string
  summary: string
  keyPoints: string[]
  teachingPrompt: string
  question: {
    prompt: string
    options: string[]
    correctIndex: number
    explanation: string
    teacherPrompt: string
  }
  reexplanation: string
  completionMessage: string
}

export type TeacherEvaluation = {
  isCorrect: boolean
  feedback: string
  correctAnswer: string
  reexplanation: string
  nextCta: string
}

export type LessonContinuation = {
  nextLessonId?: TeacherLessonId
  completed: boolean
  message: string
}

export interface TeacherEngine {
  getLessonById(lessonId: TeacherLessonId): TeacherLesson
  evaluateAnswer(lessonId: TeacherLessonId, selectedIndex: number): TeacherEvaluation
  continueLesson(lessonId: TeacherLessonId): LessonContinuation
}

const teacherLessons: Record<TeacherLessonId, TeacherLesson> = {
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
    question: {
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
  getLessonById(lessonId: TeacherLessonId): TeacherLesson {
    const lesson = teacherLessons[lessonId]

    if (!lesson) {
      throw new Error(`Unknown lesson: ${lessonId}`)
    }

    return lesson
  }

  evaluateAnswer(lessonId: TeacherLessonId, selectedIndex: number): TeacherEvaluation {
    const lesson = this.getLessonById(lessonId)
    const isCorrect = selectedIndex === lesson.question.correctIndex

    if (isCorrect) {
      return {
        isCorrect: true,
        feedback: 'Correct. That understanding matches the lesson objective.',
        correctAnswer: lesson.question.options[lesson.question.correctIndex],
        reexplanation: lesson.question.explanation,
        nextCta: 'Continue lesson',
      }
    }

    return {
      isCorrect: false,
      feedback: 'Not quite. The idea is close, but there is one important piece missing.',
      correctAnswer: lesson.question.options[lesson.question.correctIndex],
      reexplanation: lesson.reexplanation,
      nextCta: 'Review concept',
    }
  }

  continueLesson(lessonId: TeacherLessonId): LessonContinuation {
    const lesson = this.getLessonById(lessonId)

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
  getLessonById(_lessonId: TeacherLessonId): TeacherLesson {
    throw new Error('RealTeacherEngine is not yet wired to a backend. Use MockTeacherEngine for the current app build.')
  }

  evaluateAnswer(_lessonId: TeacherLessonId, _selectedIndex: number): TeacherEvaluation {
    throw new Error('RealTeacherEngine is not yet wired to a backend. Use MockTeacherEngine for the current app build.')
  }

  continueLesson(_lessonId: TeacherLessonId): LessonContinuation {
    throw new Error('RealTeacherEngine is not yet wired to a backend. Use MockTeacherEngine for the current app build.')
  }
}

export function getTeacherEngine(): TeacherEngine {
  return new MockTeacherEngine()
}
