import React, { useState } from 'react';
import { ConfiguredExercise, ExerciseDefinition, WorkoutSessionConfig } from '../types';
import { ALL_EXERCISES, PRESET_WORKOUTS } from '../data/exercises';
import { Sound } from '../utils/sound';

interface Props {
  onBack: () => void;
  onStartSession: (config: WorkoutSessionConfig) => void;
}

export const WorkoutBuilder: React.FC<Props> = ({ onBack, onStartSession }) => {
  const [selectedPresetName, setSelectedPresetName] = useState<string>('Full Body (Тонус всего тела)');
  const [exercises, setExercises] = useState<ConfiguredExercise[]>(() => {
    return [...PRESET_WORKOUTS[0].exercises];
  });
  const [restSeconds, setRestSeconds] = useState<number>(45);
  const [showAddModal, setShowAddModal] = useState<boolean>(false);

  const handleApplyPreset = (preset: WorkoutSessionConfig) => {
    Sound.playClick();
    setSelectedPresetName(preset.name);
    setExercises([...preset.exercises]);
    setRestSeconds(preset.restDurationSeconds);
  };

  const handleSelectCustom = () => {
    Sound.playClick();
    setSelectedPresetName('Свой комплекс');
    // Clear list completely so user only has exercises they add themselves
    setExercises([]);
  };

  const handleUpdateSets = (index: number, delta: number) => {
    Sound.playClick();
    setExercises(prev => {
      const next = [...prev];
      const newSets = Math.max(1, Math.min(6, next[index].setsCount + delta));
      next[index] = { ...next[index], setsCount: newSets };
      return next;
    });
  };

  const handleUpdateReps = (index: number, delta: number) => {
    Sound.playClick();
    setExercises(prev => {
      const next = [...prev];
      const step = next[index].unit === 'сек.' ? 5 : 1;
      const newReps = Math.max(step, Math.min(100, next[index].targetReps + delta * step));
      next[index] = { ...next[index], targetReps: newReps };
      return next;
    });
  };

  const handleRemoveExercise = (index: number) => {
    Sound.playClick();
    setExercises(prev => prev.filter((_, i) => i !== index));
  };

  const handleAddExercise = (def: ExerciseDefinition) => {
    Sound.playClick();
    const newEx: ConfiguredExercise = {
      key: def.key,
      name: def.name,
      icon: def.icon,
      hasAiCamera: def.hasAiCamera,
      setsCount: def.defaultSets,
      targetReps: def.defaultReps,
      unit: def.unit
    };
    setExercises(prev => [...prev, newEx]);
    setShowAddModal(false);
  };

  const totalSets = exercises.reduce((sum, e) => sum + e.setsCount, 0);

  const handleLaunch = () => {
    if (exercises.length === 0) {
      Sound.playError();
      alert('Добавьте хотя бы одно упражнение в программу перед стартом!');
      return;
    }

    Sound.playClick();
    onStartSession({
      name: selectedPresetName || 'Индивидуальная тренировка',
      exercises,
      restDurationSeconds: restSeconds
    });
  };

  return (
    <div className="screen">
      <div className="page-container">
        {/* Хедер конструктора */}
        <div className="page-header">
          <div className="page-title-box">
            <button
              className="back-btn"
              onClick={() => {
                Sound.playClick();
                onBack();
              }}
              title="Назад"
            >
              ←
            </button>
            <div>
              <h2>Настройка тренировки</h2>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Выберите упражнения, подходы и параметры отдыха
              </p>
            </div>
          </div>
          <div className="builder-summary-pill">
            <span>{exercises.length} упр.</span> · <span>{totalSets} подходов</span>
          </div>
        </div>

        {/* Шаблоны программ */}
        <div className="preset-selector-row">
          {PRESET_WORKOUTS.map(p => (
            <button
              key={p.name}
              className={`preset-btn ${selectedPresetName === p.name ? 'active' : ''}`}
              onClick={() => handleApplyPreset(p)}
            >
              <div className="preset-name">{p.name}</div>
              <div className="preset-meta">{p.exercises.length} упражнений · {p.restDurationSeconds}с отдых</div>
            </button>
          ))}
          <button
            className={`preset-btn ${selectedPresetName === 'Свой комплекс' ? 'active' : ''}`}
            onClick={handleSelectCustom}
          >
            <div className="preset-name">Свой комплекс</div>
            <div className="preset-meta">Собрать с нуля</div>
          </button>
        </div>

        {/* Настройка времени отдыха */}
        <div className="rest-config-panel">
          <div className="rest-label">
            <span>⏱️ Время отдыха между подходами:</span>
            <strong>{restSeconds} секунд</strong>
          </div>
          <div className="rest-buttons-group">
            {[30, 45, 60, 90].map(sec => (
              <button
                key={sec}
                className={`btn btn-sm ${restSeconds === sec ? 'btn-accent' : 'btn-outline'}`}
                onClick={() => {
                  Sound.playClick();
                  setRestSeconds(sec);
                }}
              >
                {sec} сек
              </button>
            ))}
          </div>
        </div>

        {/* Список сконфигурированных упражнений */}
        <div className="builder-exercises-list">
          {exercises.length === 0 ? (
            <div className="empty-state" style={{ padding: '40px 20px', background: '#FFFFFF' }}>
              <div style={{ fontSize: '36px', marginBottom: '10px' }}>📋</div>
              <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '6px' }}>
                Ваш комплекс пуст
              </h4>
              <p style={{ fontSize: '13px', color: '#737373', maxWidth: '380px', margin: '0 auto 18px' }}>
                Нажмите «+ Добавить упражнение в программу», чтобы выбрать только те упражнения, которые вы хотите выполнить!
              </p>
              <button
                className="btn btn-sm btn-accent"
                onClick={() => {
                  Sound.playClick();
                  setShowAddModal(true);
                }}
              >
                + Добавить первое упражнение
              </button>
            </div>
          ) : (
            exercises.map((ex, idx) => (
              <div key={`${ex.key}-${idx}`} className="builder-exercise-card">
                <div className="builder-card-left">
                  <span className="builder-ex-icon">{ex.icon}</span>
                  <div>
                    <div className="builder-ex-title-row">
                      <h4>{ex.name}</h4>
                      {ex.hasAiCamera ? (
                        <span className="ai-camera-badge">
                          <span>👁️</span> AI Камера
                        </span>
                      ) : (
                        <span className="manual-badge">Ручной режим</span>
                      )}
                    </div>
                    <div className="builder-ex-desc">
                      {ex.hasAiCamera
                        ? 'Нейросеть MediaPipe автоматически считает чистые повторы'
                        : 'Фиксация выполнения подхода по таймеру / счетчику'}
                    </div>
                  </div>
                </div>

                <div className="builder-card-right">
                  {/* Подходы */}
                  <div className="builder-counter-box">
                    <span className="counter-label">Подходы:</span>
                    <div className="counter-controls">
                      <button
                        className="counter-btn"
                        onClick={() => handleUpdateSets(idx, -1)}
                        title="Уменьшить"
                      >
                        −
                      </button>
                      <span className="counter-val">{ex.setsCount}</span>
                      <button
                        className="counter-btn"
                        onClick={() => handleUpdateSets(idx, 1)}
                        title="Увеличить"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Цель (повторы или секунды) */}
                  <div className="builder-counter-box">
                    <span className="counter-label">В подходе:</span>
                    <div className="counter-controls">
                      <button
                        className="counter-btn"
                        onClick={() => handleUpdateReps(idx, -1)}
                        title="Уменьшить"
                      >
                        −
                      </button>
                      <span className="counter-val" style={{ minWidth: '48px' }}>
                        {ex.targetReps} {ex.unit}
                      </span>
                      <button
                        className="counter-btn"
                        onClick={() => handleUpdateReps(idx, 1)}
                        title="Увеличить"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Удалить */}
                  <button
                    className="builder-remove-btn"
                    onClick={() => handleRemoveExercise(idx)}
                    title="Удалить из тренировки"
                  >
                    ✕
                  </button>
                </div>
              </div>
            ))
          )}

          {exercises.length > 0 && (
            <button
              className="btn btn-outline"
              style={{ width: '100%', borderStyle: 'dashed', padding: '14px' }}
              onClick={() => {
                Sound.playClick();
                setShowAddModal(true);
              }}
            >
              + Добавить ещё упражнение в программу
            </button>
          )}
        </div>

        {/* Нижняя плавающая кнопка старта */}
        <div className="builder-footer-bar">
          <div className="builder-total-info">
            <span style={{ fontSize: '12px', color: '#888' }}>ИТОГО В ПРОГРАММЕ</span>
            <div style={{ fontSize: '16px', fontWeight: 800 }}>
              {exercises.length} упражнений · {totalSets} подходов · {restSeconds}с отдых
            </div>
          </div>
          <button
            className="btn btn-accent"
            style={{ padding: '16px 36px', fontSize: '16px', fontWeight: 800 }}
            onClick={handleLaunch}
          >
            Начать тренировку <span className="arrow">→</span>
          </button>
        </div>

        {/* Модальное окно добавления упражнения */}
        {showAddModal && (
          <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
            <div className="modal-box" onClick={e => e.stopPropagation()}>
              <div className="modal-header">
                <h3>Выберите упражнение для добавления</h3>
                <button className="drawer-close-btn" onClick={() => setShowAddModal(false)}>
                  ✕
                </button>
              </div>

              <div className="modal-exercises-grid">
                {ALL_EXERCISES.map(def => (
                  <div
                    key={def.key}
                    className="modal-exercise-item"
                    onClick={() => handleAddExercise(def)}
                  >
                    <span style={{ fontSize: '28px' }}>{def.icon}</span>
                    <div style={{ flex: 1 }}>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '2px' }}>
                        <strong>{def.name}</strong>
                        {def.hasAiCamera && (
                          <span className="ai-camera-badge" style={{ fontSize: '10px', padding: '2px 8px' }}>
                            👁️ AI Камера
                          </span>
                        )}
                      </div>
                      <p style={{ fontSize: '11px', color: '#737373', margin: 0 }}>{def.description}</p>
                    </div>
                    <span style={{ fontSize: '18px', color: 'var(--accent)', fontWeight: 800 }}>+</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};
