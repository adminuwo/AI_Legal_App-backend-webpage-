import './App.css'
import NavigationProvider from './Navigation.Provider'
import { RecoilRoot } from 'recoil'
import { useEffect } from 'react'
import AOS from 'aos'
import 'aos/dist/aos.css'
import axios from 'axios'
import toast from 'react-hot-toast'
import { clearUser } from './userStore/userData'
//chat 
// Global Interceptor for Session Management
// Guard flag to prevent multiple simultaneous SESSION_REVOKED toasts/logouts
let isHandlingSessionRevoke = false;

axios.interceptors.response.use(
  (response) => response,
  (error) => {
    if (error.response && error.response.status === 401) {
      if (error.response.data?.code === 'SESSION_REVOKED') {
        // Deduplicate: only show toast + redirect once even if many parallel requests fail
        if (!isHandlingSessionRevoke) {
          isHandlingSessionRevoke = true;
          toast.error("Security Alert: You have been logged out remotely.");
          clearUser();
          // Force refresh to login after a short delay
          setTimeout(() => {
            isHandlingSessionRevoke = false; // Reset in case the redirect doesn't happen
            window.location.href = '/login';
          }, 2000);
        }
      }
    }
    return Promise.reject(error);
  }
);

function App() {
  useEffect(() => {
    AOS.init({
      duration: 800,
      once: true,
      easing: 'ease-out-quint',
    })
  }, [])

  return (
    <RecoilRoot>
      <NavigationProvider />
    </RecoilRoot>
  )
}

export default App

