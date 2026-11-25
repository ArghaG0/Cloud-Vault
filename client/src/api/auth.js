const API_BASE_URL =
  import.meta.env.VITE_API_URL || 'http://localhost:5001/api';

function handleApiError(response, payload) {
  const message =
    payload?.error ||
    payload?.message ||
    `Request failed with status ${response.status}`;

  const error = new Error(message);
  error.status = response.status;
  error.data = payload;
  return error;
}

async function parseJsonSafe(response) {
  try {
    return await response.json();
  } catch {
    return null;
  }
}

function buildHeaders(token, hasBody = false) {
  const headers = {};
  if (hasBody) {
    headers['Content-Type'] = 'application/json';
  }
  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }
  return headers;
}

// POST /api/auth/register
export async function registerUser(userData) {
  const response = await fetch(`${API_BASE_URL}/auth/register`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    credentials: 'include',
    body: JSON.stringify(userData),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}

// POST /api/auth/login
export async function loginUser(credentials) {
  const response = await fetch(`${API_BASE_URL}/auth/login`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    credentials: 'include',
    body: JSON.stringify(credentials),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}

// POST /api/auth/logout
export async function logoutUser() {
  const response = await fetch(`${API_BASE_URL}/auth/logout`, {
    method: 'POST',
    headers: buildHeaders(null, false),
    credentials: 'include',
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}

// GET /api/auth/me
export async function getCurrentUser(token) {
  const response = await fetch(`${API_BASE_URL}/auth/me`, {
    method: 'GET',
    headers: buildHeaders(token, false),
    credentials: 'include',
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}

// PUT /api/auth/profile
export async function updateUserProfile(profileData, token) {
  const response = await fetch(`${API_BASE_URL}/auth/profile`, {
    method: 'PUT',
    headers: buildHeaders(token, true),
    credentials: 'include',
    body: JSON.stringify(profileData),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}

// PUT /api/auth/password
export async function changeUserPassword(passwordData, token) {
  const response = await fetch(`${API_BASE_URL}/auth/password`, {
    method: 'PUT',
    headers: buildHeaders(token, true),
    credentials: 'include',
    body: JSON.stringify(passwordData),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}

// POST /api/auth/forgot-password
export async function forgotPassword(email) {
  const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    credentials: 'include',
    body: JSON.stringify({ email }),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}

// POST /api/auth/reset-password
export async function resetPassword(resetData) {
  const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
    method: 'POST',
    headers: buildHeaders(null, true),
    credentials: 'include',
    body: JSON.stringify(resetData),
  });

  const payload = await parseJsonSafe(response);
  if (!response.ok || payload?.success === false) {
    throw handleApiError(response, payload);
  }
  return payload;
}