import { Toaster } from 'react-hot-toast';
import AppRouter from './AppRouter';
import { AuthProvider } from './contexts/AuthContext';
import { NadiaProvider } from './contexts/NadiaContext';

function App() {
  return (
    <AuthProvider>
      <NadiaProvider>
      <AppRouter />
      <Toaster
        position="top-right"
        toastOptions={{
          duration: 2000,
          style: {
            background: '#001F3F',
            color: '#fff',
            borderRadius: '12px',
            padding: '14px 18px',
            fontSize: '13px',
            fontWeight: '600',
            boxShadow: '0 8px 32px rgba(0,31,63,0.35)',
            maxWidth: '360px',
          },
          success: {
            iconTheme: { primary: '#34d399', secondary: '#001F3F' },
          },
          error: {
            iconTheme: { primary: '#f87171', secondary: '#001F3F' },
          },
        }}
      />
      </NadiaProvider>
    </AuthProvider>
  );
}

export default App;
