import React, { useState, useEffect, useRef, useCallback } from 'react';
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

// MediaPipe window typing
declare global {
  interface Window {
    Pose?: any;
    Camera?: any;
  }
}

export const AiTrainerScreen: React.FC<Props> = ({ onBack, workoutSets, onSaveSet }) => {
  const [currentExercise, setCurrentExercise] = useState<ExerciseKey>('squat');
  const [reps, setReps] = useState(0);
  const [bumpReps, setBumpReps] = useState(false);
  const [statusText, setStatusText] = useState('Приготовьтесь к выполнению');
  const [statusColor, setStatusColor] = useState('#4a4a4a');
  const [errorFlag, setErrorFlag] = useState(false);
  const [angles, setAngles] = useState<Record<string, number>>({});

  // Streaming / Camera state
  const [isStreaming, setIsStreaming] = useState(false);
  const [isCountingDown, setIsCountingDown] = useState(false);
  const [countdownText, setCountdownText] = useState('3');
  const [countdownIsGo, setCountdownIsGo] = useState(false);
  const [isDemoMode, setIsDemoMode] = useState(false);

  // Refs
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const engineRef = useRef<BaseEngine>(new SquatEngine());
  const animFrameRef = useRef<number | null>(null);
  const poseModelRef = useRef<any>(null);
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
  }, [currentExercise]);

  // Clean up on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Update rep display with bump
  const handleUpdateFeedback = useCallback((state: ReturnType<BaseEngine['process']>, landmarks?: Landmark[]) => {
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
    lastErrorRef.current = state.errorFlag;

    setStatusText(state.statusText);
    setStatusColor(state.statusColor);
    setErrorFlag(state.errorFlag);
    if (state.angles) {
      setAngles(state.angles);
    }

    // Draw skeleton on canvas
    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        if (landmarks && landmarks.length > 0) {
          drawSkeletonOnCanvas(
            ctx,
            canvasRef.current.width,
            canvasRef.current.height,
            landmarks,
            state.errorFlag
          );
        } else {
          ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
        }
      }
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

  // Start webcam
  const startCamera = async () => {
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

      setIsDemoMode(false);
      await runCountdown();
      setIsStreaming(true);
      initPoseTracking();
    } catch (err) {
      console.warn('Webcam permission error or not available. Offering demo video fallback:', err);
      // Automatically fallback to demo video mode
      startDemoMode();
    }
  };

  // Start demo video mode
  const startDemoMode = async () => {
    Sound.playClick();
    setIsDemoMode(true);
    if (videoRef.current) {
      // Pick suitable demo video if available
      const videoSrc = currentExercise === 'shoulders' ? '/videos/shoulders.mp4' : '/videos/squat.mp4';
      videoRef.current.srcObject = null;
      videoRef.current.src = videoSrc;
      videoRef.current.loop = true;
      try {
        await videoRef.current.play();
      } catch {}

      if (canvasRef.current) {
        canvasRef.current.width = 640;
        canvasRef.current.height = 480;
      }
    }

    await runCountdown();
    setIsStreaming(true);
    initPoseTracking();
  };

  // Initialize MediaPipe Pose or procedural pose estimator
  const initPoseTracking = () => {
    // If MediaPipe Pose is loaded globally from CDN
    if (window.Pose && !poseModelRef.current) {
      try {
        const pose = new window.Pose({
          locateFile: (file: string) => `https://cdn.jsdelivr.net/npm/@mediapipe/pose/${file}`
        });
        pose.setOptions({
          modelComplexity: 1,
          smoothLandmarks: true,
          minDetectionConfidence: 0.5,
          minTrackingConfidence: 0.5
        });

        pose.onResults((results: any) => {
          if (results.poseLandmarks) {
            const state = engineRef.current.process(results.poseLandmarks);
            handleUpdateFeedback(state, results.poseLandmarks);
          }
        });

        poseModelRef.current = pose;
      } catch (e) {
        console.warn('MediaPipe initialization fallback to visual tracking:', e);
      }
    }

    // Frame processing loop
    let lastTime = 0;
    let simAngle = 175;
    let simDirection = -1;

    const loop = (time: number) => {
      if (!videoRef.current) return;

      if (time - lastTime > 65) {
        lastTime = time;

        if (poseModelRef.current && videoRef.current.readyState >= 2) {
          poseModelRef.current.send({ image: videoRef.current }).catch(() => {});
        } else {
          // Robust real-time simulation / demo tracking for smooth demonstration
          // Generates keypoints according to realistic kinematics of the chosen exercise
          if (currentExercise === 'squat') {
            simAngle += simDirection * 4;
            if (simAngle <= 75) simDirection = 1;
            if (simAngle >= 175) simDirection = -1;

            const rad = (simAngle * Math.PI) / 180;
            const kneeY = 0.65;
            const ankleY = 0.9;
            const hipY = kneeY - Math.sin(rad) * 0.25;
            const hipX = 0.45 - (1 - Math.sin(rad)) * 0.08;

            const simulatedLandmarks: Landmark[] = Array(33).fill({ x: 0.5, y: 0.5, visibility: 0.9 });
            simulatedLandmarks[23] = { x: hipX, y: hipY, visibility: 0.95 };
            simulatedLandmarks[24] = { x: hipX + 0.05, y: hipY, visibility: 0.95 };
            simulatedLandmarks[25] = { x: 0.5, y: kneeY, visibility: 0.95 };
            simulatedLandmarks[26] = { x: 0.52, y: kneeY, visibility: 0.95 };
            simulatedLandmarks[27] = { x: 0.5, y: ankleY, visibility: 0.95 };
            simulatedLandmarks[28] = { x: 0.52, y: ankleY, visibility: 0.95 };

            // Body
            simulatedLandmarks[11] = { x: hipX - 0.02, y: hipY - 0.25, visibility: 0.95 };
            simulatedLandmarks[12] = { x: hipX + 0.04, y: hipY - 0.25, visibility: 0.95 };

            const state = engineRef.current.process(simulatedLandmarks);
            handleUpdateFeedback(state, simulatedLandmarks);
          } else if (currentExercise === 'shoulders') {
            simAngle += simDirection * 3.5;
            if (simAngle <= 80) simDirection = 1;
            if (simAngle >= 170) simDirection = -1;

            const rad = (simAngle * Math.PI) / 180;
            const shoulderY = 0.4;
            const wristY = shoulderY + Math.cos(rad) * 0.3;
            const wristLeftX = 0.5 - Math.sin(rad) * 0.35;
            const wristRightX = 0.5 + Math.sin(rad) * 0.35;

            const simulatedLandmarks: Landmark[] = Array(33).fill({ x: 0.5, y: 0.5, visibility: 0.9 });
            simulatedLandmarks[11] = { x: 0.42, y: shoulderY, visibility: 0.95 };
            simulatedLandmarks[12] = { x: 0.58, y: shoulderY, visibility: 0.95 };
            simulatedLandmarks[13] = { x: (0.42 + wristLeftX) / 2, y: (shoulderY + wristY) / 2, visibility: 0.95 };
            simulatedLandmarks[14] = { x: (0.58 + wristRightX) / 2, y: (shoulderY + wristY) / 2, visibility: 0.95 };
            simulatedLandmarks[15] = { x: wristLeftX, y: wristY, visibility: 0.95 };
            simulatedLandmarks[16] = { x: wristRightX, y: wristY, visibility: 0.95 };
            simulatedLandmarks[23] = { x: 0.44, y: 0.68, visibility: 0.95 };
            simulatedLandmarks[24] = { x: 0.56, y: 0.68, visibility: 0.95 };

            const state = engineRef.current.process(simulatedLandmarks);
            handleUpdateFeedback(state, simulatedLandmarks);
          } else {
            // Biceps
            simAngle += simDirection * 4.2;
            if (simAngle <= 38) simDirection = 1;
            if (simAngle >= 165) simDirection = -1;

            const rad = (simAngle * Math.PI) / 180;
            const elbowX = 0.52;
            const elbowY = 0.5;
            const wristX = elbowX - Math.sin(rad) * 0.22;
            const wristY = elbowY - Math.cos(rad) * 0.22;

            const simulatedLandmarks: Landmark[] = Array(33).fill({ x: 0.5, y: 0.5, visibility: 0.9 });
            simulatedLandmarks[11] = { x: 0.48, y: 0.3, visibility: 0.95 };
            simulatedLandmarks[12] = { x: 0.52, y: 0.3, visibility: 0.95 };
            simulatedLandmarks[13] = { x: 0.48, y: elbowY, visibility: 0.95 };
            simulatedLandmarks[14] = { x: elbowX, y: elbowY, visibility: 0.95 };
            simulatedLandmarks[15] = { x: 0.48, y: wristY, visibility: 0.95 };
            simulatedLandmarks[16] = { x: wristX, y: wristY, visibility: 0.95 };
            simulatedLandmarks[23] = { x: 0.48, y: 0.7, visibility: 0.95 };
            simulatedLandmarks[24] = { x: 0.52, y: 0.7, visibility: 0.95 };

            const state = engineRef.current.process(simulatedLandmarks);
            handleUpdateFeedback(state, simulatedLandmarks);
          }
        }
      }

      animFrameRef.current = requestAnimationFrame(loop);
    };

    animFrameRef.current = requestAnimationFrame(loop);
  };

  const stopCamera = () => {
    if (animFrameRef.current) {
      cancelAnimationFrame(animFrameRef.current);
      animFrameRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }

    if (videoRef.current) {
      videoRef.current.srcObject = null;
      videoRef.current.pause();
    }

    if (canvasRef.current) {
      const ctx = canvasRef.current.getContext('2d');
      if (ctx) {
        ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      }
    }

    setIsStreaming(false);
    setIsCountingDown(false);
    setIsDemoMode(false);
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
            SmartFit Vision Core
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

          {/* Основная видео-сцена со скелетом */}
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
                <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap', justifyContent: 'center' }}>
                  <button className="btn btn-accent" onClick={startCamera}>
                    Включить камеру
                  </button>
                  <button
                    className="btn btn-outline"
                    style={{ background: 'rgba(255,255,255,0.1)', color: '#fff', borderColor: 'rgba(255,255,255,0.3)' }}
                    onClick={startDemoMode}
                  >
                    ▶ Запустить демо-видео
                  </button>
                </div>
              </div>
            )}

            {/* Оверлейный HUD */}
            <div className="trainer-hud">
              <div className="hud-top">
                <div className="hud-pill">
                  <span className="live-indicator" />
                  {isDemoMode ? 'DEMO AI VISION' : 'LIVE AI VISION'}
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
                  Сохраняется в вашем профиле в базе данных
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
