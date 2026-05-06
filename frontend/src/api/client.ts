import axios from 'axios'

const api = axios.create({
  baseURL: '',
  withCredentials: true,
})

// Add auth token from cookie automatically (httpOnly cookie handled by browser)
api.interceptors.response.use(
  (res) => res,
  (err) => {
    if (err.response?.status === 401) {
      // Redirect to login on auth failure
      if (window.location.pathname !== '/login') {
        window.location.href = '/login'
      }
    }
    return Promise.reject(err)
  }
)

export default api
