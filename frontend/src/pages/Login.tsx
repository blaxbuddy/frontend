import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { AlertCircle, User, ArrowLeft, KeyRound, Mail } from 'lucide-react';
import { Logo } from '@/components/Logo';

const Login: React.FC = () => {
  const navigate = useNavigate();
  const { login, isLoading, error } = useAuth();

  const [step, setStep] = useState<'role-select' | 'form'>('role-select');
  const [selectedRole, setSelectedRole] = useState<UserRole | null>(null);
  const [formData, setFormData] = useState({
    email: '',
    password: '',
    name: '',
  });
  const [formError, setFormError] = useState<string | null>(null);

  const roles: { value: UserRole; label: string; description: string }[] = [
  {
    value: 'restaurant',
    label: 'Restaurant',
    description: 'Donate surplus food',
  },
  {
    value: 'volunteer',
    label: 'Volunteer',
    description: 'Transport food donations',
  },
  {
    value: 'ngo',
    label: 'NGO',
    description: 'Receive food donations',
  },
];

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    setFormData({ email: '', password: '', name: '' });
    setFormError(null);
    setStep('form');
  };

  const handleBackToRole = () => {
    setStep('role-select');
    setSelectedRole(null);
    setFormError(null);
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    // Validation
    if (!formData.email || !formData.password || !formData.name) {
      setFormError('All fields are required');
      return;
    }

    if (formData.email && !formData.email.includes('@')) {
      setFormError('Invalid email address');
      return;
    }

    if (formData.password.length < 6) {
      setFormError('Password must be at least 6 characters');
      return;
    }

    try {
      await login(formData.email, formData.password, selectedRole!, formData.name);
      // Redirect to the role-specific page
      navigate(`/${selectedRole}`);
    } catch (err) {
      setFormError(error || 'Login failed. Please try again.');
    }
  };

  return (
    <div className="min-h-screen relative font-sleek text-slate-700 flex flex-col items-center justify-center p-6 gap-10 overflow-hidden bg-[#e0e5ec]">
      {/* Decorative glowing blobs for the reflective greenish glass effect */}
      <div className="absolute top-[-10%] left-[-10%] w-96 h-96 bg-emerald-400/40 rounded-full blur-[100px]" />
      <div className="absolute bottom-[-10%] right-[-10%] w-96 h-96 bg-emerald-300/40 rounded-full blur-[100px]" />
      <div className="absolute top-[20%] right-[20%] w-64 h-64 bg-teal-300/30 rounded-full blur-[80px]" />

      <div className="relative z-10 animate-fade-in-up" style={{ animationDelay: '0.1s', animationFillMode: 'both' }}>
        <Logo />
      </div>
      {step === 'role-select' ? (
        <div className="relative z-10 w-full max-w-md rounded-[2rem] p-10 animate-fade-in-up bg-white/30 backdrop-blur-2xl border border-white/60 shadow-[inset_0_0_30px_rgba(255,255,255,0.6),0_8px_32px_0_rgba(16,185,129,0.2)]" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-slate-800 tracking-tight">Who are you?</h2>
            <p className="text-slate-500 mt-2">Select your role to get started</p>
          </div>
          
          <div className="space-y-5">
            {roles.map(role => (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                className="neu-btn w-full p-6 text-left rounded-2xl flex flex-col gap-1 transition-all"
              >
                <div className="font-bold text-xl text-slate-700">{role.label}</div>
                <div className="text-sm text-slate-500 font-normal">{role.description}</div>
              </button>
            ))}
          </div>
        </div>
      ) : (
        <div className="relative z-10 w-full max-w-md rounded-[2rem] p-10 animate-fade-in-up bg-white/30 backdrop-blur-2xl border border-white/60 shadow-[inset_0_0_30px_rgba(255,255,255,0.6),0_8px_32px_0_rgba(16,185,129,0.2)]" style={{ animationDelay: '0.2s', animationFillMode: 'both' }}>
          <div className="text-center mb-8">
            <h2 className="text-2xl font-bold text-slate-800 tracking-tight">
              Login as {selectedRole && selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}
            </h2>
            <p className="text-slate-500 mt-2">Enter your credentials</p>
          </div>
          
          <form onSubmit={handleSubmit} className="space-y-6">
            {(formError || error) && (
              <div className="p-4 neu-pressed rounded-2xl flex gap-3 text-sm text-rose-500 items-center font-medium">
                <AlertCircle className="w-5 h-5 flex-shrink-0" />
                <div>{formError || error}</div>
              </div>
            )}

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 ml-2 flex items-center gap-2">
                <User className="w-4 h-4 text-emerald-500" /> Name
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                className="neu-input w-full px-5 py-4 rounded-2xl placeholder-slate-400"
                placeholder="Your name"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 ml-2 flex items-center gap-2">
                <Mail className="w-4 h-4 text-amber-500" /> Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleInputChange}
                className="neu-input w-full px-5 py-4 rounded-2xl placeholder-slate-400"
                placeholder="your@email.com"
                disabled={isLoading}
              />
            </div>

            <div className="space-y-2">
              <label className="text-sm font-semibold text-slate-600 ml-2 flex items-center gap-2">
                <KeyRound className="w-4 h-4 text-rose-500" /> Password
              </label>
              <input
                type="password"
                name="password"
                value={formData.password}
                onChange={handleInputChange}
                className="neu-input w-full px-5 py-4 rounded-2xl placeholder-slate-400"
                placeholder="••••••••"
                disabled={isLoading}
              />
            </div>

            <div className="neu-pressed rounded-xl p-4 text-xs text-slate-500 mt-2 text-center space-y-1">
              <p className="font-semibold text-slate-600 uppercase tracking-widest mb-2">Demo Credentials</p>
              <p>Email: <span className="font-mono text-slate-700">{selectedRole}@test.com</span></p>
              <p>Password: <span className="font-mono text-slate-700">password123</span></p>
            </div>

            <div className="flex gap-4 pt-4">
              <button
                type="button"
                onClick={handleBackToRole}
                disabled={isLoading}
                className="neu-flat px-6 py-4 rounded-2xl text-slate-500 hover:text-slate-700 font-semibold transition-colors flex items-center gap-2"
              >
                <ArrowLeft className="w-4 h-4" /> Back
              </button>
              <button
                type="submit"
                disabled={isLoading}
                className="neu-btn flex-1 py-4 rounded-2xl text-emerald-600 text-lg flex items-center justify-center gap-2"
              >
                {isLoading ? 'Authenticating...' : 'Secure Login'}
              </button>
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default Login;