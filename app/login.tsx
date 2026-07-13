'use client';
import { useState } from 'react';
import { supabase } from '../lib/supabaseClient';

export default function Login({ onLogin }: { onLogin: (rol: string, nombre: string) => void }) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError('');
    setCargando(true);
    const { error: authError } = await supabase.auth.signInWithPassword({ email, password });
    if (authError) {
      setError('Email o contraseña incorrectos.');
      setCargando(false);
      return;
    }
    const { data: userData, error: userError } = await supabase
      .from('usuarios')
      .select('*')
      .eq('email', email)
      .single();
    if (userError || !userData) {
      setError('No se encontró un usuario asociado a esa cuenta.');
      setCargando(false);
      return;
    }
    onLogin(userData.rol, userData.nombre);
    setCargando(false);
  }

  return (
    <div
      style={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: '#1a1a2e',
      }}
    >
      <form
        onSubmit={handleSubmit}
        style={{
          background: '#fff',
          borderRadius: 16,
          padding: 32,
          width: '90%',
          maxWidth: 360,
        }}
      >
        <div style={{ textAlign: 'center', marginBottom: 24 }}>
          <div style={{ fontSize: 22, fontWeight: 700, letterSpacing: 3, color: '#1a1a2e' }}>HYPE</div>
          <div style={{ fontSize: 11, color: '#888', letterSpacing: 2, textTransform: 'uppercase' }}>
            Producción
          </div>
        </div>
        <div style={{ marginBottom: 14 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Email</label>
          <input
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </div>
        <div style={{ marginBottom: 20 }}>
          <label style={{ fontSize: 12, color: '#666', display: 'block', marginBottom: 4 }}>Contraseña</label>
          <input
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            style={{ width: '100%', padding: '10px 12px', borderRadius: 8, border: '1px solid #ddd', fontSize: 14 }}
          />
        </div>
        {error && (
          <div style={{ marginBottom: 14, fontSize: 13, color: '#c00', background: '#fee', padding: 10, borderRadius: 8 }}>
            {error}
          </div>
        )}
        <button
          type="submit"
          disabled={cargando}
          style={{
            width: '100%',
            padding: '11px',
            borderRadius: 8,
            border: 'none',
            background: '#e85d2f',
            color: '#fff',
            fontSize: 14,
            fontWeight: 600,
            cursor: 'pointer',
          }}
        >
          {cargando ? 'Ingresando...' : 'Ingresar'}
        </button>
      </form>
    </div>
  );
}
