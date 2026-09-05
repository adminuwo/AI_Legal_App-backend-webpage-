/**
 * AI Legal Web - Authentication Error Mapper
 * Standardizes errors caught from network requests & validations into user-friendly UI configurations.
 */

export function parseAuthError(err, context, navigate, onAction) {
  let errMsg = "";
  let isTimeout = false;
  let isNetwork = false;
  let status = 0;
  let errCode = "";

  if (typeof err === 'string') {
    errMsg = err;
  } else if (err && typeof err === 'object') {
    // Check for network timeout
    if (err.code === 'ECONNABORTED' || err.message?.toLowerCase().includes('timeout') || err.message?.toLowerCase().includes('exceeded')) {
      isTimeout = true;
    }
    // Check for network offline
    if (
      err.message?.toLowerCase().includes('network') || 
      err.code === 'ERR_NETWORK' ||
      (typeof navigator !== 'undefined' && !navigator.onLine)
    ) {
      isNetwork = true;
    }
    
    status = err.response?.status;
    errMsg = err.response?.data?.error || err.response?.data?.message || err.message || "";
    errCode = err.response?.data?.code || "";
  }

  const logDevError = () => {
    // Log detailed errors only in development logs and analytics
    if (process.env.NODE_ENV === 'development' || !process.env.NODE_ENV) {
      console.group('--- [DEV AUTH ERROR LOG] ---');
      console.error('Raw Error Object:', err);
      console.error('Context:', context);
      console.error('Mapped Message:', errMsg);
      console.error('HTTP Status:', status);
      console.error('Error Code:', errCode);
      console.groupEnd();
    }
  };

  logDevError();

  // 1. True Device Offline
  if (typeof navigator !== 'undefined' && navigator.onLine === false) {
    return {
      title: "No Internet Connection",
      description: "Please check your internet connection and try again.",
      icon: "wifi-off",
      primaryLabel: "Try Again",
      primaryAction: () => {
        if (onAction) onAction();
      }
    };
  }

  // 1b. Server Unreachable / CORS Network Error
  if (isNetwork) {
    return {
      title: "Unable to Connect to Server",
      description: "Could not reach the backend server. Please verify your connection or try again shortly.",
      icon: "server-off",
      primaryLabel: "Try Again",
      primaryAction: () => {
        if (onAction) onAction();
      }
    };
  }

  // 2. Timeout
  if (isTimeout) {
    return {
      title: "Request Timed Out",
      description: "The request took longer than expected. Please try again.",
      icon: "clock",
      primaryLabel: "Try Again",
      primaryAction: () => {
        if (onAction) onAction();
      }
    };
  }

  // 3. 5xx Server Unavailable
  if (status >= 500) {
    return {
      title: "Server Unavailable",
      description: "Our servers are currently unavailable. Please try again in a few minutes.",
      icon: "server-off",
      primaryLabel: "Try Again",
      primaryAction: () => {
        if (onAction) onAction();
      }
    };
  }

  // 4. Email Already Exists
  const lowerMsg = errMsg.toLowerCase();
  if (
    lowerMsg.includes("already exists with this email") || 
    lowerMsg.includes("user already exists") ||
    lowerMsg.includes("email already in use") || 
    lowerMsg.includes("email_already_in_use") ||
    lowerMsg.includes("email already registered")
  ) {
    return {
      title: "Account Already Exists",
      description: "An account with this email address already exists. Please sign in or use a different email address.",
      icon: "user-x",
      primaryLabel: "Log In",
      primaryAction: () => {
        navigate("/login");
      },
      secondaryLabel: "Use Different Email",
      secondaryAction: () => {
        if (onAction) onAction("focusEmail");
      }
    };
  }

  // 5. Phone Number Already Exists
  if (
    lowerMsg.includes("phone number already exists") || 
    lowerMsg.includes("phone number already registered") ||
    lowerMsg.includes("phone number is already associated")
  ) {
    return {
      title: "Phone Number Already Registered",
      description: "This phone number is already associated with another account.",
      icon: "phone-off",
      primaryLabel: "Use Different Phone",
      primaryAction: () => {
        if (onAction) onAction("focusPhone");
      }
    };
  }

  // 6. Weak Password
  if (
    lowerMsg.includes("password must contain") || 
    lowerMsg.includes("password must be at least 8 characters") || 
    lowerMsg.includes("weak password") ||
    lowerMsg.includes("password validation")
  ) {
    return {
      title: "Weak Password",
      description: "Your password must contain at least:\n\n• 8 characters\n• One uppercase letter\n• One lowercase letter\n• One number\n• One special character",
      icon: "shield-alert",
      primaryLabel: "Try Again",
      primaryAction: () => {
        if (onAction) onAction("focusPassword");
      }
    };
  }

  // 7. Invalid Email Address
  if (
    lowerMsg.includes("enter a valid email") || 
    lowerMsg.includes("invalid email") || 
    lowerMsg.includes("valid email address")
  ) {
    return {
      title: "Invalid Email Address",
      description: "Please enter a valid email address.",
      icon: "mail-warning",
      primaryLabel: "OK",
      primaryAction: () => {
        if (onAction) onAction("focusEmail");
      }
    };
  }

  // 8. Passwords Don't Match
  if (
    lowerMsg.includes("passwords don't match") || 
    lowerMsg.includes("do not match")
  ) {
    return {
      title: "Passwords Don't Match",
      description: "The password and confirmation password do not match.",
      icon: "lock-keyhole",
      primaryLabel: "OK",
      primaryAction: () => {
        if (onAction) onAction("focusConfirmPassword");
      }
    };
  }

  // 9. Missing Required Fields
  if (
    lowerMsg.includes("complete all required fields") || 
    lowerMsg.includes("incomplete information") || 
    lowerMsg.includes("required fields") ||
    lowerMsg.includes("incomplete")
  ) {
    return {
      title: "Incomplete Information",
      description: "Please complete all required fields before creating your account.",
      icon: "file-warning",
      primaryLabel: "OK",
      primaryAction: () => {
        if (onAction) onAction();
      }
    };
  }

  // 9b. Terms & Conditions Required
  if (
    lowerMsg.includes("accept the terms") || 
    lowerMsg.includes("terms & conditions") || 
    lowerMsg.includes("terms of service")
  ) {
    return {
      title: "Terms & Conditions Required",
      description: "You must accept the Terms of Service, Privacy Policy, and Cookie Policy to create an account.",
      icon: "file-warning",
      primaryLabel: "I Accept",
      primaryAction: () => {
        if (onAction) onAction("focusTerms");
      }
    };
  }

  // 10. Incorrect Password (Login)
  if (lowerMsg.includes("incorrect password") || lowerMsg.includes("wrong password")) {
    return {
      title: "Incorrect Password",
      description: "The password you entered is incorrect. Please try again.",
      icon: "key-round",
      primaryLabel: "Try Again",
      primaryAction: () => {
        if (onAction) onAction("focusPassword");
      },
      secondaryLabel: "Forgot Password",
      secondaryAction: () => {
        navigate("/forgot-password");
      }
    };
  }

  // 11. Email Not Found (Login)
  if (
    lowerMsg.includes("account not found") || 
    lowerMsg.includes("no account was found") || 
    lowerMsg.includes("user not found")
  ) {
    return {
      title: "Account Not Found",
      description: "No account was found with this email address.",
      icon: "user-minus",
      primaryLabel: "Create Account",
      primaryAction: () => {
        navigate("/signup");
      },
      secondaryLabel: "Try Different Email",
      secondaryAction: () => {
        if (onAction) onAction("focusEmail");
      }
    };
  }

  // 12. Invalid Credentials (Generic Fallback for 401)
  if (lowerMsg.includes("invalid credentials") || status === 401) {
    return {
      title: "Invalid Credentials",
      description: "The email address or password is incorrect.",
      icon: "shield-x",
      primaryLabel: "OK",
      primaryAction: () => {
        if (onAction) onAction();
      }
    };
  }

  // 13. Account Disabled (Login)
  if (
    errCode === 'ACCOUNT_DEACTIVATED' || 
    lowerMsg.includes("deactivated") || 
    lowerMsg.includes("temporarily disabled") || 
    lowerMsg.includes("account disabled")
  ) {
    return {
      title: "Account Disabled",
      description: "Your account has been temporarily disabled. Please contact support.",
      icon: "user-cog",
      primaryLabel: "Contact Support",
      primaryAction: () => {
        navigate("/help-support");
      },
      secondaryLabel: "Cancel",
      secondaryAction: () => {}
    };
  }

  // 14. Too Many Attempts (Brute-Force Protection)
  if (
    errCode === 'ACCOUNT_LOCKED' || 
    lowerMsg.includes("too many failed attempts") || 
    lowerMsg.includes("too many attempts") || 
    lowerMsg.includes("account locked")
  ) {
    return {
      title: "Too Many Attempts",
      description: "Too many unsuccessful login attempts. Please wait a few minutes before trying again.",
      icon: "clock-alert",
      primaryLabel: "OK",
      primaryAction: () => {
        if (onAction) onAction();
      }
    };
  }

  // Default Fallback
  return {
    title: context === 'login' ? "Login Failed" : "Registration Failed",
    description: errMsg || "An error occurred. Please verify your entries and try again.",
    icon: "alert-triangle",
    primaryLabel: "OK",
    primaryAction: () => {
      if (onAction) onAction();
    }
  };
}
