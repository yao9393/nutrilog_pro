import { useState } from 'react';
import { supabase } from '../supabaseClient.js';

export default function Login() {
  const [mode, setMode] = useState('signin'); // 'signin' | 'signup'
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null); // { type: 'error' | 'info', text }

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);
    try {
      if (mode === 'signin') {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        setMessage({ type: 'info', text: 'Check your email to confirm your account, then sign in.' });
        setMode('signin');
      }
    } catch (err) {
      setMessage({ type: 'error', text: err.message || 'Something went wrong.' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div style={{ minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#F5F3EE' }}>
      <form onSubmit={handleSubmit} style={{ background: '#fff', padding: 32, borderRadius: 12, width: 340, boxShadow: '0 1px 3px rgba(0,0,0,0.1)' }}>
        <h1 style={{ fontSize: 20, fontWeight: 700, marginBottom: 4 }}>Quote Master Tracker</h1>
        <p style={{ fontSize: 13, color: '#6B7280', marginBottom: 20 }}>
          {mode === 'signin' ? 'Sign in to continue' : 'Create an account'}
        </p>

        <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Email</label>
        <input
          type="email" required value={email} onChange={(e) => setEmail(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E3DC', borderRadius: 6, marginBottom: 14, fontSize: 14 }}
        />

        <label style={{ fontSize: 12, fontWeight: 500, display: 'block', marginBottom: 4 }}>Password</label>
        <input
          type="password" required minLength={6} value={password} onChange={(e) => setPassword(e.target.value)}
          style={{ width: '100%', padding: '8px 10px', border: '1px solid #E5E3DC', borderRadius: 6, marginBottom: 18, fontSize: 14 }}
        />

        {message && (
          <div style={{
            fontSize: 12, padding: '8px 10px', borderRadius: 6, marginBottom: 14,
            background: message.type === 'error' ? '#FDECEA' : '#E6F4F1',
            color: message.type === 'error' ? '#B1552C' : '#0E7C74',
          }}>
            {message.text}
          </div>
        )}

        <button type="submit" disabled={loading} style={{
          width: '100%', padding: '10px', borderRadius: 6, border: 'none',
          background: '#0E7C74', color: '#fff', fontSize: 14, fontWeight: 600, cursor: 'pointer', opacity: loading ? 0.6 : 1,
        }}>
          {loading ? 'Please wait…' : mode === 'signin' ? 'Sign In' : 'Sign Up'}
        </button>

        <button
          type="button"
          onClick={() => { setMode(mode === 'signin' ? 'signup' : 'signin'); setMessage(null); }}
          style={{ width: '100%', marginTop: 12, background: 'none', border: 'none', fontSize: 12, color: '#0E7C74', cursor: 'pointer' }}
        >
          {mode === 'signin' ? "Don't have an account? Sign up" : 'Already have an account? Sign in'}
        </button>
      </form>
    </div>
  );
}
