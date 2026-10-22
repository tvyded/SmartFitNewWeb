import React from 'react';
import { CompletedWorkoutSession, DailyTargets, DiaryEntry, User, WorkoutSet } from '../types';
import { Sound } from '../utils/sound';

interface Props {
  user: User;
  onStartWorkout: () => void;
  onOpenDrawer: () => void;
  onOpenHistory: () => void;
  workoutSets: WorkoutSet[];
  diaryEntries: DiaryEntry[];
  targets: DailyTargets;
  completedSessions: CompletedWorkoutSession[];
}

export const DashboardScreen: React.FC<Props> = ({
  user,
  onStartWorkout,
  onOpenDrawer,
  onOpenHistory,
  workoutSets,
  diaryEntries,
  targets,
  completedSessions
}) => {
  const displayName = `${user.firstName || ''} ${user.lastName || ''}`.trim() || 'Пользователь';
  const totalCals = diaryEntries.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalSetsToday = workoutSets.length;
  const totalRepsToday = workoutSets.reduce((sum, s) => sum + s.reps, 0);

  const latestSession = completedSessions.length > 0 ? completedSessions[0] : null;

  const formatLatestTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const isToday = new Date().toDateString() === d.toDateString();
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `сегодня в ${time}`;
      return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'short' })} в ${time}`;
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="screen dashboard">
      <div className="dash-container">
        {/* Верхняя интерактивная плашка-триггер вызова шторки питания и профиля */}
        <div
          className="dash-top-trigger-bar"
          onClick={() => {
            Sound.playClick();
            onOpenDrawer();
          }}
          title="Нажмите чтобы открыть дневник питания, калькулятор и профиль"
        >
          <div className="dash-brand">
            <span>⚡</span> SmartFit
          </div>

          <div className="dash-top-center-pill">
            <span className="cal-icon">🥑</span>
            <span className="cal-text">
              {totalCals} / {targets.calories} ккал
            </span>
            <span className="drawer-indicator-arrow">▼ Меню и дневник</span>
          </div>

          <div className="user-pill">
            <span className="user-tag">{displayName}</span>
          </div>
        </div>

        {/* Главный блок приветствия с доминирующей кнопкой НАЧАТЬ ТРЕНИРОВКУ */}
        <div className="dash-hero-workout-box">
          <div className="workout-hero-badge">
            <span className="pulse-dot" />
            Интеллектуальная система тренировок · AI Vision
          </div>

          <h1 className="workout-hero-title">
            Привет, {user.firstName || 'Спортсмен'}!
          </h1>
          <p className="workout-hero-subtitle">
            Готовы к сегодняшней активности? Запустите тренировку: выберите упражнения и количество подходов, а нейросеть проконтролирует технику и посчитает повторения.
          </p>

          <button
            className="btn btn-accent btn-large-start"
            onClick={() => {
              Sound.playClick();
              onStartWorkout();
            }}
          >
            Начать тренировку <span className="arrow">→</span>
          </button>
        </div>

        {/* Сводка активности за сегодня */}
        <div className="today-stats-strip">
          <div className="today-stat-item">
            <div className="today-stat-val">{totalSetsToday}</div>
            <div className="today-stat-label">Подходов за сегодня</div>
          </div>
          <div className="today-stat-item">
            <div className="today-stat-val" style={{ color: 'var(--accent)' }}>
              {totalRepsToday}
            </div>
            <div className="today-stat-label">Повторений выполнено</div>
          </div>
          <div className="today-stat-item">
            <div className="today-stat-val">{totalCals}</div>
            <div className="today-stat-label">Калорий потреблено</div>
          </div>
        </div>

        {/* Блок перехода в ИСТОРИЮ ТРЕНИРОВОК вместо 3 блоков популярных программ */}
        <div style={{ marginTop: '28px' }}>
          <div
            className="workout-history-entry-card"
            onClick={() => {
              Sound.playClick();
              onOpenHistory();
            }}
          >
            <div className="history-entry-left">
              <div className="history-entry-icon">📜</div>
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '10px', marginBottom: '4px' }}>
                  <h3 style={{ fontSize: '20px', fontWeight: 800 }}>История тренировок</h3>
                  <span className="action-badge badge-green" style={{ margin: 0 }}>
                    {completedSessions.length} {completedSessions.length === 1 ? 'тренировка' : 'тренировок'}
                  </span>
                </div>
                <p style={{ fontSize: '13px', color: 'var(--text-secondary)', margin: 0 }}>
                  {latestSession ? (
                    <>
                      Последняя: <strong>{latestSession.name}</strong> ({formatLatestTime(latestSession.completedAt)} · {latestSession.exercises?.length || 0} упр. · {latestSession.totalSets} подходов)
                    </>
                  ) : (
                    'Здесь сохраняется подробная статистика: дата, время, длительность, все упражнения и количество подходов'
                  )}
                </p>
              </div>
            </div>

            <div className="history-entry-right">
              <span>Открыть историю</span>
              <div className="arrow-circle">→</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
