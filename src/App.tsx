import React, { useState, useEffect } from 'react';
import { Screen, User, DiaryEntry, DailyTargets, WorkoutSet, WorkoutSessionConfig, CompletedWorkoutSession } from './types';
import { Storage, DEFAULT_TARGETS } from './utils/storage';
import { BackgroundEffects } from './components/BackgroundEffects';
import { LandingScreen } from './components/LandingScreen';
import { AuthScreen } from './components/AuthScreen';
import { DashboardScreen } from './components/DashboardScreen';
import { WorkoutBuilder } from './components/WorkoutBuilder';
import { WorkoutRunner } from './components/WorkoutRunner';
import { WorkoutHistoryScreen } from './components/WorkoutHistoryScreen';
import { TopNutritionDrawer } from './components/TopNutritionDrawer';

export const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(() => Storage.getUser());
  const [currentScreen, setCurrentScreen] = useState<Screen>(() => {
    return Storage.getUser() ? 'dashboard' : 'landing';
  });

  // Top Drawer state
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Diary state
  const [diaryEntries, setDiaryEntries] = useState<DiaryEntry[]>(() => Storage.getDiary().entries);
  const [dailyTargets, setDailyTargets] = useState<DailyTargets>(() => Storage.getDiary().targets || DEFAULT_TARGETS);

  // Individual sets history
  const [workoutSets, setWorkoutSets] = useState<WorkoutSet[]>(() => Storage.getWorkoutSets());

  // Completed workout sessions
  const [completedSessions, setCompletedSessions] = useState<CompletedWorkoutSession[]>(() =>
    Storage.getCompletedSessions()
  );

  // Active workout session config
  const [activeSessionConfig, setActiveSessionConfig] = useState<WorkoutSessionConfig | null>(null);

  // Save diary changes
  useEffect(() => {
    Storage.saveDiary(diaryEntries, dailyTargets);
  }, [diaryEntries, dailyTargets]);

  const handleAuthSuccess = (user: User) => {
    Storage.setUser(user);
    setCurrentUser(user);
    setCurrentScreen('dashboard');
  };

  const handleLogout = () => {
    Storage.setUser(null);
    setCurrentUser(null);
    setIsDrawerOpen(false);
    setCurrentScreen('landing');
  };

  const handleAddFood = (entry: Omit<DiaryEntry, 'id'>) => {
    const newEntry: DiaryEntry = {
      ...entry,
      id: Date.now(),
      createdAt: new Date().toISOString()
    };
    setDiaryEntries(prev => [newEntry, ...prev]);
  };

  const handleDeleteFood = (id: number) => {
    setDiaryEntries(prev => prev.filter(e => e.id !== id));
  };

  const handleClearDiary = () => {
    if (window.confirm('Вы уверены, что хотите очистить весь дневник за сегодня?')) {
      setDiaryEntries([]);
    }
  };

  const handleUpdateTargets = (newTargets: DailyTargets) => {
    setDailyTargets(newTargets);
  };

  const handleSaveSet = (set: WorkoutSet) => {
    const updated = Storage.addWorkoutSet(set);
    setWorkoutSets([...updated]);
  };

  const handleSaveSession = (session: CompletedWorkoutSession) => {
    const updated = Storage.saveCompletedSession(session);
    setCompletedSessions([...updated]);
  };

  const handleClearSessions = () => {
    Storage.clearCompletedSessions();
    setCompletedSessions([]);
  };

  const handleLaunchSession = (config: WorkoutSessionConfig) => {
    setActiveSessionConfig(config);
    setCurrentScreen('runner');
  };

  return (
    <div className="smartfit-app">
      <BackgroundEffects />

      {/* Выдвижная верхняя шторка с питанием и профилем */}
      {currentUser && (
        <TopNutritionDrawer
          isOpen={isDrawerOpen}
          onClose={() => setIsDrawerOpen(false)}
          user={currentUser}
          onLogout={handleLogout}
          entries={diaryEntries}
          targets={dailyTargets}
          onAddFood={handleAddFood}
          onDeleteFood={handleDeleteFood}
          onClearDiary={handleClearDiary}
          onUpdateTargets={handleUpdateTargets}
        />
      )}

      {currentScreen === 'landing' && (
        <LandingScreen
          onStart={() => setCurrentScreen(currentUser ? 'dashboard' : 'register')}
          onLogin={() => setCurrentScreen('login')}
        />
      )}

      {currentScreen === 'login' && (
        <AuthScreen
          mode="login"
          onSuccess={handleAuthSuccess}
          onSwitchMode={m => setCurrentScreen(m)}
          onBack={() => setCurrentScreen('landing')}
        />
      )}

      {currentScreen === 'register' && (
        <AuthScreen
          mode="register"
          onSuccess={handleAuthSuccess}
          onSwitchMode={m => setCurrentScreen(m)}
          onBack={() => setCurrentScreen('landing')}
        />
      )}

      {currentScreen === 'dashboard' && currentUser && (
        <DashboardScreen
          user={currentUser}
          onStartWorkout={() => setCurrentScreen('builder')}
          onOpenDrawer={() => setIsDrawerOpen(true)}
          onOpenHistory={() => setCurrentScreen('history')}
          workoutSets={workoutSets}
          diaryEntries={diaryEntries}
          targets={dailyTargets}
          completedSessions={completedSessions}
        />
      )}

      {currentScreen === 'builder' && (
        <WorkoutBuilder
          onBack={() => setCurrentScreen('dashboard')}
          onStartSession={handleLaunchSession}
        />
      )}

      {currentScreen === 'runner' && activeSessionConfig && (
        <WorkoutRunner
          sessionConfig={activeSessionConfig}
          onExit={() => setCurrentScreen('dashboard')}
          onSaveSet={handleSaveSet}
          onSaveSession={handleSaveSession}
        />
      )}

      {currentScreen === 'history' && (
        <WorkoutHistoryScreen
          onBack={() => setCurrentScreen('dashboard')}
          sessions={completedSessions}
          onClearHistory={handleClearSessions}
          onStartNewWorkout={() => setCurrentScreen('builder')}
        />
      )}
    </div>
  );
};

export default App;
