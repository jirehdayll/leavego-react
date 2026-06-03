import React, { useState } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { Mail, Lock, Eye, EyeOff, AlertCircle, CheckCircle2, X, AlertTriangle, FileText } from 'lucide-react';

// [Previous Terms and Conditions Modal and DeactivatedModal components remain the same]

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState(null);
  const [loading, setLoading] = useState(false);
  const [showDeactivatedModal, setShowDeactivatedModal] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const navigate = useNavigate();
  const location = useLocation();
  const { login } = useAuth();

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError(null);

    try {
      const result = await login(email, password);
      
      if (result.success) {
        // Check for redirectTo query parameter (from deep-link protection)
        const params = new URLSearchParams(location.search);
        const redirectTo = params.get('redirectTo');
        
        // Use redirectTo if available, otherwise use location.state.from
        const from = redirectTo || location.state?.from;
        
        if (from) {
          navigate(from, { replace: true });
        } else if (result.user.role === 'admin' || result.user.role === 'cenro') {
          navigate('/admin/dashboard', { replace: true });
        } else {
          navigate('/dashboard', { replace: true });
        }
      } else {
        setError(result.error);
      }
    } catch (err) {
      setError('An error occurred during sign in.');
    } finally {
      setLoading(false);
    }
  };

  // [Rest of the component remains the same - modal components and JSX return]
  return (
    <div className="min-h-screen flex fade-in-up">
      {/* Full Login component JSX */}
    </div>
  );
}