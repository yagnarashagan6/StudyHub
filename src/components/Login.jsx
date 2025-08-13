import React, { useState } from "react";
import "../styles/Login.css";

// Use Render backend in production, localhost in dev, or env override
const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ||
  (window.location.hostname === "localhost"
    ? "http://localhost:5000"
    : "https://studyhub-d1bo.onrender.com"); // <-- Replace with your Render backend

// Separate Login Component for better understanding
function Login({ onLoginSuccess }) {
  const [isLogin, setIsLogin] = useState(true);
  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const [showPassword, setShowPassword] = useState(false); // <-- Added state

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setSuccess("");

    // Determine the endpoint based on whether it's login or register
    const url = isLogin ? `${API_BASE_URL}/login` : `${API_BASE_URL}/register`;

    // Prepare the payload - login only needs email and password
    const payload = isLogin
      ? { email, password }
      : { username, email, password };

    try {
      const res = await fetch(url, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });

      const data = await res.json();

      if (res.ok) {
        if (isLogin) {
          // Store the token in localStorage for persistent login
          localStorage.setItem("token", data.token);
          // Call the parent component's success handler
          onLoginSuccess();
        } else {
          // Registration successful - show success message and switch to login
          setSuccess(data.msg);
          setIsLogin(true); // Switch to login after successful registration
          // Clear form fields
          setUsername("");
          setEmail("");
          setPassword("");
        }
      } else {
        // Handle error responses from the server
        setError(data.msg || "An error occurred");
      }
    } catch (err) {
      // Handle network errors
      setError("A network error occurred. Is the backend server running?");
      console.error("Login/Register error:", err);
    }
  };

  const handleGoogleLogin = () => {
    // Use Render backend for Google OAuth in production, localhost in dev
    const googleAuthUrl =
      window.location.hostname === "localhost"
        ? "http://localhost:5000/auth/google"
        : "https://studyhub-d1bo.onrender.com/auth/google"; // <-- Replace with your Render backend
    window.location.href = googleAuthUrl;
  };

  const toggleAuthMode = () => {
    // Switch between login and register modes
    setIsLogin(!isLogin);
    // Clear any existing messages
    setError("");
    setSuccess("");
    // Clear form fields when switching modes
    setUsername("");
    setEmail("");
    setPassword("");
  };

  return (
    <div className="auth-container">
      <div className="auth-card">
        <h2>{isLogin ? "Welcome to StudyHub" : "Join StudyHub"}</h2>

        {/* Google OAuth Button */}
        <button
          type="button"
          className="google-auth-btn"
          onClick={handleGoogleLogin}
        >
          <svg className="google-icon" viewBox="0 0 24 24">
            <path
              fill="#4285F4"
              d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
            />
            <path
              fill="#34A853"
              d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
            />
            <path
              fill="#FBBC05"
              d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
            />
            <path
              fill="#EA4335"
              d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
            />
          </svg>
          Continue with Google
        </button>

        <div className="auth-divider">
          <span>or</span>
        </div>

        {/* Login/Register Form */}
        <form onSubmit={handleSubmit}>
          {/* Username field - only shown during registration */}
          {!isLogin && (
            <div className="form-group">
              <label htmlFor="username">Username</label>
              <input
                type="text"
                id="username"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                required
                placeholder="Enter your username"
              />
            </div>
          )}

          {/* Email field - required for both login and registration */}
          <div className="form-group">
            <label htmlFor="email">Email</label>
            <input
              type="email"
              id="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
              placeholder="Enter your email"
            />
          </div>

          {/* Password field - required for both login and registration */}
          <div className="form-group" style={{ position: "relative" }}>
            <label htmlFor="password">Password</label>
            <input
              type={showPassword ? "text" : "password"}
              id="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
              placeholder="Enter your password"
              autoComplete="current-password"
            />
            <span
              onClick={() => setShowPassword((prev) => !prev)}
              style={{
                position: "absolute",
                right: 16,
                top: 38,
                cursor: "pointer",
                userSelect: "none",
                color: "#888",
                fontSize: "18px",
              }}
              aria-label={showPassword ? "Hide password" : "Show password"}
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === "Enter" || e.key === " ")
                  setShowPassword((prev) => !prev);
              }}
            >
              {showPassword ? (
                // Eye-off SVG
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M17.94 17.94C16.13 19.25 14.13 20 12 20C7 20 2.73 16.11 1 12C1.73 10.21 2.89 8.63 4.36 7.36M9.53 9.53C9.19 9.88 9 10.41 9 11C9 12.1 9.9 13 11 13C11.59 13 12.12 12.81 12.47 12.47M14.47 14.47C14.12 14.81 13.59 15 13 15C11.9 15 11 14.1 11 13C11 12.41 11.19 11.88 11.53 11.53M12 4C16.97 4 21.24 7.89 23 12C22.27 13.79 21.11 15.37 19.64 16.64M1 1L23 23"
                    stroke="#888"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              ) : (
                // Eye SVG
                <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
                  <path
                    d="M1 12C2.73 16.11 7 20 12 20C17 20 21.27 16.11 23 12C21.27 7.89 17 4 12 4C7 4 2.73 7.89 1 12Z"
                    stroke="#888"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                  <circle
                    cx="12"
                    cy="12"
                    r="3"
                    stroke="#888"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              )}
            </span>
          </div>

          {/* Error message display */}
          {error && <div className="error-message">{error}</div>}

          {/* Success message display */}
          {success && <div className="success-message">{success}</div>}

          {/* Submit button */}
          <button type="submit" className="auth-btn">
            {isLogin ? "Sign In" : "Create Account"}
          </button>
        </form>

        {/* Toggle between login and register */}
        <p className="auth-switch">
          {isLogin ? (
            <>
              Don't have an account?{" "}
              <span onClick={toggleAuthMode} className="auth-link">
                Sign up
              </span>
            </>
          ) : (
            <>
              Already have an account?{" "}
              <span onClick={toggleAuthMode} className="auth-link">
                Sign in
              </span>
            </>
          )}
        </p>
      </div>
    </div>
  );
}

export default Login;
