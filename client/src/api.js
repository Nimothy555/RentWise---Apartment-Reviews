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
    const err = new Error(msg)
    err.status = res.status
    throw err
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
  updateApartment: (id, data) => request(`/apartments/${id}`, { method: 'PUT', body: JSON.stringify(data) }),
  deleteApartment: (id) => request(`/apartments/${id}`, { method: 'DELETE' }),
  getMyListings: () => request('/apartments/mine'),
  getFilterOptions: () => request('/apartments/filters'),
  uploadApartmentPhotos: (id, formData) => requestMultipart(`/apartments/${id}/photos`, formData),
  deleteApartmentPhoto: (aptId, photoId) => request(`/apartments/${aptId}/photos/${photoId}`, { method: 'DELETE' }),
  claimApartment: (id) => request(`/apartments/${id}/claim`, { method: 'POST' }),

  // Verifications
  createVerification: (formData) => requestMultipart('/verifications', formData),
  getMyVerification: (apartmentId) => request(`/verifications/my/${apartmentId}`),
  getMyVerifications: () => request('/verifications/mine'),

  // Reviews
  createReview: (aptId, formData) => requestMultipart(`/apartments/${aptId}/reviews`, formData),
  deleteReview: (aptId, reviewId) => request(`/apartments/${aptId}/reviews/${reviewId}`, { method: 'DELETE' }),

  // Saved
  getSaved: () => request('/saved'),
  toggleSave: (aptId) => request(`/saved/${aptId}`, { method: 'POST' }),
  getSaveStatus: (aptId) => request(`/saved/${aptId}/status`),

  // Votes
  toggleVote: (reviewId) => request(`/votes/reviews/${reviewId}`, { method: 'POST' }),

  // Replies
  replyToReview: (reviewId, reply_text) => request(`/replies/reviews/${reviewId}`, { method: 'POST', body: JSON.stringify({ reply_text }) }),
  updateReply: (reviewId, reply_text) => request(`/replies/reviews/${reviewId}`, { method: 'PUT', body: JSON.stringify({ reply_text }) }),
  deleteReply: (reviewId) => request(`/replies/reviews/${reviewId}`, { method: 'DELETE' }),

  // Flags
  flagReview: (reviewId, reason) => request(`/flags/reviews/${reviewId}`, { method: 'POST', body: JSON.stringify({ reason }) }),
  unflagReview: (reviewId) => request(`/flags/reviews/${reviewId}`, { method: 'DELETE' }),

  // Auth
  register: (data) => request('/auth/register', { method: 'POST', body: JSON.stringify(data) }),
  login: (data) => request('/auth/login', { method: 'POST', body: JSON.stringify(data) }),
  logout: () => request('/auth/logout', { method: 'POST' }),
  getMe: () => request('/auth/me'),
  verifyEmail: (token) => request(`/auth/verify/${token}`),
  resendVerification: () => request('/auth/resend-verification', { method: 'POST' }),

  // Users
  getMyProfile: () => request('/users/me'),
}
