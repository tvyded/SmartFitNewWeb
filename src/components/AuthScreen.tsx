import React, { useState } from 'react';
import { User } from '../types';
import { Sound } from '../utils/sound';

interface Props {
  mode: 'login' | 'register';
  onSuccess: (user: User) => void;
  onSwitchMode: (mode: 'login' | 'register') => void;
  onBack: () => void;
}

export const AuthScreen: React.FC<Props> = ({ mode, onSuccess, onSwitchMode, onBack }) => {
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);

    if (mode === 'register') {
      if (!firstName.trim() || !lastName.trim()) {
        setError('Пожалуйста, заполните имя и фамилию');
        Sound.playError();
        return;
      }
      if (password.length < 6) {
        setError('Пароль должен содержать минимум 6 символов');
        Sound.playError();
        return;
      }

      Sound.playClick();
      const newUser: User = {
        firstName: firstName.trim(),
        lastName: lastName.trim(),
        email: email.trim().toLowerCase()
      };
      onSuccess(newUser);
    } else {
      if (!email.trim() || !password) {
        setError('Введите email и пароль');
        Sound.playError();
        return;
      }

      Sound.playClick();
      // Look up previous name if available or derive from email
      const stored = localStorage.getItem('smartfit_user');
      let user: User;
      if (stored) {
        try {
          const parsed = JSON.parse(stored);
          user = {
            firstName: parsed.firstName || 'Атлет',
            lastName: parsed.lastName || '',
            email: email.trim().toLowerCase()
          };
        } catch {
          user = { firstName: 'Атлет', lastName: '', email: email.trim().toLowerCase() };
        }
      } else {
        const namePart = email.split('@')[0] || 'Атлет';
        user = { firstName: namePart.charAt(0).toUpperCase() + namePart.slice(1), lastName: '', email: email.trim().toLowerCase() };
      }

      onSuccess(user);
    }
  };

  return (
    <div className={`screen ${mode === 'register' ? 'registration' : 'login'}`}>
      <div className="form-wrapper">
        <div className="form-logo">
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
          SmartFit
        </div>

        <div className="form-header">
          <h2>{mode === 'register' ? 'Создать аккаунт' : 'Войти в аккаунт'}</h2>
          <p>
            {mode === 'register'
              ? 'Начните свой путь к идеальной форме уже сегодня'
              : 'Рады видеть вас снова'}
          </p>
        </div>

        {error && <div className="error-msg show">{error}</div>}

        <form onSubmit={handleSubmit}>
          {mode === 'register' && (
            <div className="row-2">
              <div className="field">
                <label htmlFor="firstName">Имя</label>
                <input
                  type="text"
                  id="firstName"
                  placeholder="Иван"
                  value={firstName}
                  onChange={e => setFirstName(e.target.value)}
                  required
                />
              </div>
              <div className="field">
                <label htmlFor="lastName">Фамилия</label>
                <input
                  type="text"
                  id="lastName"
                  placeholder="Иванов"
                  value={lastName}
                  onChange={e => setLastName(e.target.value)}
                  required
                />
              </div>
            </div>
          )}

          <div className="field">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              placeholder="ivan@example.com"
              value={email}
              onChange={e => setEmail(e.target.value)}
              required
            />
          </div>

          <div className="field">
            <label htmlFor="password">Пароль</label>
            <input
              type="password"
              id="password"
              placeholder={mode === 'register' ? 'Минимум 6 символов' : 'Ваш пароль'}
              value={password}
              onChange={e => setPassword(e.target.value)}
              required
            />
          </div>

          <button type="submit" className="btn" style={{ width: '100%', marginTop: '8px' }}>
            {mode === 'register' ? 'Зарегистрироваться' : 'Войти'} <span className="arrow">→</span>
          </button>
        </form>

        <p className="form-footer">
          {mode === 'register' ? (
            <>
              Уже есть аккаунт?{' '}
              <a
                onClick={() => {
                  Sound.playClick();
                  setError(null);
                  onSwitchMode('login');
                }}
              >
                Войти
              </a>
            </>
          ) : (
            <>
              Нет аккаунта?{' '}
              <a
                onClick={() => {
                  Sound.playClick();
                  setError(null);
                  onSwitchMode('register');
                }}
              >
                Зарегистрироваться
              </a>
            </>
          )}
        </p>
      </div>
    </div>
  );
};
