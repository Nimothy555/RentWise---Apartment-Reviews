import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import VerificationBanner from './components/VerificationBanner'
import Home from './pages/Home'
import ApartmentDetail from './pages/ApartmentDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import Profile from './pages/Profile'
import VerifyEmail from './pages/VerifyEmail'
import ForgotPassword from './pages/ForgotPassword'
import ResetPassword from './pages/ResetPassword'
import Dashboard from './pages/Dashboard'
import Saved from './pages/Saved'
import AddApartment from './pages/AddApartment'
import AdminPanel from './pages/AdminPanel'

export default function App() {
  const { user } = useAuth()

  return (
    <>
      <Navbar />
      <VerificationBanner user={user} />
      <main>
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/apartments/:id" element={<ApartmentDetail />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route path="/forgot-password" element={<ForgotPassword />} />
          <Route path="/reset-password" element={<ResetPassword />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/add" element={<AddApartment />} />
          <Route path="/admin" element={<AdminPanel />} />
        </Routes>
      </main>
    </>
  )
}
