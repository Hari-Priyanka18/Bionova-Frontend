import React, { useState, useEffect } from 'react';
import '../styles/login.css';

// Import background image
import loginBg from '/login bg.png';
// Import your custom icons (replace with your actual icon paths)
import loginIcon from '/BioNova.png'; // Your login icon
import resetIcon from '/BioNova.png'; // Your reset icon

// Helper functions for cookies
const setCookie = (name, value, days) => {
  let expires = "";
  if (days) {
    const date = new Date();
    date.setTime(date.getTime() + (days * 24 * 60 * 60 * 1000));
    expires = "; expires=" + date.toUTCString();
  }
  document.cookie = name + "=" + (value || "")  + expires + "; path=/";
}

const getCookie = (name) => {
  const nameEQ = name + "=";
  const ca = document.cookie.split(';');
  for(let i=0; i < ca.length; i++) {
    let c = ca[i];
    while (c.charAt(0) === ' ') c = c.substring(1, c.length);
    if (c.indexOf(nameEQ) === 0) return c.substring(nameEQ.length, c.length);
  }
  return null;
}

const eraseCookie = (name) => {   
  document.cookie = name + '=; Path=/; Expires=Thu, 01 Jan 1970 00:00:01 GMT;';
}

const Login = ({ onLogin }) => {
  const [currentView, setCurrentView] = useState('login');
  
  const [formData, setFormData] = useState({
    email: getCookie('rememberedEmail') || '',
    password: getCookie('rememberedPassword') || ''
  });
  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(
    !!(getCookie('rememberedEmail') && getCookie('rememberedPassword'))
  );
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const [resetEmail, setResetEmail] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    setError('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setError('');

    if (!formData.email.trim()) {
      setError("Please enter your email address");
      return;
    }
    
    // Add regex validation for email
    const emailRegex = /^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$/;
    if (!emailRegex.test(formData.email.trim())) {
      setError("Invalid Email");
      return;
    }

    if (!formData.password) {
      setError("Please enter your password");
      return;
    }

    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: formData.email.trim(),
          password: formData.password
        })
      });

      if (!response.ok) {
        throw new Error("Server responded with an error status: " + response.status);
      }

      const data = await response.json();
      if (data.success) {
        sessionStorage.setItem("isLoggedIn", "true");
        sessionStorage.setItem("userEmail", formData.email.trim());
        sessionStorage.setItem("userRole", data.role || "full_access");
        if (data.token) {
          sessionStorage.setItem("authToken", data.token);
        }
        if (data.empId) {
          sessionStorage.setItem("empId", String(data.empId));
        }
        
        const email = formData.email.trim();
        const namePart = email.split("@")[0];
        const formattedName = namePart
          .split(/[._]/)
          .map(word => word.charAt(0).toUpperCase() + word.slice(1))
          .join(" ");
        sessionStorage.setItem("userName", formattedName);
        localStorage.setItem("userName", formattedName);
        
        if (rememberMe) {
          setCookie('rememberedEmail', formData.email.trim(), 30);
          setCookie('rememberedPassword', formData.password, 30);
        } else {
          eraseCookie('rememberedEmail');
          eraseCookie('rememberedPassword');
        }

        onLogin(true, data.role || "full_access");
      } else {
        if (data.message && data.message.toLowerCase().includes("user not found")) {
          setError("Invalid Email");
        } else {
          setError(data.message || "Invalid Email or Password");
        }
      }
    } catch (err) {
      console.error("Login failed:", err);
      setError("Could not connect to server. Please ensure the backend is running.");
    } finally {
      setLoading(false);
    }
  };

  const handleForgotSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!resetEmail.trim()) {
      setError("Please enter your registered email address");
      return;
    }

    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          email: resetEmail.trim()
        })
      });

      if (!response.ok) {
        throw new Error("Server responded with an error status: " + response.status);
      }

      const data = await response.json();
      setSuccessMsg(data.message || "Password reset link has been sent to your email.");
      setResetEmail('');
    } catch (err) {
      console.error("Forgot password failed:", err);
      setError("Could not connect to server. Please try again later.");
    } finally {
      setLoading(false);
    }
  };

  const switchView = (view) => {
    setCurrentView(view);
    setError('');
    setSuccessMsg('');
    if (view === 'login') {
      setFormData({
        email: getCookie('rememberedEmail') || '',
        password: getCookie('rememberedPassword') || ''
      });
    } else {
      setFormData({ email: '', password: '' });
    }
    setResetEmail('');
  };

  // Background image style
  const backgroundStyle = {
    backgroundImage: `url(${loginBg})`,
    backgroundSize: 'cover',
    backgroundPosition: 'center',
    backgroundRepeat: 'no-repeat'
  };

  return (
    <div className="login-container" style={backgroundStyle}>
      <div className="login-overlay">
        <div className="login-card-wrapper">
          <div className="login-card">
            
            {currentView === 'login' ? (
              // Login View - Shows Welcome Header
              <>
                <div className="login-header">
                  <div className="logo-icon">
                    <img src={loginIcon} alt="Login Icon" className="header-icon" />
                  </div>
                  <h1 className="login-title">Welcome to BIONOVA</h1>
                  <p className="login-subtitle">Sign in to continue to your account</p>
                </div>

                {error && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i> <span>{error}</span>
                  </div>
                )}
                
                {successMsg && (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i> <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleLoginSubmit}>
                  <div className="input-group">
                    <label>Email</label>
                    <div className="input-wrapper">
                      <i className="far fa-envelope input-icon"></i>
                      <input
                        type="email" 
                        name="email" 
                        value={formData.email} 
                        onChange={handleChange}
                        placeholder="enter your email" 
                        autoComplete="email"
                      />
                    </div>
                  </div>

                  <div className="input-group">
                    <label>Password</label>
                    <div className="input-wrapper password-wrapper">
                      <i className="fas fa-lock input-icon"></i>
                      <input
                        type={showPassword ? 'text' : 'password'} 
                        name="password"
                        value={formData.password} 
                        onChange={handleChange} 
                        placeholder="enter your password"
                        className="password-input"
                        autoComplete="current-password"
                      />
                      <button 
                        type="button"
                        className="password-toggle-btn" 
                        onClick={() => setShowPassword(!showPassword)}
                        aria-label={showPassword ? 'Hide password' : 'Show password'}
                      >
                        <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'}></i>
                      </button>
                    </div>
                  </div>

                  <div className="login-options-wrapper" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
                    <label className="remember-me-label" style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', fontSize: '14px', color: '#64748b', fontWeight: '500' }}>
                      <input 
                        type="checkbox" 
                        checked={rememberMe} 
                        onChange={(e) => setRememberMe(e.target.checked)}
                        style={{ accentColor: '#2563eb', width: '16px', height: '16px', cursor: 'pointer' }}
                      />
                      Remember Me
                    </label>
                    <div className="forgot-link-wrapper" style={{ margin: 0, textAlign: 'right' }}>
                      <span className="forgot-link" onClick={() => switchView('forgot')}>
                        Forgot Password?
                      </span>
                    </div>
                  </div>

                  <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Logging in...
                      </>
                    ) : (
                      "Sign In"
                    )}
                  </button>
                </form>
              </>
            ) : (
              // Reset Password View - Only Reset Header
              <>
                <div className="reset-header">
                  <div className="reset-icon-wrapper">
                    <img src={resetIcon} alt="Reset Icon" className="header-icon" />
                  </div>
                  <h2 className="reset-title">Reset Password</h2>
                  <p className="reset-subtitle">Enter your email to receive instructions</p>
                </div>

                {error && (
                  <div className="error-message">
                    <i className="fas fa-exclamation-circle"></i> <span>{error}</span>
                  </div>
                )}
                
                {successMsg && (
                  <div className="success-message">
                    <i className="fas fa-check-circle"></i> <span>{successMsg}</span>
                  </div>
                )}

                <form onSubmit={handleForgotSubmit}>
                  <div className="input-group">
                    <label>Email Address</label>
                    <div className="input-wrapper">
                      <i className="far fa-envelope input-icon"></i>
                      <input
                        type="email" 
                        value={resetEmail}
                        onChange={(e) => { setResetEmail(e.target.value); setError(''); }}
                        placeholder="Enter your registered email" 
                        autoComplete="off"
                      />
                    </div>
                  </div>

                  <button type="submit" className="login-btn" disabled={loading}>
                    {loading ? (
                      <>
                        <span className="spinner"></span>
                        Sending...
                      </>
                    ) : (
                      "Send Reset Link"
                    )}
                  </button>

                  <div className="back-link" onClick={() => switchView('login')}>
                    <i className="fas fa-arrow-left" style={{marginRight: '8px'}}></i> 
                    Back to Login
                  </div>
                </form>
              </>
            )}

          </div>
        </div>
      </div>
    </div>
  );
};

export default Login;