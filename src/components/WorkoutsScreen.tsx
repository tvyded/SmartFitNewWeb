import React, { useState, useEffect, useRef } from 'react';
import { Sound } from '../utils/sound';

interface Props {
  onBack: () => void;
  onOpenTrainer: () => void;
}

export const WorkoutsScreen: React.FC<Props> = ({ onBack, onOpenTrainer }) => {
  // Timer state
  const [seconds, setSeconds] = useState(60);
  const [isRunning, setIsRunning] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  // Exercise checkboxes
  const [checkedItems, setCheckedItems] = useState<Record<string, boolean>>({});

  useEffect(() => {
    if (isRunning) {
      timerRef.current = setInterval(() => {
        setSeconds(prev => {
          if (prev <= 1) {
            clearInterval(timerRef.current!);
            setIsRunning(false);
            Sound.playFinishSet();
            setTimeout(() => {
              alert('⏱ Время отдыха завершено! Пора к следующему подходу.');
            }, 50);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }

    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isRunning]);

  const handleSetTimer = (secs: number) => {
    Sound.playClick();
    setIsRunning(false);
    setSeconds(secs);
  };

  const toggleTimer = () => {
    Sound.playClick();
    if (seconds === 0) {
      setSeconds(60);
    }
    setIsRunning(prev => !prev);
  };

  const toggleExercise = (id: string) => {
    Sound.playClick();
    setCheckedItems(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  const formatTime = (totalSec: number) => {
    const m = Math.floor(totalSec / 60).toString().padStart(2, '0');
    const s = (totalSec % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  return (
    <div className="screen">
      <div className="page-container">
        {/* Хедер раздела */}
        <div className="page-header">
          <div className="page-title-box">
            <button
              className="back-btn"
              onClick={() => {
                Sound.playClick();
                onBack();
              }}
              title="В меню"
            >
              ←
            </button>
            <div>
              <h2>Тренировочные программы</h2>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Выберите тренировку и отмечайте выполненные подходы
              </p>
            </div>
          </div>
          <button
            className="btn btn-sm btn-accent"
            onClick={() => {
              Sound.playClick();
              onOpenTrainer();
            }}
          >
            📹 Запустить AI-Тренер с камерой
          </button>
        </div>

        {/* Таймер отдыха */}
        <div className="timer-box">
          <div style={{ textAlign: 'left' }}>
            <div style={{ fontSize: '12px', textTransform: 'uppercase', color: '#a3a3a3', fontWeight: 700 }}>
              Таймер отдыха
            </div>
            <div className="timer-val">{formatTime(seconds)}</div>
          </div>
          <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap' }}>
            <button className="btn btn-sm btn-outline" onClick={() => handleSetTimer(30)}>
              30 сек
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => handleSetTimer(60)}>
              60 сек
            </button>
            <button className="btn btn-sm btn-outline" onClick={() => handleSetTimer(90)}>
              90 сек
            </button>
            <button className="btn btn-sm" onClick={toggleTimer}>
              {isRunning ? 'Пауза' : seconds === 0 ? 'Заново' : seconds < 60 && !isRunning ? 'Продолжить' : 'Старт'}
            </button>
          </div>
        </div>

        {/* Программа 1: Full Body */}
        <div className="workout-program-card">
          <div className="workout-header">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Full Body (Тонус всего тела)</h3>
              <p style={{ fontSize: '13px', color: '#737373' }}>4 упражнения · 3 подхода · 40 минут</p>
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: '#f0fdf4',
                color: '#16a34a',
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              Базовый
            </span>
          </div>

          <div className="ex-list">
            <div className={`ex-item ${checkedItems['fb-1'] ? 'done' : ''}`}>
              <div>
                <div className="ex-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                  1. Классические приседания
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>3 подхода по 15 повторений</div>
              </div>
              <input
                type="checkbox"
                className="ex-check"
                checked={!!checkedItems['fb-1']}
                onChange={() => toggleExercise('fb-1')}
              />
            </div>

            <div className={`ex-item ${checkedItems['fb-2'] ? 'done' : ''}`}>
              <div>
                <div className="ex-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                  2. Отжимания от пола
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>3 подхода по 12 повторений</div>
              </div>
              <input
                type="checkbox"
                className="ex-check"
                checked={!!checkedItems['fb-2']}
                onChange={() => toggleExercise('fb-2')}
              />
            </div>

            <div className={`ex-item ${checkedItems['fb-3'] ? 'done' : ''}`}>
              <div>
                <div className="ex-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                  3. Выпады на каждую ногу
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>3 подхода по 10 повторений</div>
              </div>
              <input
                type="checkbox"
                className="ex-check"
                checked={!!checkedItems['fb-3']}
                onChange={() => toggleExercise('fb-3')}
              />
            </div>

            <div className={`ex-item ${checkedItems['fb-4'] ? 'done' : ''}`}>
              <div>
                <div className="ex-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                  4. Планка на локтях
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>3 подхода по 45 секунд</div>
              </div>
              <input
                type="checkbox"
                className="ex-check"
                checked={!!checkedItems['fb-4']}
                onChange={() => toggleExercise('fb-4')}
              />
            </div>
          </div>
        </div>

        {/* Программа 2: HIIT Кардио */}
        <div className="workout-program-card">
          <div className="workout-header">
            <div>
              <h3 style={{ fontSize: '18px', fontWeight: 800 }}>HIIT / Жиросжигание</h3>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Высокоинтенсивный интервальный тренинг · 25 минут
              </p>
            </div>
            <span
              style={{
                fontSize: '12px',
                fontWeight: 700,
                background: '#fef3c7',
                color: '#d97706',
                padding: '4px 10px',
                borderRadius: '6px'
              }}
            >
              Интенсив
            </span>
          </div>

          <div className="ex-list">
            <div className={`ex-item ${checkedItems['hiit-1'] ? 'done' : ''}`}>
              <div>
                <div className="ex-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                  1. Jumping Jacks
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>4 раунда по 40 секунд</div>
              </div>
              <input
                type="checkbox"
                className="ex-check"
                checked={!!checkedItems['hiit-1']}
                onChange={() => toggleExercise('hiit-1')}
              />
            </div>

            <div className={`ex-item ${checkedItems['hiit-2'] ? 'done' : ''}`}>
              <div>
                <div className="ex-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                  2. Берпи (Burpee)
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>3 раунда по 10 повторений</div>
              </div>
              <input
                type="checkbox"
                className="ex-check"
                checked={!!checkedItems['hiit-2']}
                onChange={() => toggleExercise('hiit-2')}
              />
            </div>

            <div className={`ex-item ${checkedItems['hiit-3'] ? 'done' : ''}`}>
              <div>
                <div className="ex-name" style={{ fontWeight: 700, fontSize: '14px' }}>
                  3. Mountain Climbers (Скалилаз)
                </div>
                <div style={{ fontSize: '12px', color: '#737373' }}>4 раунда по 30 секунд</div>
              </div>
              <input
                type="checkbox"
                className="ex-check"
                checked={!!checkedItems['hiit-3']}
                onChange={() => toggleExercise('hiit-3')}
              />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
