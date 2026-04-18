import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth, UserRole } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { AlertCircle } from 'lucide-react';

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
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-green-50 flex items-center justify-center p-4">
      {step === 'role-select' ? (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-3xl font-bold">Who are you?</CardTitle>
            <CardDescription>Select your role to get started</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            {roles.map(role => (
              <button
                key={role.value}
                onClick={() => handleRoleSelect(role.value)}
                className="w-full p-4 text-left border-2 border-gray-200 rounded-lg hover:border-blue-500 hover:bg-blue-50 transition-all"
              >
                <div className="font-semibold text-lg">{role.label}</div>
                <div className="text-sm text-gray-600">{role.description}</div>
              </button>
            ))}
          </CardContent>
        </Card>
      ) : (
        <Card className="w-full max-w-md">
          <CardHeader className="text-center">
            <CardTitle className="text-2xl font-bold">Login as {selectedRole && selectedRole.charAt(0).toUpperCase() + selectedRole.slice(1)}</CardTitle>
            <CardDescription>Enter your credentials</CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              {(formError || error) && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg flex gap-2 text-sm text-red-700">
                  <AlertCircle className="w-5 h-5 flex-shrink-0" />
                  <div>{formError || error}</div>
                </div>
              )}

              <div className="space-y-2">
                <label className="text-sm font-medium">Name</label>
                <Input
                  type="text"
                  name="name"
                  value={formData.name}
                  onChange={handleInputChange}
                  placeholder="Your name"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Email</label>
                <Input
                  type="email"
                  name="email"
                  value={formData.email}
                  onChange={handleInputChange}
                  placeholder="your@email.com"
                  disabled={isLoading}
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium">Password</label>
                <Input
                  type="password"
                  name="password"
                  value={formData.password}
                  onChange={handleInputChange}
                  placeholder="••••••"
                  disabled={isLoading}
                />
              </div>

              <div className="text-xs text-gray-500 mt-2">
                <p><strong>Demo Credentials:</strong></p>
                <p>Email: {selectedRole}@test.com</p>
                <p>Password: password123</p>
              </div>

              <div className="flex gap-3 pt-4">
                <Button
                  type="button"
                  variant="outline"
                  onClick={handleBackToRole}
                  disabled={isLoading}
                  className="flex-1"
                >
                  Back
                </Button>
                <Button
                  type="submit"
                  disabled={isLoading}
                  className="flex-1"
                >
                  {isLoading ? 'Logging in...' : 'Login'}
                </Button>
              </div>
            </form>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default Login;