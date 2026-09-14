import { Navigate, useLocation } from 'react-router-dom';
import { getUserData } from '../../userStore/userData';

/**
 * ProtectedRoute Component
 * Wraps around routes that require authentication.
 * Redirects to login if user is not authenticated, preserving the intended destination.
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  // Check if user is authenticated via token or valid user object
  const isAuthenticated = () => {
    try {
      const token = localStorage.getItem('token');
      if (token && token !== 'undefined' && token !== 'null') {
        return true;
      }

      const userToken = getUserData()?.token;
      if (userToken && userToken !== 'undefined' && userToken !== 'null') {
        return true;
      }

      const userStr = localStorage.getItem('user');
      if (userStr) {
        const userData = JSON.parse(userStr);
        if (userData && (userData.token || userData.email || userData.id || userData._id)) {
          return true;
        }
      }

      return false;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  };

  if (!isAuthenticated()) {
    // Redirect to login page, preserving the intended destination
    const destination = location.pathname + location.search + location.hash;
    return <Navigate to="/login" state={{ from: destination }} replace />;
  }

  return children;
};

export default ProtectedRoute;
