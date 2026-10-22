import { CompletedWorkoutSession, DailyTargets, DiaryEntry, User, WorkoutSet } from '../types';

const USER_KEY = 'smartfit_user';
const TOKEN_KEY = 'smartfit_token';
const DIARY_KEY = 'smartfit_local_diary';
const WORKOUTS_KEY = 'smartfit_workout_sets';
const SESSIONS_KEY = 'smartfit_completed_sessions';

export const DEFAULT_TARGETS: DailyTargets = {
  calories: 2200,
  protein: 140,
  fat: 70,
  carbs: 250
};

export const QUICK_FOODS = [
  { label: '🍗 Куриная грудка 150г (240 ккал)', name: 'Куриная грудка отварная (150г)', calories: 240, protein: 46, fat: 5, carbs: 0 },
  { label: '🥣 Овсянка 200г (176 ккал)', name: 'Овсяная каша на воде (200г)', calories: 176, protein: 6, fat: 3, carbs: 30 },
  { label: '🥚 2 яйца (140 ккал)', name: 'Яйцо куриное вареное (2 шт)', calories: 140, protein: 12, fat: 10, carbs: 1 },
  { label: '🍚 Рис 150г (195 ккал)', name: 'Рис вареный басмати (150г)', calories: 195, protein: 4, fat: 1, carbs: 42 },
  { label: '🥤 Протеин (130 ккал)', name: 'Протеиновый коктейль', calories: 130, protein: 25, fat: 2, carbs: 3 },
  { label: '🧀 Творог 5% 150г (182 ккал)', name: 'Творог 5% (150г)', calories: 182, protein: 24, fat: 7, carbs: 5 }
];

export const Storage = {
  getUser(): User | null {
    try {
      const data = localStorage.getItem(USER_KEY);
      return data ? JSON.parse(data) : null;
    } catch {
      return null;
    }
  },

  setUser(user: User | null): void {
    if (user) {
      localStorage.setItem(USER_KEY, JSON.stringify(user));
      localStorage.setItem(TOKEN_KEY, 'mock_jwt_token_' + Date.now());
    } else {
      localStorage.removeItem(USER_KEY);
      localStorage.removeItem(TOKEN_KEY);
    }
  },

  getDiary(): { entries: DiaryEntry[]; targets: DailyTargets } {
    try {
      const data = localStorage.getItem(DIARY_KEY);
      if (data) {
        const parsed = JSON.parse(data);
        return {
          entries: parsed.entries || [],
          targets: parsed.targets || DEFAULT_TARGETS
        };
      }
    } catch {}
    return {
      entries: [
        { id: 1, name: 'Овсяная каша на воде (200г)', calories: 176, protein: 6, fat: 3, carbs: 30 },
        { id: 2, name: 'Яйцо куриное вареное (2 шт)', calories: 140, protein: 12, fat: 10, carbs: 1 }
      ],
      targets: DEFAULT_TARGETS
    };
  },

  saveDiary(entries: DiaryEntry[], targets: DailyTargets): void {
    localStorage.setItem(DIARY_KEY, JSON.stringify({ entries, targets }));
  },

  getWorkoutSets(): WorkoutSet[] {
    try {
      const data = localStorage.getItem(WORKOUTS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    return [];
  },

  addWorkoutSet(set: WorkoutSet): WorkoutSet[] {
    const list = this.getWorkoutSets();
    list.unshift(set);
    localStorage.setItem(WORKOUTS_KEY, JSON.stringify(list));
    return list;
  },

  getCompletedSessions(): CompletedWorkoutSession[] {
    try {
      const data = localStorage.getItem(SESSIONS_KEY);
      if (data) {
        return JSON.parse(data);
      }
    } catch {}
    // Initial sample session so history is immediately illustrative
    const initialSession: CompletedWorkoutSession = {
      id: 'session-demo-1',
      name: 'Full Body (Тонус всего тела)',
      completedAt: new Date(Date.now() - 3600000 * 2).toISOString(),
      durationSeconds: 1240,
      totalSets: 12,
      totalReps: 168,
      exercises: [
        { key: 'squat', name: 'Приседания', icon: '🦵', hasAiCamera: true, setsCount: 3, targetReps: 15, unit: 'повт.' },
        { key: 'pushups', name: 'Отжимания от пола', icon: '🏋️', hasAiCamera: false, setsCount: 3, targetReps: 12, unit: 'повт.' },
        { key: 'lunges', name: 'Выпады на каждую ногу', icon: '🏃', hasAiCamera: false, setsCount: 3, targetReps: 10, unit: 'повт.' },
        { key: 'plank', name: 'Планка на локтях', icon: '⏱️', hasAiCamera: false, setsCount: 3, targetReps: 45, unit: 'сек.' }
      ]
    };
    return [initialSession];
  },

  saveCompletedSession(session: CompletedWorkoutSession): CompletedWorkoutSession[] {
    const list = this.getCompletedSessions();
    list.unshift(session);
    localStorage.setItem(SESSIONS_KEY, JSON.stringify(list));
    return list;
  },

  clearCompletedSessions(): void {
    localStorage.setItem(SESSIONS_KEY, JSON.stringify([]));
  }
};
