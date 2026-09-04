import { Navigate, useLocation } from 'react-router-dom';

/**
 * ProtectedRoute Component
 * Wraps around routes that require authentication.
 * Redirects to login if user is not authenticated.
 */
const ProtectedRoute = ({ children }) => {
  const location = useLocation();

  // Check if user is authenticated
  const isAuthenticated = () => {
    try {
      const user = localStorage.getItem('user');
      if (!user) return false;

      const userData = JSON.parse(user);
      // Check if user object has required fields
      return userData && userData.email;
    } catch (error) {
      console.error('Error checking authentication:', error);
      return false;
    }
  };

  if (!isAuthenticated()) {
    // Redirect to login page, preserving the intended destination
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  return children;
};

export default ProtectedRoute;
