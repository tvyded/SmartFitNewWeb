import React, { useState } from 'react';
import { CompletedWorkoutSession } from '../types';
import { Sound } from '../utils/sound';

interface Props {
  onBack: () => void;
  sessions: CompletedWorkoutSession[];
  onClearHistory: () => void;
  onStartNewWorkout: () => void;
}

export const WorkoutHistoryScreen: React.FC<Props> = ({
  onBack,
  sessions,
  onClearHistory,
  onStartNewWorkout
}) => {
  const [expandedId, setExpandedId] = useState<string | null>(() => {
    return sessions.length > 0 ? sessions[0].id : null;
  });

  const toggleExpand = (id: string) => {
    Sound.playClick();
    setExpandedId(prev => (prev === id ? null : id));
  };

  const formatDuration = (seconds: number) => {
    if (!seconds || seconds < 60) return `${seconds || 0} сек`;
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return s > 0 ? `${m} мин ${s} сек` : `${m} мин`;
  };

  const formatDate = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      const isToday = new Date().toDateString() === d.toDateString();
      const time = d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
      if (isToday) return `Сегодня в ${time}`;
      return `${d.toLocaleDateString('ru-RU', { day: 'numeric', month: 'long' })}, ${time}`;
    } catch {
      return dateStr;
    }
  };

  const totalDurationSec = sessions.reduce((sum, s) => sum + (s.durationSeconds || 0), 0);
  const totalSets = sessions.reduce((sum, s) => sum + (s.totalSets || 0), 0);
  const totalReps = sessions.reduce((sum, s) => sum + (s.totalReps || 0), 0);

  return (
    <div className="screen">
      <div className="page-container">
        {/* Хедер раздела истории */}
        <div className="page-header">
          <div className="page-title-box">
            <button
              className="back-btn"
              onClick={() => {
                Sound.playClick();
                onBack();
              }}
              title="Назад на главную"
            >
              ←
            </button>
            <div>
              <h2>История тренировок</h2>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Архив завершенных тренировок, выполненных упражнений и подходов
              </p>
            </div>
          </div>

          <div style={{ display: 'flex', gap: '8px' }}>
            {sessions.length > 0 && (
              <button
                className="btn-outline btn-sm"
                style={{ color: '#dc2626', borderColor: '#fecaca' }}
                onClick={() => {
                  Sound.playClick();
                  if (window.confirm('Вы уверены, что хотите удалить всю историю тренировок?')) {
                    onClearHistory();
                  }
                }}
              >
                Очистить историю
              </button>
            )}
            <button
              className="btn btn-sm btn-accent"
              onClick={() => {
                Sound.playClick();
                onStartNewWorkout();
              }}
            >
              + Новая тренировка
            </button>
          </div>
        </div>

        {/* Сводные показатели за все время */}
        <div className="history-summary-strip">
          <div className="history-summary-box">
            <span className="history-sum-val">{sessions.length}</span>
            <span className="history-sum-label">Всего тренировок</span>
          </div>
          <div className="history-summary-box">
            <span className="history-sum-val">{formatDuration(totalDurationSec)}</span>
            <span className="history-sum-label">Общее время</span>
          </div>
          <div className="history-summary-box">
            <span className="history-sum-val">{totalSets}</span>
            <span className="history-sum-label">Выполнено подходов</span>
          </div>
          <div className="history-summary-box highlight">
            <span className="history-sum-val" style={{ color: 'var(--accent)' }}>
              {totalReps}
            </span>
            <span className="history-sum-label">Всего повторений</span>
          </div>
        </div>

        {/* Список карточек тренировок */}
        <div className="history-sessions-list">
          {sessions.length === 0 ? (
            <div className="empty-state" style={{ padding: '48px 24px', background: '#FFFFFF' }}>
              <div style={{ fontSize: '42px', marginBottom: '12px' }}>📜</div>
              <h3 style={{ fontSize: '18px', fontWeight: 800, marginBottom: '6px' }}>
                История тренировок пока пуста
              </h3>
              <p style={{ fontSize: '13px', color: '#737373', maxWidth: '400px', margin: '0 auto 20px' }}>
                Запустите свою первую тренировку, настройте упражнения и завершите занятие — статистика автоматически появится здесь!
              </p>
              <button
                className="btn btn-accent"
                onClick={() => {
                  Sound.playClick();
                  onStartNewWorkout();
                }}
              >
                Начать тренировку <span className="arrow">→</span>
              </button>
            </div>
          ) : (
            sessions.map(s => {
              const isExpanded = expandedId === s.id;
              return (
                <div key={s.id} className="history-session-card">
                  <div
                    className="history-session-header"
                    onClick={() => toggleExpand(s.id)}
                    title="Нажмите чтобы развернуть или скрыть детали"
                  >
                    <div className="history-card-left">
                      <span className="history-session-trophy">🏆</span>
                      <div>
                        <div className="history-session-title">{s.name}</div>
                        <div className="history-session-date">{formatDate(s.completedAt)}</div>
                      </div>
                    </div>

                    <div className="history-card-right">
                      <div className="history-pill-group">
                        <span className="history-pill">⏱️ {formatDuration(s.durationSeconds)}</span>
                        <span className="history-pill">{s.exercises?.length || 0} упр.</span>
                        <span className="history-pill highlight">{s.totalSets} подходов</span>
                      </div>
                      <button className="history-expand-indicator" onClick={e => { e.stopPropagation(); toggleExpand(s.id); }}>
                        {isExpanded ? 'Скрыть ▲' : 'Детали ▼'}
                      </button>
                    </div>
                  </div>

                  {/* Раскрывающийся список упражнений и подходов */}
                  {isExpanded && (
                    <div className="history-session-breakdown">
                      <div className="breakdown-title">Выполненные упражнения в этой тренировке:</div>
                      <div className="breakdown-grid">
                        {s.exercises && s.exercises.length > 0 ? (
                          s.exercises.map((ex, exIdx) => (
                            <div key={`${s.id}-${ex.key}-${exIdx}`} className="history-ex-row">
                              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                                <span style={{ fontSize: '20px' }}>{ex.icon || '🏋️'}</span>
                                <div>
                                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <strong style={{ fontSize: '14px' }}>{ex.name}</strong>
                                    {ex.hasAiCamera ? (
                                      <span className="ai-camera-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                        👁️ AI Камера
                                      </span>
                                    ) : (
                                      <span className="manual-badge" style={{ fontSize: '10px', padding: '2px 6px' }}>
                                        Ручной
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                              <div className="history-ex-sets-info">
                                <span>{ex.setsCount} подх.</span>
                                <span>×</span>
                                <strong>{ex.targetReps} {ex.unit}</strong>
                              </div>
                            </div>
                          ))
                        ) : (
                          <div style={{ fontSize: '13px', color: '#888' }}>Нет данных по отдельным упражнениям</div>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};
