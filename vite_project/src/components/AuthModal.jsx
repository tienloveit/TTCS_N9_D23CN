import { useState } from 'react'
import LoginForm from './LoginForm'
import SignupForm from './SignupForm'
import './AuthModal.css'

const AuthModal = ({ onClose, onAuthSuccess }) => {
  const [mode, setMode] = useState('login') // 'login' or 'signup'

  return (
    <div className="auth-modal-overlay" onClick={onClose}>
      <div className="auth-modal" onClick={(e) => e.stopPropagation()}>
        <button className="close-btn" onClick={onClose}>
          ✕
        </button>

        <div className="auth-tabs">
          <button
            className={`tab-btn ${mode === 'login' ? 'active' : ''}`}
            onClick={() => setMode('login')}
          >
            Đăng Nhập
          </button>
          <button
            className={`tab-btn ${mode === 'signup' ? 'active' : ''}`}
            onClick={() => setMode('signup')}
          >
            Đăng Ký
          </button>
        </div>

        <div className="auth-content">
          {mode === 'login' ? (
            <LoginForm 
              onClose={onClose} 
              onLoginSuccess={onAuthSuccess}
            />
          ) : (
            <SignupForm 
              onClose={onClose} 
              onSignupSuccess={onAuthSuccess}
            />
          )}
        </div>
      </div>
    </div>
  )
}

export default AuthModal
