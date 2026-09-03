import { useEffect, useState } from 'react';
import { supabase } from './supabaseClient.js';
import Login from './components/Login.jsx';
import AccountSummaryView from './components/AccountSummaryView.jsx';

export default function App() {
  const [session, setSession] = useState(undefined); // undefined = still checking, null = logged out

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => setSession(data.session));
    const { data: sub } = supabase.auth.onAuthStateChange((_event, sess) => setSession(sess));
    return () => sub.subscription.unsubscribe();
  }, []);

  if (session === undefined) {
    return <div style={{ padding: 40, fontFamily: 'sans-serif' }}>Loading…</div>;
  }
  if (!session) {
    return <Login />;
  }

  return (
    <div style={{ minHeight: '100vh' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 24px', borderBottom: '1px solid #E5E3DC', background: '#fff' }}>
        <div style={{ fontSize: 18, fontWeight: 700 }}>Quote Master Tracker</div>
        <button
          onClick={() => supabase.auth.signOut()}
          style={{ fontSize: 13, color: '#6B7280', background: 'none', border: '1px solid #E5E3DC', borderRadius: 6, padding: '6px 12px', cursor: 'pointer' }}
        >
          Sign Out ({session.user.email})
        </button>
      </div>
      <div style={{ padding: 24, maxWidth: 1100, margin: '0 auto' }}>
        <AccountSummaryView userId={session.user.id} />
      </div>
    </div>
  );
}
