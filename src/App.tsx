import { useState, useEffect } from 'react';
import { AuthProvider, useAuth } from './contexts/AuthContext';
import { supabase } from './lib/supabase';
import Login from './components/Login';
import Signup from './components/Signup';
import Sidebar from './components/Sidebar';
import Dashboard from './components/Dashboard';
import Houses from './components/Houses';
import Members from './components/Members';
import Users from './components/Users';
import Links from './components/Links';
import Deals from './components/Deals';
import I2WE from './components/I2WE';
import Attendance from './components/Attendance';
import Reports from './components/Reports';
import PendingMembers from './components/PendingMembers';
import Footer from './components/Footer';

function ConnectionTest() {
  const [connectionStatus, setConnectionStatus] = useState<'testing' | 'success' | 'error'>('testing');
  const [errorDetails, setErrorDetails] = useState<string>('');

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection...');
        const { data, error } = await supabase.from('profiles').select('count').limit(1);

        if (error) {
          console.error('Connection test failed:', error);
          setErrorDetails(error.message);
          setConnectionStatus('error');
        } else {
          console.log('Connection test successful:', data);
          setConnectionStatus('success');
        }
      } catch (err: any) {
        console.error('Connection test error:', err);
        setErrorDetails(err.message || 'Unknown error');
        setConnectionStatus('error');
      }
    };

    testConnection();
  }, []);

  if (connectionStatus === 'testing') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0F0E' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#6EE7B7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9CA3AF]">Connecting to database...</p>
        </div>
      </div>
    );
  }

  if (connectionStatus === 'error') {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0F0E' }}>
        <div className="text-center bg-card rounded-3xl p-8 border border-red-800/50 max-w-md">
          <div className="text-red-400 mb-4">
            <h2 className="font-semibold text-xl mb-3">Connection Error</h2>
            <p className="text-sm text-gray-400 mb-4">
              Unable to connect to Supabase database. This is likely due to expired credentials.
            </p>
            <div className="bg-red-900/20 p-4 rounded-lg text-left mb-4">
              <p className="text-xs font-mono break-all">{errorDetails}</p>
            </div>
            <p className="text-sm text-gray-400">
              Please check your Supabase configuration and ensure your anon key is valid.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-3 rounded-xl bg-[#4ADE80] text-[#0B0F0E] font-semibold hover:brightness-110 transition-all"
          >
            Retry Connection
          </button>
        </div>
      </div>
    );
  }

  return null;
}

function AppContent() {
  const { user, profile, loading } = useAuth();
  const [currentView, setCurrentView] = useState('dashboard');
  const [showSignup, setShowSignup] = useState(false);
  const [connectionTested, setConnectionTested] = useState(false);

  console.log('AppContent state:', { user: !!user, profile: !!profile, loading });

  useEffect(() => {
    const testConnection = async () => {
      try {
        console.log('Testing Supabase connection from AppContent...');
        const { error } = await supabase.from('profiles').select('count').limit(1);

        if (error) {
          console.error('Supabase connection failed:', error);
        } else {
          console.log('Supabase connection successful');
        }
      } catch (err) {
        console.error('Connection test error:', err);
      } finally {
        setConnectionTested(true);
      }
    };

    testConnection();
  }, []);

  if (!connectionTested || loading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0F0E' }}>
        <div className="text-center">
          <div className="w-16 h-16 border-4 border-[#6EE7B7] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p className="text-[#9CA3AF]">{!connectionTested ? 'Connecting...' : 'Loading...'}</p>
        </div>
      </div>
    );
  }

  if (!user) {
    console.log('No user found, showing login or signup');
    if (showSignup) {
      return <Signup onBackToLogin={() => setShowSignup(false)} />;
    }
    return <Login onShowSignup={() => setShowSignup(true)} />;
  }

  if (!profile) {
    console.log('User exists but no profile found');
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0F0E' }}>
        <div className="text-center bg-card rounded-3xl p-8 border border-gray-800/50 max-w-md">
          <div className="text-red-400 mb-4">
            <p className="font-semibold mb-2">Profile Not Found</p>
            <p className="text-sm text-gray-400">
              You are logged in but your profile is missing. Please run the SETUP_COMPLETE.sql script in your Supabase SQL Editor.
            </p>
          </div>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 rounded-xl bg-[#4ADE80] text-[#0B0F0E] font-semibold"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  if (profile.role === 'member') {
    console.log('User has member role, access denied');
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ backgroundColor: '#0B0F0E' }}>
        <div className="text-center bg-card rounded-3xl p-8 border border-gray-800/50 max-w-md">
          <div className="text-yellow-400 mb-4">
            <p className="font-semibold mb-2">Access Restricted</p>
            <p className="text-sm text-gray-400">
              Members can only login through the WeVysya mobile app. This web portal is for administrators only.
            </p>
            <p className="text-sm text-gray-400 mt-4">
              Contact your administrator if you need access to the management portal.
            </p>
          </div>
          <button
            onClick={async () => {
              await supabase.auth.signOut();
              window.location.reload();
            }}
            className="px-4 py-2 rounded-xl bg-[#4ADE80] text-[#0B0F0E] font-semibold"
          >
            Back to Login
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex min-h-screen" style={{ backgroundColor: '#0B0F0E' }}>
      <Sidebar currentView={currentView} onViewChange={setCurrentView} />
      <main className="flex-1 overflow-y-auto flex flex-col">
        <div className="flex-1">
          {currentView === 'dashboard' && <Dashboard />}
          {currentView === 'houses' && <Houses />}
          {currentView === 'members' && <Members />}
          {currentView === 'pending' && <PendingMembers />}
          {currentView === 'users' && <Users />}
          {currentView === 'links' && <Links />}
          {currentView === 'deals' && <Deals />}
          {currentView === 'i2we' && <I2WE />}
          {currentView === 'attendance' && <Attendance />}
          {currentView === 'reports' && <Reports />}
        </div>
        <Footer />
      </main>
    </div>
  );
}

function App() {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
}

export default App;
