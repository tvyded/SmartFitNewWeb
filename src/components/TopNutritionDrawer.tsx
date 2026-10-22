import React, { useState } from 'react';
import { DailyTargets, DiaryEntry, User } from '../types';
import { QUICK_FOODS } from '../utils/storage';
import { Sound } from '../utils/sound';

interface Props {
  isOpen: boolean;
  onClose: () => void;
  user: User;
  onLogout: () => void;
  entries: DiaryEntry[];
  targets: DailyTargets;
  onAddFood: (entry: Omit<DiaryEntry, 'id'>) => void;
  onDeleteFood: (id: number) => void;
  onClearDiary: () => void;
  onUpdateTargets: (newTargets: DailyTargets) => void;
}

export const TopNutritionDrawer: React.FC<Props> = ({
  isOpen,
  onClose,
  user,
  onLogout,
  entries,
  targets,
  onAddFood,
  onDeleteFood,
  onClearDiary,
  onUpdateTargets
}) => {
  const [activeTab, setActiveTab] = useState<'diary' | 'calc' | 'profile'>('diary');

  // Diary form state
  const [foodName, setFoodName] = useState('');
  const [foodCalories, setFoodCalories] = useState('');
  const [foodProtein, setFoodProtein] = useState('');
  const [foodFat, setFoodFat] = useState('');
  const [foodCarbs, setFoodCarbs] = useState('');

  // Calculator form state
  const [calcGender, setCalcGender] = useState<'male' | 'female'>('male');
  const [calcAge, setCalcAge] = useState(22);
  const [calcWeight, setCalcWeight] = useState(75);
  const [calcHeight, setCalcHeight] = useState(180);
  const [calcActivity, setCalcActivity] = useState(1.375);
  const [calcGoal, setCalcGoal] = useState<'maintain' | 'loss' | 'gain'>('maintain');
  const [calculatedTargets, setCalculatedTargets] = useState<DailyTargets | null>(null);

  // Totals
  const totalCals = entries.reduce((sum, item) => sum + (item.calories || 0), 0);
  const totalProt = entries.reduce((sum, item) => sum + (item.protein || 0), 0);
  const totalFat = entries.reduce((sum, item) => sum + (item.fat || 0), 0);
  const totalCarbs = entries.reduce((sum, item) => sum + (item.carbs || 0), 0);

  const targetCals = targets.calories || 2200;
  const diff = targetCals - totalCals;
  const pct = Math.min(Math.round((totalCals / targetCals) * 100), 100);

  const handleQuickFood = (food: typeof QUICK_FOODS[0]) => {
    Sound.playClick();
    setFoodName(food.name);
    setFoodCalories(food.calories.toString());
    setFoodProtein(food.protein.toString());
    setFoodFat(food.fat.toString());
    setFoodCarbs(food.carbs.toString());
  };

  const handleAddSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!foodName.trim()) return;

    Sound.playClick();
    onAddFood({
      name: foodName.trim(),
      calories: parseInt(foodCalories, 10) || 0,
      protein: parseFloat(foodProtein) || 0,
      fat: parseFloat(foodFat) || 0,
      carbs: parseFloat(foodCarbs) || 0
    });

    setFoodName('');
    setFoodCalories('');
    setFoodProtein('');
    setFoodFat('');
    setFoodCarbs('');
  };

  const handleCalculate = (e: React.FormEvent) => {
    e.preventDefault();
    Sound.playClick();

    let bmr = 10 * calcWeight + 6.25 * calcHeight - 5 * calcAge;
    bmr += calcGender === 'male' ? 5 : -161;

    let tdee = bmr * calcActivity;
    if (calcGoal === 'loss') tdee *= 0.85;
    else if (calcGoal === 'gain') tdee *= 1.15;

    const calories = Math.round(tdee);
    const protein = Math.round(calcWeight * 2.0);
    const fat = Math.round(calcWeight * 0.9);
    const remainingCalories = calories - protein * 4 - fat * 9;
    const carbs = Math.max(50, Math.round(remainingCalories / 4));

    setCalculatedTargets({ calories, protein, fat, carbs });
  };

  const handleApplyTargets = () => {
    if (!calculatedTargets) return;
    Sound.playSuccess();
    onUpdateTargets(calculatedTargets);
    setActiveTab('diary');
    alert('🎯 Нормы КБЖУ сохранены и применены к вашему дневнику!');
  };

  if (!isOpen) return null;

  return (
    <div className="top-drawer-overlay" onClick={onClose}>
      <div className="top-drawer-content" onClick={e => e.stopPropagation()}>
        <div className="drawer-handle-bar" onClick={onClose} title="Потяните или нажмите чтобы закрыть">
          <div className="drawer-handle" />
        </div>

        {/* Шапка шторки */}
        <div className="drawer-header">
          <div className="drawer-user-info">
            <span className="drawer-badge">⚡ SmartFit Центр</span>
            <h3>{user.firstName} {user.lastName}</h3>
            <p className="drawer-email">{user.email}</p>
          </div>
          <button
            className="drawer-close-btn"
            onClick={() => {
              Sound.playClick();
              onClose();
            }}
            title="Закрыть шторку"
          >
            ✕
          </button>
        </div>

        {/* Табы внутри шторки */}
        <div className="tab-bar" style={{ marginBottom: '20px' }}>
          <button
            className={`tab-btn ${activeTab === 'diary' ? 'active' : ''}`}
            onClick={() => {
              Sound.playClick();
              setActiveTab('diary');
            }}
          >
            🥑 Дневник питания
          </button>
          <button
            className={`tab-btn ${activeTab === 'calc' ? 'active' : ''}`}
            onClick={() => {
              Sound.playClick();
              setActiveTab('calc');
            }}
          >
            📊 Калькулятор нормы
          </button>
          <button
            className={`tab-btn ${activeTab === 'profile' ? 'active' : ''}`}
            onClick={() => {
              Sound.playClick();
              setActiveTab('profile');
            }}
          >
            👤 Профиль
          </button>
        </div>

        {/* Контент: Дневник питания */}
        {activeTab === 'diary' && (
          <div>
            <div className="diary-summary" style={{ padding: '20px 24px', marginBottom: '18px' }}>
              <div className="diary-summary-top">
                <div>
                  <div className="summary-cal-val">{totalCals}</div>
                  <div className="summary-cal-sub">
                    {diff >= 0
                      ? `из ${targetCals} ккал (осталось: ${diff} ккал)`
                      : `из ${targetCals} ккал (превышение: ${Math.abs(diff)} ккал)`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '4px 10px',
                      borderRadius: '100px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              <div className="progress-main-track" style={{ marginBottom: '16px' }}>
                <div className="progress-main-bar" style={{ width: `${pct}%` }} />
              </div>

              <div className="diary-macros-grid" style={{ paddingTop: '14px' }}>
                <div className="mini-macro-item">
                  <div className="mini-macro-header">
                    <span>Белки</span>
                    <span>{Math.round(totalProt)} / {targets.protein} г</span>
                  </div>
                  <div className="mini-macro-track">
                    <div
                      className="mini-macro-bar bar-protein"
                      style={{ width: `${Math.min(Math.round((totalProt / targets.protein) * 100), 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mini-macro-item">
                  <div className="mini-macro-header">
                    <span>Жиры</span>
                    <span>{Math.round(totalFat)} / {targets.fat} г</span>
                  </div>
                  <div className="mini-macro-track">
                    <div
                      className="mini-macro-bar bar-fat"
                      style={{ width: `${Math.min(Math.round((totalFat / targets.fat) * 100), 100)}%` }}
                    />
                  </div>
                </div>

                <div className="mini-macro-item">
                  <div className="mini-macro-header">
                    <span>Углеводы</span>
                    <span>{Math.round(totalCarbs)} / {targets.carbs} г</span>
                  </div>
                  <div className="mini-macro-track">
                    <div
                      className="mini-macro-bar bar-carbs"
                      style={{ width: `${Math.min(Math.round((totalCarbs / targets.carbs) * 100), 100)}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            <div className="calc-panel" style={{ padding: '20px' }}>
              <div className="chips-label">Быстрое добавление типовых продуктов:</div>
              <div className="chips-row">
                {QUICK_FOODS.map(f => (
                  <span key={f.name} className="food-chip" onClick={() => handleQuickFood(f)}>
                    {f.label}
                  </span>
                ))}
              </div>

              <form onSubmit={handleAddSubmit}>
                <div className="field">
                  <label htmlFor="drawerFoodName">Название блюда</label>
                  <input
                    type="text"
                    id="drawerFoodName"
                    placeholder="Например: Гречка с курицей"
                    value={foodName}
                    onChange={e => setFoodName(e.target.value)}
                    required
                  />
                </div>

                <div className="row-3">
                  <div className="field">
                    <label htmlFor="drawerCalories">Калории (ккал)</label>
                    <input
                      type="number"
                      id="drawerCalories"
                      placeholder="0"
                      min="0"
                      value={foodCalories}
                      onChange={e => setFoodCalories(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="drawerProtein">Белки (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      id="drawerProtein"
                      placeholder="0"
                      value={foodProtein}
                      onChange={e => setFoodProtein(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="drawerFat">Жиры (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      id="drawerFat"
                      placeholder="0"
                      value={foodFat}
                      onChange={e => setFoodFat(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="drawerCarbs">Углеводы (г)</label>
                  <input
                    type="number"
                    step="0.1"
                    id="drawerCarbs"
                    placeholder="0"
                    value={foodCarbs}
                    onChange={e => setFoodCarbs(e.target.value)}
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: '10px' }}>
                  <button type="submit" className="btn btn-sm">
                    Добавить в дневник +
                  </button>
                  <button
                    type="button"
                    className="btn-outline btn-sm"
                    onClick={() => {
                      Sound.playClick();
                      onClearDiary();
                    }}
                    style={{ color: '#dc2626', borderColor: '#fecaca' }}
                  >
                    Очистить день
                  </button>
                </div>
              </form>

              <div className="meals-list" style={{ marginTop: '18px' }}>
                {entries.length === 0 ? (
                  <div className="empty-state">Дневник пуст. Добавьте съеденное блюдо выше.</div>
                ) : (
                  entries.map(meal => (
                    <div key={meal.id} className="meal-item">
                      <div className="meal-left">
                        <div className="meal-name">{meal.name}</div>
                        <div className="meal-meta">
                          <span>Б: {meal.protein}г</span>
                          <span>Ж: {meal.fat}г</span>
                          <span>У: {meal.carbs}г</span>
                        </div>
                      </div>
                      <div className="meal-right">
                        <div className="meal-cals">{meal.calories} ккал</div>
                        <button
                          className="meal-del"
                          onClick={() => {
                            Sound.playClick();
                            onDeleteFood(meal.id);
                          }}
                          title="Удалить"
                        >
                          ✕
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}

        {/* Контент: Калькулятор нормы */}
        {activeTab === 'calc' && (
          <div className="calc-panel" style={{ padding: '20px' }}>
            <h3>Персональный калькулятор КБЖУ</h3>
            <p className="subtitle">Формула Миффлина-Сан Жеора для ваших параметров</p>

            <form onSubmit={handleCalculate}>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="drawerGender">Пол</label>
                  <select
                    id="drawerGender"
                    value={calcGender}
                    onChange={e => setCalcGender(e.target.value as 'male' | 'female')}
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="drawerAge">Возраст (лет)</label>
                  <input
                    type="number"
                    id="drawerAge"
                    value={calcAge}
                    onChange={e => setCalcAge(parseFloat(e.target.value) || 20)}
                    required
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label htmlFor="drawerWeight">Вес (кг)</label>
                  <input
                    type="number"
                    step="0.5"
                    id="drawerWeight"
                    value={calcWeight}
                    onChange={e => setCalcWeight(parseFloat(e.target.value) || 70)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="drawerHeight">Рост (см)</label>
                  <input
                    type="number"
                    id="drawerHeight"
                    value={calcHeight}
                    onChange={e => setCalcHeight(parseFloat(e.target.value) || 175)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="drawerActivity">Уровень активности</label>
                <select
                  id="drawerActivity"
                  value={calcActivity}
                  onChange={e => setCalcActivity(parseFloat(e.target.value))}
                >
                  <option value={1.2}>Сидячий образ жизни (минимум нагрузок)</option>
                  <option value={1.375}>Легкая активность (тренировки 1-3 раза в неделю)</option>
                  <option value={1.55}>Средняя активность (тренировки 3-5 раз в неделю)</option>
                  <option value={1.725}>Высокая активность (тренировки 6-7 раз в неделю)</option>
                </select>
              </div>

              <div className="field">
                <label htmlFor="drawerGoal">Ваша цель</label>
                <select
                  id="drawerGoal"
                  value={calcGoal}
                  onChange={e => setCalcGoal(e.target.value as 'maintain' | 'loss' | 'gain')}
                >
                  <option value="maintain">Поддержание веса и формы</option>
                  <option value="loss">Снижение веса / Сжигание жира (-15%)</option>
                  <option value="gain">Набор сухой мышечной массы (+15%)</option>
                </select>
              </div>

              <button type="submit" className="btn" style={{ width: '100%', marginTop: '6px' }}>
                Рассчитать норму КБЖУ
              </button>
            </form>

            {calculatedTargets && (
              <div style={{ marginTop: '20px', paddingTop: '16px', borderTop: '1px solid #eee' }}>
                <div className="macro-targets">
                  <div className="macro-target-card highlight">
                    <div className="macro-target-value">{calculatedTargets.calories} ккал</div>
                    <div className="macro-target-label">Калории</div>
                  </div>
                  <div className="macro-target-card">
                    <div className="macro-target-value" style={{ color: '#2563eb' }}>
                      {calculatedTargets.protein} г
                    </div>
                    <div className="macro-target-label">Белки</div>
                  </div>
                  <div className="macro-target-card">
                    <div className="macro-target-value" style={{ color: '#d97706' }}>
                      {calculatedTargets.fat} г
                    </div>
                    <div className="macro-target-label">Жиры</div>
                  </div>
                  <div className="macro-target-card">
                    <div className="macro-target-value" style={{ color: '#059669' }}>
                      {calculatedTargets.carbs} г
                    </div>
                    <div className="macro-target-label">Углеводы</div>
                  </div>
                </div>

                <button
                  className="btn btn-outline"
                  style={{ width: '100%', marginTop: '8px' }}
                  onClick={handleApplyTargets}
                >
                  Применить эти цели к моему Дневнику питания
                </button>
              </div>
            )}
          </div>
        )}

        {/* Контент: Профиль */}
        {activeTab === 'profile' && (
          <div className="calc-panel" style={{ padding: '24px' }}>
            <h3 style={{ marginBottom: '14px' }}>Управление профилем</h3>
            <div style={{ background: '#fafafa', padding: '16px', borderRadius: '12px', border: '1px solid #eee', marginBottom: '20px' }}>
              <div style={{ marginBottom: '8px' }}>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Имя и фамилия</span>
                <div style={{ fontSize: '16px', fontWeight: 700 }}>{user.firstName} {user.lastName}</div>
              </div>
              <div>
                <span style={{ fontSize: '12px', color: '#888', textTransform: 'uppercase', fontWeight: 700 }}>Email</span>
                <div style={{ fontSize: '14px', color: '#555' }}>{user.email}</div>
              </div>
            </div>

            <button
              className="btn btn-outline"
              style={{ width: '100%', color: '#ef4444', borderColor: '#fca5a5' }}
              onClick={() => {
                Sound.playClick();
                onLogout();
                onClose();
              }}
            >
              Выйти из аккаунта
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
