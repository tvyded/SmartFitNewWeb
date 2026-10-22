import React from 'react';
import { Sound } from '../utils/sound';

interface Props {
  onStart: () => void;
  onLogin: () => void;
}

export const LandingScreen: React.FC<Props> = ({ onStart, onLogin }) => {
  return (
    <div className="screen landing">
      <div className="center">
        <div className="tag">
          <span className="pulse-dot" />
          SmartFit Ecosystem · AI & Vision
        </div>

        <h1 className="logo">SmartFit</h1>
        <p className="tagline">Компьютерное зрение · Интеллектуальный расчёт КБЖУ · Тренировки</p>

        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '14px' }}>
          <button
            className="btn"
            onClick={() => {
              Sound.playClick();
              onStart();
            }}
          >
            Начать <span className="arrow">→</span>
          </button>

          <button
            className="btn-outline btn-sm"
            style={{ borderRadius: '100px', padding: '6px 18px', border: '1px solid #e5e5e5', background: 'rgba(255,255,255,0.7)' }}
            onClick={() => {
              Sound.playClick();
              onLogin();
            }}
          >
            Уже есть аккаунт? Войти
          </button>
        </div>
      </div>
    </div>
  );
};
