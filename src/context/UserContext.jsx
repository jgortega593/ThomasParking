import { createContext, useContext, useEffect, useState } from 'react';
import supabase from '../supabaseClient';

const UserContext = createContext();

export const UserProvider = ({ children }) => {
  const [state, setState] = useState({
    user: null,
    loading: true,
    error: null
  });

  useEffect(() => {
    let isMounted = true;
    
    const checkSession = async () => {
      try {
        const { data: { session }, error } = await supabase.auth.getSession();
        
        if (!isMounted) return;
        if (error) throw error;
        
        if (session?.user) {
          const { data: userData } = await supabase
            .from('usuarios_app')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setState({
            user: { ...session.user, ...userData },
            loading: false,
            error: null
          });
        } else {
          setState({ user: null, loading: false, error: null });
        }
      } catch (error) {
        setState({ user: null, loading: false, error: error.message });
      }
    };

    checkSession();

    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      async (_event, session) => {
        if (session?.user) {
          const { data: userData } = await supabase
            .from('usuarios_app')
            .select('*')
            .eq('id', session.user.id)
            .single();

          setState({
            user: { ...session.user, ...userData },
            loading: false,
            error: null
          });
        } else {
          setState({ user: null, loading: false, error: null });
        }
      }
    );

    return () => {
      isMounted = false;
      subscription?.unsubscribe();
    };
  }, []);

  return (
    <UserContext.Provider value={state}>
      {!state.loading && children}
    </UserContext.Provider>
  );
};

export const useUser = () => {
  const context = useContext(UserContext);
  if (!context) {
    throw new Error('useUser debe usarse dentro de UserProvider');
  }
  return context;
};
