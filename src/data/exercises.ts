import { ExerciseDefinition, WorkoutSessionConfig } from '../types';

export const ALL_EXERCISES: ExerciseDefinition[] = [
  {
    key: 'squat',
    name: 'Приседания',
    description: 'Контроль коленей и глубины параллели через камеру',
    icon: '🦵',
    hasAiCamera: true,
    defaultSets: 3,
    defaultReps: 15,
    unit: 'повт.'
  },
  {
    key: 'shoulders',
    name: 'Подъём на плечи',
    description: 'Разведение рук строго до уровня плеч с прямыми локтями',
    icon: '🤲',
    hasAiCamera: true,
    defaultSets: 3,
    defaultReps: 12,
    unit: 'повт.'
  },
  {
    key: 'biceps',
    name: 'Сгибание на бицепс',
    description: 'Фиксация полного разгибания и верхней точки амплитуды',
    icon: '💪',
    hasAiCamera: true,
    defaultSets: 3,
    defaultReps: 12,
    unit: 'повт.'
  },
  {
    key: 'pushups',
    name: 'Отжимания от пола',
    description: 'Базовое упражнение для грудных мышц и трицепса',
    icon: '🏋️',
    hasAiCamera: false,
    defaultSets: 3,
    defaultReps: 12,
    unit: 'повт.'
  },
  {
    key: 'lunges',
    name: 'Выпады на каждую ногу',
    description: 'Глубокая проработка квадрицепсов и ягодичных мышц',
    icon: '🏃',
    hasAiCamera: false,
    defaultSets: 3,
    defaultReps: 10,
    unit: 'повт.'
  },
  {
    key: 'plank',
    name: 'Планка на локтях',
    description: 'Статическая нагрузка на кор, пресс и поясницу',
    icon: '⏱️',
    hasAiCamera: false,
    defaultSets: 3,
    defaultReps: 45,
    unit: 'сек.'
  },
  {
    key: 'jumping_jacks',
    name: 'Jumping Jacks',
    description: 'Аэробное разогревающее кардио-упражнение',
    icon: '⚡',
    hasAiCamera: false,
    defaultSets: 4,
    defaultReps: 40,
    unit: 'сек.'
  },
  {
    key: 'burpee',
    name: 'Берпи (Burpee)',
    description: 'Взрывное функциональное упражнение для выносливости',
    icon: '🔥',
    hasAiCamera: false,
    defaultSets: 3,
    defaultReps: 10,
    unit: 'повт.'
  },
  {
    key: 'climbers',
    name: 'Скалолаз (Mountain Climbers)',
    description: 'Динамическая планка с поочередным подтягиванием коленей',
    icon: '🧗',
    hasAiCamera: false,
    defaultSets: 4,
    defaultReps: 30,
    unit: 'сек.'
  }
];

export const PRESET_WORKOUTS: WorkoutSessionConfig[] = [
  {
    name: 'Full Body (Тонус всего тела)',
    restDurationSeconds: 45,
    exercises: [
      { key: 'squat', name: 'Приседания', icon: '🦵', hasAiCamera: true, setsCount: 3, targetReps: 15, unit: 'повт.' },
      { key: 'pushups', name: 'Отжимания от пола', icon: '🏋️', hasAiCamera: false, setsCount: 3, targetReps: 12, unit: 'повт.' },
      { key: 'lunges', name: 'Выпады на каждую ногу', icon: '🏃', hasAiCamera: false, setsCount: 3, targetReps: 10, unit: 'повт.' },
      { key: 'plank', name: 'Планка на локтях', icon: '⏱️', hasAiCamera: false, setsCount: 3, targetReps: 45, unit: 'сек.' }
    ]
  },
  {
    name: 'AI Vision Power (Умный тренажёр)',
    restDurationSeconds: 45,
    exercises: [
      { key: 'squat', name: 'Приседания', icon: '🦵', hasAiCamera: true, setsCount: 3, targetReps: 15, unit: 'повт.' },
      { key: 'shoulders', name: 'Подъём на плечи', icon: '🤲', hasAiCamera: true, setsCount: 3, targetReps: 12, unit: 'повт.' },
      { key: 'biceps', name: 'Сгибание на бицепс', icon: '💪', hasAiCamera: true, setsCount: 3, targetReps: 12, unit: 'повт.' }
    ]
  },
  {
    name: 'HIIT / Жиросжигание',
    restDurationSeconds: 30,
    exercises: [
      { key: 'jumping_jacks', name: 'Jumping Jacks', icon: '⚡', hasAiCamera: false, setsCount: 4, targetReps: 40, unit: 'сек.' },
      { key: 'burpee', name: 'Берпи (Burpee)', icon: '🔥', hasAiCamera: false, setsCount: 3, targetReps: 10, unit: 'повт.' },
      { key: 'climbers', name: 'Скалолаз', icon: '🧗', hasAiCamera: false, setsCount: 4, targetReps: 30, unit: 'сек.' }
    ]
  }
];
