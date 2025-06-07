let refreshInterval;

export const startTokenRefresh = () => {
  refreshInterval = setInterval(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (session) {
        await supabase.auth.setSession(session);
      }
    } catch (error) {
      console.error('Error refreshing token:', error);
    }
  }, TOKEN_REFRESH_INTERVAL);
};

export const stopTokenRefresh = () => {
  clearInterval(refreshInterval);
};

// Llamar en App.jsx al iniciar
startTokenRefresh();
