import { apiClient } from './apiClient';

/**
 * Registers a new student account.
 * Route: POST /api/auth/register
 */
export async function registerUser(userData) {
  const response = await apiClient('/api/auth/register', {
    method: 'POST',
    body: userData,
  });

  if (response?.data?.token) {
    try {
      localStorage.setItem('cloudvault_token', response.data.token);
    } catch {
      // localStorage may fail in private mode
    }
  }

  return response;
}

/**
 * Logs in with institutional credentials.
 * Route: POST /api/auth/login
 */
export async function loginUser(credentials) {
  const response = await apiClient('/api/auth/login', {
    method: 'POST',
    body: credentials,
  });

  if (response?.data?.token) {
    try {
      localStorage.setItem('cloudvault_token', response.data.token);
    } catch {
      // localStorage may fail in private mode
    }
  }

  return response;
}

/**
 * Logs out user and clears token session.
 * Route: POST /api/auth/logout
 */
export async function logoutUser() {
  try {
    return await apiClient('/api/auth/logout', {
      method: 'POST',
    });
  } finally {
    try {
      localStorage.removeItem('cloudvault_token');
    } catch {
      // ignore
    }
  }
}

/**
 * Fetches authenticated user profile.
 * Route: GET /api/auth/me
 */
export async function getCurrentUser() {
  const response = await apiClient('/api/auth/me', {
    method: 'GET',
  });
  return response;
}

/**
 * Updates user profile details.
 * Route: PUT /api/auth/profile
 */
export async function updateUserProfile(profileData) {
  const response = await apiClient('/api/auth/profile', {
    method: 'PUT',
    body: profileData,
  });
  return response;
}

/**
 * Changes user password.
 * Route: PUT /api/auth/password
 */
export async function changeUserPassword(passwordData) {
  const response = await apiClient('/api/auth/password', {
    method: 'PUT',
    body: passwordData,
  });
  return response;
}

/**
 * Dispatches password reset token.
 * Route: POST /api/auth/forgot-password
 */
export async function forgotPassword(email) {
  const response = await apiClient('/api/auth/forgot-password', {
    method: 'POST',
    body: { email },
  });
  return response;
}

/**
 * Resets user password using reset token.
 * Route: POST /api/auth/reset-password
 */
export async function resetPassword(resetData) {
  const response = await apiClient('/api/auth/reset-password', {
    method: 'POST',
    body: resetData,
  });
  return response;
}
