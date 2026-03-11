const BASE = '/api'

function getToken() {
  return localStorage.getItem('token')
}

async function request(path, options = {}) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
    ...options,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error || data?.errors?.join(', ') || 'Something went wrong'
    throw new Error(msg)
  }
  return data
}

async function requestMultipart(path, formData) {
  const token = getToken()
  const res = await fetch(`${BASE}${path}`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  })
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const msg = data?.error || data?.errors?.join(', ') || 'Something went wrong'
    throw new Error(msg)
  }
  return data
}

export const api = {
  // Apartments
  getApartments: (params = {}) => {
    const query = new URLSearchParams(params).toString()
    return request(`/apartments${query ? '?' + query : ''}`)
  },
  getApartment: (id) => request(`/apartments/${id}`),
  createApartment: (data) => request('/apartments', { method: 'POST', body: JSON.stringify(data) }),

  // Verifications
  createVerification: (formData) => requestMultipart('/verifications', formData),
  getMyVerification: (apartmentId) => request(`/verifications/my/${apartmentId}`),

  // Reviews
  createReview: (aptId, data) => request(`/apartments/${aptId}/reviews`, { method: 'POST', body: JSON.stringify(data) }),
  deleteReview: (aptId, reviewId) => request(`/apartments/${aptId}/reviews/${reviewId}`, { method: 'DELETE' }),

  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),

  // Users
  getMyProfile: () => request('/users/me'),
}
