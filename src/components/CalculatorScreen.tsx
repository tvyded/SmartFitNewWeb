import React, { useState } from 'react';
import { DailyTargets, DiaryEntry } from '../types';
import { QUICK_FOODS } from '../utils/storage';
import { Sound } from '../utils/sound';

interface Props {
  onBack: () => void;
  entries: DiaryEntry[];
  targets: DailyTargets;
  onAddFood: (entry: Omit<DiaryEntry, 'id'>) => void;
  onDeleteFood: (id: number) => void;
  onClearDiary: () => void;
  onUpdateTargets: (newTargets: DailyTargets) => void;
}

export const CalculatorScreen: React.FC<Props> = ({
  onBack,
  entries,
  targets,
  onAddFood,
  onDeleteFood,
  onClearDiary,
  onUpdateTargets
}) => {
  const [activeTab, setActiveTab] = useState<'diary' | 'calc'>('diary');

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

    // Формула Миффлина-Сан Жеора
    let bmr = 10 * calcWeight + 6.25 * calcHeight - 5 * calcAge;
    bmr += calcGender === 'male' ? 5 : -161;

    let tdee = bmr * calcActivity;

    if (calcGoal === 'loss') {
      tdee *= 0.85; // дефицит 15%
    } else if (calcGoal === 'gain') {
      tdee *= 1.15; // профицит 15%
    }

    const calories = Math.round(tdee);
    const protein = Math.round(calcWeight * 2.0);
    const fat = Math.round(calcWeight * 0.9);

    const caloriesFromProtein = protein * 4;
    const caloriesFromFat = fat * 9;
    const remainingCalories = calories - caloriesFromProtein - caloriesFromFat;
    const carbs = Math.max(50, Math.round(remainingCalories / 4));

    setCalculatedTargets({ calories, protein, fat, carbs });
  };

  const handleApplyTargets = () => {
    if (!calculatedTargets) return;
    Sound.playSuccess();
    onUpdateTargets(calculatedTargets);
    setActiveTab('diary');
    alert('🎯 Новые нормы КБЖУ сохранены и применены к вашему дневнику!');
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
              <h2>Калькулятор и Дневник питания</h2>
              <p style={{ fontSize: '13px', color: '#737373' }}>
                Управляйте своим рационом с точностью до грамма
              </p>
            </div>
          </div>
          <div
            style={{
              fontSize: '12px',
              fontWeight: 600,
              color: '#171717',
              background: '#f0f0f0',
              padding: '6px 12px',
              borderRadius: '100px'
            }}
          >
            SmartFit Nutrition
          </div>
        </div>

        {/* Переключатель вкладок */}
        <div className="tab-bar">
          <button
            className={`tab-btn ${activeTab === 'diary' ? 'active' : ''}`}
            onClick={() => {
              Sound.playClick();
              setActiveTab('diary');
            }}
          >
            Дневник питания за день
          </button>
          <button
            className={`tab-btn ${activeTab === 'calc' ? 'active' : ''}`}
            onClick={() => {
              Sound.playClick();
              setActiveTab('calc');
            }}
          >
            Расчёт суточной нормы
          </button>
        </div>

        {/* ВКЛАДКА 1: ДНЕВНИК ПИТАНИЯ */}
        {activeTab === 'diary' && (
          <div>
            {/* Сводка */}
            <div className="diary-summary">
              <div className="diary-summary-top">
                <div>
                  <div className="summary-cal-val">{totalCals}</div>
                  <div className="summary-cal-sub">
                    {diff >= 0
                      ? `из ${targetCals} ккал цели (осталось: ${diff} ккал)`
                      : `из ${targetCals} ккал цели (превышение: ${Math.abs(diff)} ккал)`}
                  </div>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span
                    style={{
                      background: 'rgba(255,255,255,0.2)',
                      padding: '6px 12px',
                      borderRadius: '100px',
                      fontSize: '13px',
                      fontWeight: 700
                    }}
                  >
                    {pct}%
                  </span>
                </div>
              </div>

              {/* Прогресс калорий */}
              <div className="progress-main-track">
                <div className="progress-main-bar" style={{ width: `${pct}%` }} />
              </div>

              {/* Прогресс БЖУ */}
              <div className="diary-macros-grid">
                <div className="mini-macro-item">
                  <div className="mini-macro-header">
                    <span>Белки</span>
                    <span>
                      {Math.round(totalProt)} / {targets.protein} г
                    </span>
                  </div>
                  <div className="mini-macro-track">
                    <div
                      className="mini-macro-bar bar-protein"
                      style={{
                        width: `${Math.min(Math.round((totalProt / targets.protein) * 100), 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="mini-macro-item">
                  <div className="mini-macro-header">
                    <span>Жиры</span>
                    <span>
                      {Math.round(totalFat)} / {targets.fat} г
                    </span>
                  </div>
                  <div className="mini-macro-track">
                    <div
                      className="mini-macro-bar bar-fat"
                      style={{
                        width: `${Math.min(Math.round((totalFat / targets.fat) * 100), 100)}%`
                      }}
                    />
                  </div>
                </div>

                <div className="mini-macro-item">
                  <div className="mini-macro-header">
                    <span>Углеводы</span>
                    <span>
                      {Math.round(totalCarbs)} / {targets.carbs} г
                    </span>
                  </div>
                  <div className="mini-macro-track">
                    <div
                      className="mini-macro-bar bar-carbs"
                      style={{
                        width: `${Math.min(Math.round((totalCarbs / targets.carbs) * 100), 100)}%`
                      }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Быстрые продукты и форма добавления */}
            <div className="calc-panel">
              <div className="chips-label">Быстрое добавление типовых продуктов:</div>
              <div className="chips-row">
                {QUICK_FOODS.map(f => (
                  <span
                    key={f.name}
                    className="food-chip"
                    onClick={() => handleQuickFood(f)}
                  >
                    {f.label}
                  </span>
                ))}
              </div>

              {/* Форма добавления */}
              <form onSubmit={handleAddSubmit}>
                <div className="field">
                  <label htmlFor="foodName">Название продукта / блюда</label>
                  <input
                    type="text"
                    id="foodName"
                    placeholder="Например: Гречка с говядиной"
                    value={foodName}
                    onChange={e => setFoodName(e.target.value)}
                    required
                  />
                </div>

                <div className="row-3">
                  <div className="field">
                    <label htmlFor="foodCalories">Калории (ккал)</label>
                    <input
                      type="number"
                      id="foodCalories"
                      placeholder="0"
                      min="0"
                      value={foodCalories}
                      onChange={e => setFoodCalories(e.target.value)}
                      required
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="foodProtein">Белки (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      id="foodProtein"
                      placeholder="0"
                      min="0"
                      value={foodProtein}
                      onChange={e => setFoodProtein(e.target.value)}
                    />
                  </div>
                  <div className="field">
                    <label htmlFor="foodFat">Жиры (г)</label>
                    <input
                      type="number"
                      step="0.1"
                      id="foodFat"
                      placeholder="0"
                      min="0"
                      value={foodFat}
                      onChange={e => setFoodFat(e.target.value)}
                    />
                  </div>
                </div>

                <div className="field">
                  <label htmlFor="foodCarbs">Углеводы (г)</label>
                  <input
                    type="number"
                    step="0.1"
                    id="foodCarbs"
                    placeholder="0"
                    min="0"
                    value={foodCarbs}
                    onChange={e => setFoodCarbs(e.target.value)}
                  />
                </div>

                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    marginTop: '8px'
                  }}
                >
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

              {/* Список добавленных блюд */}
              <div className="meals-list" style={{ marginTop: '24px' }}>
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

        {/* ВКЛАДКА 2: РАСЧЁТ СУТОЧНОЙ НОРМЫ */}
        {activeTab === 'calc' && (
          <div className="calc-panel">
            <h3>Персональный калькулятор КБЖУ</h3>
            <p className="subtitle">
              Используем признанную формулу Миффлина-Сан Жеора с учетом активности и цели
            </p>

            <form onSubmit={handleCalculate}>
              <div className="row-2">
                <div className="field">
                  <label htmlFor="calcGender">Пол</label>
                  <select
                    id="calcGender"
                    value={calcGender}
                    onChange={e => setCalcGender(e.target.value as 'male' | 'female')}
                  >
                    <option value="male">Мужской</option>
                    <option value="female">Женский</option>
                  </select>
                </div>
                <div className="field">
                  <label htmlFor="calcAge">Возраст (лет)</label>
                  <input
                    type="number"
                    id="calcAge"
                    min="14"
                    max="100"
                    value={calcAge}
                    onChange={e => setCalcAge(parseFloat(e.target.value) || 20)}
                    required
                  />
                </div>
              </div>

              <div className="row-2">
                <div className="field">
                  <label htmlFor="calcWeight">Вес (кг)</label>
                  <input
                    type="number"
                    step="0.5"
                    id="calcWeight"
                    min="30"
                    max="250"
                    value={calcWeight}
                    onChange={e => setCalcWeight(parseFloat(e.target.value) || 70)}
                    required
                  />
                </div>
                <div className="field">
                  <label htmlFor="calcHeight">Рост (см)</label>
                  <input
                    type="number"
                    id="calcHeight"
                    min="120"
                    max="230"
                    value={calcHeight}
                    onChange={e => setCalcHeight(parseFloat(e.target.value) || 175)}
                    required
                  />
                </div>
              </div>

              <div className="field">
                <label htmlFor="calcActivity">Уровень физической активности</label>
                <select
                  id="calcActivity"
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
                <label htmlFor="calcGoal">Ваша цель</label>
                <select
                  id="calcGoal"
                  value={calcGoal}
                  onChange={e => setCalcGoal(e.target.value as 'maintain' | 'loss' | 'gain')}
                >
                  <option value="maintain">Поддержание веса и формы</option>
                  <option value="loss">Снижение веса / Сжигание жира (-15%)</option>
                  <option value="gain">Набор сухой мышечной массы (+15%)</option>
                </select>
              </div>

              <button type="submit" className="btn" style={{ width: '100%', marginTop: '10px' }}>
                Рассчитать норму КБЖУ
              </button>
            </form>

            {/* Результаты расчета */}
            {calculatedTargets && (
              <div
                style={{
                  marginTop: '28px',
                  paddingTop: '20px',
                  borderTop: '1.5px solid #eee'
                }}
              >
                <h4 style={{ fontSize: '16px', fontWeight: 800, marginBottom: '12px' }}>
                  Ваша рекомендуемая суточная норма:
                </h4>

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
                  style={{ width: '100%' }}
                  onClick={handleApplyTargets}
                >
                  Применить эти цели к моему Дневнику питания
                </button>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
