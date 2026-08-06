import React, { useState } from 'react';
import { useSearchParams, useNavigate } from 'react-router-dom';
import '../styles/login.css';

// Import background image and icon
import loginBg from '/login bg.png';
import resetIcon from '/BioNova.png';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const navigate = useNavigate();

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setSuccessMsg('');

    if (!token) {
      setError("Invalid or missing reset token.");
      return;
    }
    if (!password) {
      setError("Please enter a new password");
      return;
    }
    if (!confirmPassword) {
      setError("Please fill confirm password also");
      return;
    }
    if (password.length < 8) {
      setError("Password must be at least 8 characters long");
      return;
    }
    if (password !== confirmPassword) {
      setError("Passwords do not match");
      return;
    }

    setLoading(true);

    try {
      const apiBaseUrl = import.meta.env.VITE_API_BASE_URL;
      const response = await fetch(`${apiBaseUrl}/api/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Accept': 'application/json'
        },
        body: JSON.stringify({
          token,
          newPassword: password
        })
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || "Reset password request failed.");
      }

      setSuccessMsg("Password reset successful! Redirecting to login...");
      setPassword('');
      setConfirmPassword('');
      setTimeout(() => {
        navigate('/', { replace: true });
      }, 3000);
    } catch (err) {
      console.error("Reset password failed:", err);
      setError(err.message || "Could not connect to server. Please try again.");
    } finally {
      setLoading(false);
    }
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

            <div className="reset-header">
              <div className="reset-icon-wrapper">
                <img src={resetIcon} alt="Reset Icon" className="header-icon" />
              </div>
              <h2 className="reset-title">Create New Password</h2>
              <p className="reset-subtitle">Please choose a strong password</p>
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

            <form onSubmit={handleSubmit}>
              <div className="input-group">
                <label>New Password</label>
                <div className="input-wrapper password-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => { setPassword(e.target.value); setError(''); }}
                    placeholder="Enter new password"
                    className="password-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowPassword(!showPassword)}
                  >
                    <i className={showPassword ? 'far fa-eye-slash' : 'far fa-eye'}></i>
                  </button>
                </div>
              </div>

              <div className="input-group">
                <label>Confirm Password</label>
                <div className="input-wrapper password-wrapper">
                  <i className="fas fa-lock input-icon"></i>
                  <input
                    type={showConfirmPassword ? 'text' : 'password'}
                    value={confirmPassword}
                    onChange={(e) => { setConfirmPassword(e.target.value); setError(''); }}
                    placeholder="Confirm new password"
                    className="password-input"
                  />
                  <button
                    type="button"
                    className="password-toggle-btn"
                    onClick={() => setShowConfirmPassword(!showConfirmPassword)}
                  >
                    <i className={showConfirmPassword ? 'far fa-eye-slash' : 'far fa-eye'}></i>
                  </button>
                </div>
              </div>

              <button type="submit" className="login-btn" disabled={loading}>
                {loading ? <><i className="fas fa-spinner fa-spin" style={{ marginRight: '8px' }}></i> Resetting...</> : "Update Password"}
              </button>

              <div className="back-link" onClick={() => navigate('/', { replace: true })}>
                <i className="fas fa-arrow-left" style={{ marginRight: '5px' }}></i> Back to Login
              </div>
            </form>

          </div>
        </div>
      </div>
    </div>
  );
};

export default ResetPassword;
