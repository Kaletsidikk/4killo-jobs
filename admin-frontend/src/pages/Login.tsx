import { useState } from "react";
import type { FormEvent } from "react";
import { adminLogin, saveAdminToken } from "../services/adminAuth";

interface LoginProps {
  onLogin: () => void;
}

const Login = ({ onLogin }: LoginProps) => {
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();

    if (!password) {
      setError("Please enter your password");
      return;
    }

    try {
      setLoading(true);
      setError("");

      const data = await adminLogin(password);

      saveAdminToken(data.token);

      onLogin();
    } catch (error) {
      setError(
        error instanceof Error ? error.message : "Login failed"
      );
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-page">
      <div className="login-card">
        <h1>4Killo Admin</h1>

        <p className="login-subtitle">
          Sign in to manage the job aggregator
        </p>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label htmlFor="password">Admin Password</label>

            <input
              id="password"
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              placeholder="Enter admin password"
            />
          </div>

          {error && <p className="error-message">{error}</p>}

          <button type="submit" disabled={loading}>
            {loading ? "Signing in..." : "Sign In"}
          </button>
        </form>
      </div>
    </div>
  );
};

export default Login;