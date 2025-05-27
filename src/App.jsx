// src/App.jsx
import React, { useState, useEffect } from 'react';
// ... otros imports ...

function App() {
  const [menuOpen, setMenuOpen] = useState(false);
  const [loading, setLoading] = useState(true);
  const [updateAvailable, setUpdateAvailable] = useState(false);

  // 1. Registrar Service Worker
  useEffect(() => {
    const registerServiceWorker = async () => {
      if ('serviceWorker' in navigator) {
        try {
          const registration = await navigator.serviceWorker.register('/service-worker.js');
          
          registration.addEventListener('updatefound', () => {
            const newWorker = registration.installing;
            newWorker.addEventListener('statechange', () => {
              if (newWorker.state === 'installed') {
                if (navigator.serviceWorker.controller) {
                  setUpdateAvailable(true);
                  newWorker.postMessage('SKIP_WAITING');
                }
              }
            });
          });
        } catch (error) {
          console.log('Error registrando Service Worker:', error);
        }
      }
    };

    window.addEventListener('load', registerServiceWorker);
    return () => window.removeEventListener('load', registerServiceWorker);
  }, []);

  // 2. Manejar actualización de la aplicación
  const handleUpdateApp = () => {
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker.ready.then(registration => {
        registration.unregister().then(() => {
          window.location.reload(true);
        });
      });
    }
  };

  // 3. Sincronizar sesión con Supabase
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        localStorage.setItem('sb-access-token', session.access_token);
      }
      setLoading(false);
    };
    checkSession();
  }, []);

  if (loading) {
    return <Loader fullScreen text="Inicializando aplicación..." />;
  }

  return (
    <ThemeProvider>
      <UserProvider>
        <BrowserRouter
          future={{
            v7_startTransition: true,
            v7_relativeSplatPath: true,
            v7_fetcherPersist: true
          }}
        >
          <ErrorBoundary>
            {/* Notificación de actualización */}
            {updateAvailable && (
              <div className="fixed bottom-4 right-4 bg-blue-500 text-white p-4 rounded-lg shadow-lg flex items-center gap-4">
                <span>¡Nueva versión disponible!</span>
                <button 
                  onClick={handleUpdateApp}
                  className="bg-white text-blue-500 px-4 py-2 rounded hover:bg-blue-50 transition-colors"
                >
                  Actualizar ahora
                </button>
              </div>
            )}
            
            <AppRoutes 
              menuOpen={menuOpen} 
              setMenuOpen={setMenuOpen} 
            />
          </ErrorBoundary>
        </BrowserRouter>
      </UserProvider>
    </ThemeProvider>
  );
}

export default App;
