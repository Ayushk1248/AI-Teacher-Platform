import {
  BookOpen,
  Brain,
  FlaskConical,
  LineChart,
  Sparkles,
  Waypoints,
} from 'lucide-react'

export type Course = {
  id: string
  title: string
  subject: string
  progress: number
  lessonsDone: number
  lessonsTotal: number
  accent: 'primary' | 'accent' | 'success' | 'warning'
}

export const continueLearning: Course[] = [
  {
    id: 'neural-nets',
    title: 'Neural Networks & Deep Learning',
    subject: 'Machine Learning',
    progress: 68,
    lessonsDone: 11,
    lessonsTotal: 16,
    accent: 'primary',
  },
  {
    id: 'macro-econ',
    title: 'Principles of Macroeconomics',
    subject: 'Economics',
    progress: 42,
    lessonsDone: 5,
    lessonsTotal: 12,
    accent: 'accent',
  },
  {
    id: 'organic-chem',
    title: 'Organic Chemistry Foundations',
    subject: 'Chemistry',
    progress: 24,
    lessonsDone: 3,
    lessonsTotal: 14,
    accent: 'success',
  },
]

export const stats = [
  { label: 'Lessons completed', value: '48', delta: '+6 this week', icon: BookOpen },
  { label: 'Study streak', value: '12 days', delta: 'Personal best', icon: Sparkles },
  { label: 'Avg. assessment', value: '87%', delta: '+4% vs last week', icon: LineChart },
  { label: 'Concepts mastered', value: '134', delta: '+12 this week', icon: Brain },
]

export const recommendedTopic = {
  title: 'Backpropagation, Intuitively',
  subject: 'Machine Learning',
  minutes: 18,
  reason: 'Builds directly on the gradient descent lesson you just finished.',
}

export type Feature = {
  title: string
  description: string
  icon: typeof Brain
}

export const features: Feature[] = [
  {
    title: 'Learns from your material',
    description:
      'Upload a PDF, DOCX, or PPTX — or just name a topic — and Lumina builds a structured curriculum around it.',
    icon: BookOpen,
  },
  {
    title: 'Personalized to you',
    description:
      'Set your level, language, pace, and preferred teaching style. Every lesson adapts to how you learn best.',
    icon: Sparkles,
  },
  {
    title: 'A live AI classroom',
    description:
      'Sit in an interactive session with an AI teacher that explains, checks understanding, and answers questions.',
    icon: Brain,
  },
  {
    title: 'Assessments that adapt',
    description:
      'Short, targeted quizzes with instant feedback pinpoint exactly what to review next.',
    icon: FlaskConical,
  },
  {
    title: 'Clear progress reports',
    description:
      'See strong and weak areas, mastery over time, and concrete next steps after every session.',
    icon: LineChart,
  },
  {
    title: 'A guided learning path',
    description:
      'A visual roadmap connects every concept so you always know what to learn next and why.',
    icon: Waypoints,
  },
]

export const howItWorks = [
  {
    step: '01',
    title: 'Add your material',
    description: 'Drop in a document or pick a topic. Lumina reads and organizes it for you.',
  },
  {
    step: '02',
    title: 'Personalize the plan',
    description: 'Choose level, language, pace, and style. We generate a tailored lesson plan.',
  },
  {
    step: '03',
    title: 'Learn in the AI classroom',
    description: 'Attend guided sessions, ask anything, and take quick adaptive checks.',
  },
  {
    step: '04',
    title: 'Review your report',
    description: 'Get a clear breakdown of mastery and a roadmap for what to learn next.',
  },
]

export type LessonStep = {
  id: number
  title: string
  type: 'Concept' | 'Example' | 'Practice' | 'Checkpoint'
  minutes: number
  description: string
  status: 'done' | 'current' | 'upcoming'
}

export const lessonPlan: LessonStep[] = [
  {
    id: 1,
    title: 'What a neural network really is',
    type: 'Concept',
    minutes: 6,
    description: 'Neurons, layers, and how information flows forward through a network.',
    status: 'done',
  },
  {
    id: 2,
    title: 'Weights, biases & activations',
    type: 'Concept',
    minutes: 8,
    description: 'How a single neuron computes, and why activation functions matter.',
    status: 'done',
  },
  {
    id: 3,
    title: 'Worked example: a tiny network',
    type: 'Example',
    minutes: 10,
    description: 'Trace a 2-layer network end to end with real numbers.',
    status: 'current',
  },
  {
    id: 4,
    title: 'Loss functions & gradient descent',
    type: 'Concept',
    minutes: 9,
    description: 'Measuring error and nudging weights in the right direction.',
    status: 'upcoming',
  },
  {
    id: 5,
    title: 'Practice: predict the output',
    type: 'Practice',
    minutes: 7,
    description: 'Apply what you learned to three short problems.',
    status: 'upcoming',
  },
  {
    id: 6,
    title: 'Checkpoint quiz',
    type: 'Checkpoint',
    minutes: 5,
    description: 'A quick adaptive check before moving to backpropagation.',
    status: 'upcoming',
  },
]

