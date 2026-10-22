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
import { PoseService } from '../vision/poseService';

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
  const [modelStatus, setModelStatus] = useState<'loading' | 'ready' | 'idle'>('idle');

  // Streaming / Camera state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownText, setCountdownText] = useState('3');
  const [countdownIsGo, setCountdownIsGo] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const poseServiceRef = useRef<PoseService | null>(null);
  const animFrameIdRef = useRef<number | null>(null);
  const socketRef = useRef<Socket | null>(null);
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

    // Notify backend if connected
    if (socketRef.current && socketRef.current.connected) {
      socketRef.current.emit('select_exercise', { exercise: currentExercise });
    }
  }, [currentExercise]);

  // Connect Socket.IO for Python MediaPipe backend (optional sync)
  useEffect(() => {
    const socket = io({
      transports: ['websocket', 'polling'],
      reconnectionAttempts: 3,
      timeout: 2500
    });

    socket.on('connect', () => {
      socket.emit('select_exercise', { exercise: currentExercise });
    });

    socketRef.current = socket;

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };
  }, []);

  // Update exercise state from landmarks detected by MediaPipe
  const handlePoseLandmarks = useCallback((landmarks: Landmark[]) => {
    if (!canvasRef.current || !videoRef.current) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const vw = videoRef.current.videoWidth || 640;
    const vh = videoRef.current.videoHeight || 480;
    if (canvas.width !== vw || canvas.height !== vh) {
      canvas.width = vw;
      canvas.height = vh;
    }

    if (landmarks && landmarks.length >= 17) {
      const state = engineRef.current.process(landmarks);

      if (state.reps > lastRepsRef.current) {
        Sound.playSuccess();
        setBumpReps(true);
        setTimeout(() => setBumpReps(false), 250);
      }
      lastRepsRef.current = state.reps;
      setReps(state.reps);

      if (state.errorFlag && !lastErrorRef.current) {
        Sound.playError();
      }
      lastErrorRef.current = !!state.errorFlag;

      setStatusText(state.statusText);
      setStatusColor(state.statusColor);
      setErrorFlag(!!state.errorFlag);
      if (state.angles) setAngles(state.angles);

      drawSkeletonOnCanvas(ctx, canvas.width, canvas.height, landmarks, !!state.errorFlag);
    } else {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      setStatusText('👉 Встаньте перед камерой так, чтобы тело было видно');
      setStatusColor('#4a4a4a');
    }
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

  // Start real webcam and MediaPipe model
  const startCamera = async () => {
    setCameraError(null);
    setModelStatus('loading');
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
      }

      // Initialize client-side MediaPipe Pose
      if (!poseServiceRef.current) {
        poseServiceRef.current = new PoseService({
          onResults: (landmarks) => {
            handlePoseLandmarks(landmarks);
          },
          onStatusChange: (status) => {
            if (status === 'ready') setModelStatus('ready');
            if (status === 'error') setModelStatus('idle');
          }
        });
        await poseServiceRef.current.initialize();
      }

      await runCountdown();
      setIsStreaming(true);
    } catch (err: any) {
      console.warn('Webcam permission error:', err);
      setModelStatus('idle');
      setCameraError('Веб-камера недоступна. Пожалуйста, подключите камеру и разрешите доступ к ней в настройках браузера.');
      setIsStreaming(false);
      setIsCountingDown(false);
    }
  };

  const stopCamera = () => {
    if (animFrameIdRef.current) {
      cancelAnimationFrame(animFrameIdRef.current);
      animFrameIdRef.current = null;
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

  // Frame processing loop with MediaPipe Pose
  useEffect(() => {
    if (!isStreaming || isCountingDown || cameraError) return;

    let isActive = true;

    const renderLoop = async () => {
      if (!isActive) return;

      if (videoRef.current && videoRef.current.readyState >= 2 && poseServiceRef.current) {
        await poseServiceRef.current.processFrame(videoRef.current);
      }

      if (isActive) {
        animFrameIdRef.current = requestAnimationFrame(renderLoop);
      }
    };

    animFrameIdRef.current = requestAnimationFrame(renderLoop);

    return () => {
      isActive = false;
      if (animFrameIdRef.current) {
        cancelAnimationFrame(animFrameIdRef.current);
        animFrameIdRef.current = null;
      }
    };
  }, [isStreaming, isCountingDown, cameraError]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      if (poseServiceRef.current) {
        poseServiceRef.current.destroy();
        poseServiceRef.current = null;
      }
      stopCamera();
    };
  }, []);

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
                Нейросетевой анализ позы человека (MediaPipe Pose + Computer Vision)
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
                    {modelStatus === 'loading' ? 'ЗАГРУЗКА MEDIAPIPE...' : 'LIVE MEDIAPIPE POSE'}
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
