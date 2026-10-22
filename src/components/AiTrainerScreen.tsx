import React, { useState, useEffect, useRef, useCallback } from 'react';
import { io, Socket } from 'socket.io-client';
import { ExerciseKey, Landmark, WorkoutSet } from '../types';
import { Sound } from '../utils/sound';
import {
  SquatEngine,
  ShouldersEngine,
  BicepsEngine,
  BaseEngine,
  drawSkeletonOnCanvas
} from '../vision/exerciseEngines';

interface Props {
  onBack: () => void;
  workoutSets: WorkoutSet[];
  onSaveSet: (set: WorkoutSet) => void;
}

export const AiTrainerScreen: React.FC<Props> = ({ onBack, workoutSets, onSaveSet }) => {
  const [currentExercise, setCurrentExercise] = useState<ExerciseKey>('squat');
  const [reps, setReps] = useState(0);
  const [bumpReps, setBumpReps] = useState(false);
  const [statusText, setStatusText] = useState('Приготовьтесь к выполнению');
  const [statusColor, setStatusColor] = useState('#4a4a4a');
  const [errorFlag, setErrorFlag] = useState(false);
  const [angles, setAngles] = useState<Record<string, number>>({});
  const [cameraError, setCameraError] = useState<string | null>(null);

  // Streaming / Camera state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownText, setCountdownText] = useState('3');
  const [countdownIsGo, setCountdownIsGo] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const captureCanvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const socketRef = useRef<Socket | null>(null);
  const frameIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const engineRef = useRef<BaseEngine>(new SquatEngine());
  const lastErrorRef = useRef(false);
  const lastRepsRef = useRef(0);

  // Switch engine on exercise change
  useEffect(() => {
    if (currentExercise === 'squat') {
      engineRef.current = new SquatEngine();
    } else if (currentExercise === 'shoulders') {
      engineRef.current = new ShouldersEngine();
    } else {
      engineRef.current = new BicepsEngine();
    }
    const state = engineRef.current.getState();
    setReps(state.reps);
    lastRepsRef.current = state.reps;
    setStatusText(state.statusText);
    setStatusColor(state.statusColor);
    setErrorFlag(state.errorFlag);
    lastErrorRef.current = state.errorFlag;
    setAngles(state.angles || {});

    // Notify backend
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('select_exercise', { exercise: currentExercise });
    }
  }, [currentExercise]);

  // Connect Socket.IO for Python MediaPipe backend
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 5,
      timeout: 3000
    });

    socket.on('connect', () => {
      socket.emit('select_exercise', { exercise: currentExercise });
    });

    socket.on('pose_feedback', (data: any) => {
      if (!data) return;

      if (typeof data.reps === 'number') {
        if (data.reps > lastRepsRef.current) {
          Sound.playSuccess();
          setBumpReps(true);
          setTimeout(() => setBumpReps(false), 250);
        }
        lastRepsRef.current = data.reps;
        setReps(data.reps);
      }

      if (data.error_flag && !lastErrorRef.current) {
        Sound.playError();
      }
      lastErrorRef.current = !!data.error_flag;

      if (data.status_text) setStatusText(data.status_text);
      if (data.status_color) setStatusColor(data.status_color);
      setErrorFlag(!!data.error_flag);
      if (data.angles) setAngles(data.angles);

      // Draw skeleton on canvas
      if (canvasRef.current) {
        const ctx = canvasRef.current.getContext('2d');
        if (ctx) {
          if (data.landmarks && data.landmarks.length > 0) {
            drawSkeletonOnCanvas(
              ctx,
              canvasRef.current.width,
              canvasRef.current.height,
              data.landmarks,
              !!data.error_flag
            );
          } else {
            ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
          }
        }
      }
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Frame capture loop sending webcam frames to Python MediaPipe socket
  useEffect(() => {
    if (!isStreaming || isCountingDown || cameraError) return;

    frameIntervalRef.current = setInterval(() => {
      if (!videoRef.current || videoRef.current.readyState < 2) return;

      if (!captureCanvasRef.current) {
        captureCanvasRef.current = document.createElement('canvas');
        captureCanvasRef.current.width = 480;
        captureCanvasRef.current.height = 360;
      }

      const captureCtx = captureCanvasRef.current.getContext('2d');
      if (!captureCtx) return;

      captureCtx.drawImage(videoRef.current, 0, 0, 480, 360);
      const dataUrl = captureCanvasRef.current.toDataURL('image/jpeg', 0.6);

      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('process_frame', { frame: dataUrl });
      }
    }, 70); // ~14 FPS

    return () => {
      if (frameIntervalRef.current) {
        clearInterval(frameIntervalRef.current);
        frameIntervalRef.current = null;
      }
    };
  }, [isStreaming, isCountingDown, cameraError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Countdown routine
  const runCountdown = async (): Promise<boolean> => {
    setIsCountingDown(true);
    const steps = [
      { text: '3', isGo: false },
      { text: '2', isGo: false },
      { text: '1', isGo: false },
      { text: 'СТАРТ!', isGo: true }
    ];

    for (const step of steps) {
      setCountdownText(step.text);
      setCountdownIsGo(step.isGo);

      if (step.isGo) {
        Sound.playCountdownGo();
        await new Promise(r => setTimeout(r, 650));
      } else {
        Sound.playCountdownTick();
        await new Promise(r => setTimeout(r, 900));
      }
    }

    setIsCountingDown(false);
    return true;
  };

  // Start real webcam
  const startCamera = async () => {
    setCameraError(null);
    try {
      Sound.playClick();
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: { ideal: 640 }, height: { ideal: 480 }, facingMode: 'user' },
        audio: false
      });

      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        await videoRef.current.play();

        if (canvasRef.current) {
          canvasRef.current.width = videoRef.current.videoWidth || 640;
          canvasRef.current.height = videoRef.current.videoHeight || 480;
        }

        if (!captureCanvasRef.current) {
          captureCanvasRef.current = document.createElement('canvas');
          captureCanvasRef.current.width = 480;
          captureCanvasRef.current.height = 360;
        }
      }

      await runCountdown();
      setIsStreaming(true);
    } catch (err: any) {
      console.warn('Webcam permission error:', err);
      // Clean error without any video fallback
      setCameraError('Веб-камера недоступна. Пожалуйста, подключите камеру и разрешите доступ к ней в настройках браузера.');
      setIsStreaming(false);
      setIsCountingDown(false);
    }
  };

  const stopCamera = () => {
    if (frameIntervalRef.current) {
      clearInterval(frameIntervalRef.current);
      frameIntervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setIsStreaming(false);
    setIsCountingDown(false);
  };

  const handleToggleCamera = () => {
    if (isStreaming || isCountingDown) {
      Sound.playClick();
      stopCamera();
    } else {
      startCamera();
    }
  };

  const handleResetSet = () => {
    Sound.playClick();
    engineRef.current.reset();
    setReps(0);
    lastRepsRef.current = 0;
    setErrorFlag(false);
    lastErrorRef.current = false;
    const state = engineRef.current.getState();
    setStatusText(state.statusText);
    setStatusColor(state.statusColor);
    setAngles(state.angles || {});

    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('reset_exercise');
    }
  };

  const handleFinishSet = () => {
    if (reps <= 0) {
      Sound.playError();
      alert('Сначала выполните хотя бы 1 повторение!');
      return;
    }

    Sound.playFinishSet();
    const newSet: WorkoutSet = {
      id: Date.now().toString(),
      exercise: currentExercise,
      reps,
      createdAt: new Date().toISOString()
    };
    onSaveSet(newSet);
    alert(`🎉 Подход завершен! Выполнено повторений: ${reps}`);
    handleResetSet();
  };

  const namesMap: Record<string, string> = {
    squat: '🦵 Приседания',
    shoulders: '🤲 Подъём на плечи',
    biceps: '💪 Сгибание на бицепс',
    pushups: '🏋️ Отжимания',
    plank: '⏱️ Планка',
    lunges: '🏃 Выпады',
    jumping_jacks: '⚡ Jumping Jacks',
    burpee: '🔥 Берпи',
    climbers: '🧗 Скалолаз'
  };

  const totalSetsCount = workoutSets.length;
  const totalRepsCount = workoutSets.reduce((sum, s) => sum + s.reps, 0);

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
                stopCamera();
                onBack();
              }}
              title="В меню"
            >
              ←
            </button>
            <div>
              <h2>AI-Оценка техники упражнений</h2>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Нейросетевой анализ позы человека (MediaPipe Pose + Python WebSocket Core)
              </p>
            </div>
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 700,
              color: '#16a34a',
              background: '#f0fdf4',
              padding: '6px 14px',
              borderRadius: '100px',
              display: 'flex',
              alignItems: 'center',
              gap: '6px'
            }}
          >
            <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#16a34a' }} />
            MediaPipe Pose Core
          </div>
        </div>

        <div className="trainer-wrapper">
          {/* Селектор упражнений */}
          <div className="exercise-selector-bar">
            <button
              className={`exercise-select-btn ${currentExercise === 'squat' ? 'active' : ''}`}
              onClick={() => {
                Sound.playClick();
                setCurrentExercise('squat');
              }}
            >
              <span className="ex-icon">🦵</span>
              <div className="ex-info">
                <h4>Приседания</h4>
                <p>Контроль коленей · Ракурс в профиль или 3/4</p>
              </div>
            </button>

            <button
              className={`exercise-select-btn ${currentExercise === 'shoulders' ? 'active' : ''}`}
              onClick={() => {
                Sound.playClick();
                setCurrentExercise('shoulders');
              }}
            >
              <span className="ex-icon">🤲</span>
              <div className="ex-info">
                <h4>Подъём на плечи</h4>
                <p>Разведение рук · Встаньте лицом к камере</p>
              </div>
            </button>

            <button
              className={`exercise-select-btn ${currentExercise === 'biceps' ? 'active' : ''}`}
              onClick={() => {
                Sound.playClick();
                setCurrentExercise('biceps');
              }}
            >
              <span className="ex-icon">💪</span>
              <div className="ex-info">
                <h4>Сгибание на бицепс</h4>
                <p>Амплитуда в локте · Ракурс боком к камере</p>
              </div>
            </button>
          </div>

          {/* Сообщение об ошибке камеры */}
          {cameraError ? (
            <div className="manual-workout-card" style={{ border: '1.5px solid #fecaca', background: '#fff' }}>
              <span style={{ fontSize: '56px', display: 'block', marginBottom: '14px' }}>📹</span>
              <h3 style={{ fontSize: '22px', fontWeight: 800, color: '#dc2626', marginBottom: '8px' }}>
                Веб-камера недоступна
              </h3>
              <p style={{ color: '#737373', fontSize: '14px', maxWidth: '480px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                {cameraError}
              </p>
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
                <button className="btn btn-accent" onClick={startCamera}>
                  🔄 Повторить запрос к веб-камере
                </button>
              </div>
            </div>
          ) : (
            /* Основная видео-сцена со скелетом */
            <div className="trainer-stage">
              <video
                ref={videoRef}
                className="trainer-video-feed"
                playsInline
                autoPlay
                muted
                style={{ display: isStreaming ? 'block' : 'none' }}
              />
              <canvas
                ref={canvasRef}
                className="trainer-canvas-overlay"
                style={{ display: isStreaming ? 'block' : 'none' }}
              />

              {/* Оверлей 3-секундного отсчёта */}
              {isCountingDown && (
                <div className="countdown-overlay">
                  <div className="countdown-label">Приготовьтесь к старту</div>
                  <div className={`countdown-number ${countdownIsGo ? 'go' : ''}`}>
                    {countdownText}
                  </div>
                </div>
              )}

              {/* Заглушка до включения камеры */}
              {!isStreaming && !isCountingDown && (
                <div className="trainer-placeholder">
                  <div className="cam-icon">📹</div>
                  <h3>Камера выключена</h3>
                  <p>
                    Включите веб-камеру, отойдите на 1.5–2 метра, чтобы тело полностью помещалось в
                    кадр, и начните подход.
                  </p>
                  <div>
                    <button className="btn btn-accent" onClick={startCamera}>
                      Включить камеру
                    </button>
                  </div>
                </div>
              )}

              {/* Оверлейный HUD */}
              <div className="trainer-hud">
                <div className="hud-top">
                  <div className="hud-pill">
                    <span className="live-indicator" />
                    LIVE MEDIAPIPE POSE
                  </div>
                  <div className="rep-display-box">
                    <div className={`rep-number ${bumpReps ? 'bump' : ''}`}>{reps}</div>
                    <div className="rep-label">Повторений</div>
                  </div>
                </div>

                <div className="hud-bottom">
                  <div
                    className={`trainer-status-banner ${errorFlag ? 'error' : statusColor === '#00aa55' ? 'success' : ''}`}
                  >
                    <div className="status-left">
                      <span className="status-indicator-dot" style={{ backgroundColor: statusColor }} />
                      <span className="status-text">{statusText}</span>
                    </div>

                    {angles && Object.keys(angles).length > 0 && (
                      <div className="angle-badge">
                        {Object.entries(angles)
                          .map(([k, v]) => `${k === 'knee' ? 'Колено' : k === 'elbow' ? 'Локоть' : k}: ${v}°`)
                          .join(' | ')}
                      </div>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Панель кнопок управления */}
          <div className="trainer-controls-panel">
            <div className="controls-left">
              <button
                className={`btn ${isStreaming ? 'btn-danger' : ''}`}
                onClick={handleToggleCamera}
              >
                {isStreaming ? '⏹ Выключить камеру' : '📹 Включить камеру'}
              </button>
              <button className="btn btn-outline" onClick={handleResetSet}>
                Сброс счётчика
              </button>
            </div>
            <div className="controls-right">
              <button className="btn btn-accent" onClick={handleFinishSet}>
                ✓ Завершить и сохранить подход
              </button>
            </div>
          </div>

          {/* История выполненных подходов */}
          <div className="sets-history-card">
            <div className="sets-history-header">
              <div>
                <h3 style={{ fontSize: '18px', fontWeight: 800 }}>Статистика подходов за сегодня</h3>
                <p style={{ fontSize: '13px', color: '#737373' }}>
                  Сохраняется в вашем профиле
                </p>
              </div>
              <div style={{ display: 'flex', gap: '16px' }}>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>
                    Всего подходов
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900 }}>{totalSetsCount}</div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <div style={{ fontSize: '11px', textTransform: 'uppercase', color: '#888', fontWeight: 700 }}>
                    Всего повторов
                  </div>
                  <div style={{ fontSize: '20px', fontWeight: 900, color: 'var(--accent)' }}>
                    {totalRepsCount}
                  </div>
                </div>
              </div>
            </div>
            <div className="sets-table-grid">
              {workoutSets.length === 0 ? (
                <div className="empty-state">
                  Завершите свой первый подход, чтобы увидеть историю!
                </div>
              ) : (
                workoutSets.map(s => {
                  const dateStr = s.createdAt
                    ? new Date(s.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
                    : '';
                  return (
                    <div key={s.id} className="set-row-item">
                      <div>
                        <span className="set-row-title">{namesMap[s.exercise] || s.exercise}</span>
                        <span style={{ fontSize: '11px', color: '#888', marginLeft: '8px' }}>
                          {dateStr}
                        </span>
                      </div>
                      <span className="set-row-reps">{s.reps} повт.</span>
                    </div>
                  );
                })
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