export type QuizQuestion = {
  id: number
  prompt: string
  options: string[]
  correctIndex: number
  explanation: string
}

export const quiz: QuizQuestion[] = [
  {
    id: 1,
    prompt: 'What is the primary role of an activation function in a neural network?',
    options: [
      'To store the training data in memory',
      'To introduce non-linearity so the network can model complex patterns',
      'To reduce the number of layers required',
      'To label the output classes automatically',
    ],
    correctIndex: 1,
    explanation:
      'Without a non-linear activation, stacking layers would collapse into a single linear transformation, so the network could only learn linear relationships.',
  },
  {
    id: 2,
    prompt: 'During gradient descent, weights are updated in the direction that…',
    options: [
      'Increases the loss fastest',
      'Keeps the loss constant',
      'Decreases the loss (negative gradient)',
      'Maximizes the activation values',
    ],
    correctIndex: 2,
    explanation:
      'We move opposite to the gradient of the loss, taking steps that reduce error over time.',
  },
  {
    id: 3,
    prompt: 'A "bias" term in a neuron primarily allows the model to…',
    options: [
      'Shift the activation independent of the inputs',
      'Delete unimportant features',
      'Guarantee 100% accuracy',
      'Normalize the input data',
    ],
    correctIndex: 0,
    explanation:
      'The bias lets a neuron shift its output up or down regardless of the weighted input, improving flexibility.',
  },
]

export const report = {
  score: 87,
  correct: 13,
  total: 15,
  timeSpent: '24 min',
  strong: [
    { area: 'Network architecture', mastery: 94 },
    { area: 'Activation functions', mastery: 90 },
    { area: 'Forward propagation', mastery: 86 },
  ],
  weak: [
    { area: 'Gradient descent math', mastery: 58 },
    { area: 'Chain rule intuition', mastery: 49 },
  ],
  recommendations: [
    'Revisit "Loss functions & gradient descent" with the slower pace setting.',
    'Try the visual backpropagation lesson before the next checkpoint.',
    'Do 5 practice problems on partial derivatives to solidify the chain rule.',
  ],
}

export type PathNode = {
  id: string
  title: string
  status: 'done' | 'current' | 'locked'
  lessons: number
}

export const learningPath: PathNode[] = [
  { id: 'foundations', title: 'ML Foundations', status: 'done', lessons: 8 },
  { id: 'neurons', title: 'Neurons & Layers', status: 'done', lessons: 6 },
  { id: 'training', title: 'Training a Network', status: 'current', lessons: 7 },
  { id: 'backprop', title: 'Backpropagation', status: 'locked', lessons: 5 },
  { id: 'cnn', title: 'Convolutional Nets', status: 'locked', lessons: 9 },
  { id: 'transformers', title: 'Transformers', status: 'locked', lessons: 10 },
]

export const user = {
  name: 'Aria',
  plan: 'Pro',
  initials: 'AR',
}

export type ChatMessage = {
  id: string
  role: 'user' | 'assistant'
  content: string
}

export const askTeacherThread: ChatMessage[] = [
  {
    id: 'a-1',
    role: 'assistant',
    content:
      "Hi Aria! We're on the worked example of a tiny 2-layer network. Ask me anything if a step feels unclear.",
  },
  {
    id: 'u-1',
    role: 'user',
    content: 'Why do we multiply the input by the weight before adding the bias?',
  },
  {
    id: 'a-2',
    role: 'assistant',
    content:
      'The weight scales how much an input matters, and the bias shifts the result. Together they let the neuron draw a flexible decision boundary rather than a fixed one.',
  },
]

export const currentConcept = {
  lesson: 'Neural Networks & Deep Learning',
  step: 3,
  totalSteps: 6,
  title: 'Worked example: a tiny network',
  summary:
    'We trace a two-layer network end to end. Each neuron multiplies its inputs by weights, adds a bias, and passes the result through an activation. Follow the numbers from input to prediction.',
  keyPoints: [
    'Inputs flow forward, layer by layer.',
    'Every connection has a learnable weight.',
    'Activations decide what signal passes on.',
  ],
}

export const classroomMcq = {
  prompt: 'In our tiny network, what happens if we remove every activation function?',
  options: [
    'The network can still learn complex, curved patterns',
    'The whole network collapses into a single linear function',
    'Training becomes faster with no downside',
    'The output layer stops receiving any input',
  ],
  correctIndex: 1,
  explanation:
    'Stacking linear layers with no non-linearity is mathematically equivalent to one linear layer — so it can only model straight-line relationships.',
}

export const classroomTranscript = [
  { time: '00:00', text: 'Welcome back. Let us walk through a real forward pass.' },
  { time: '01:20', text: 'Here is our input vector and the first layer of weights.' },
  { time: '03:05', text: 'Notice how the bias shifts each neuron before activation.' },
]
