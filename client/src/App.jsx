import { Routes, Route } from 'react-router-dom'
import { useAuth } from './context/AuthContext'
import Navbar from './components/Navbar'
import VerificationBanner from './components/VerificationBanner'
import Home from './pages/Home'
import ApartmentDetail from './pages/ApartmentDetail'
import Login from './pages/Login'
import Register from './pages/Register'
import AddApartment from './pages/AddApartment'
import Profile from './pages/Profile'
import MyListings from './pages/MyListings'
import VerifyEmail from './pages/VerifyEmail'
import Dashboard from './pages/Dashboard'
import Saved from './pages/Saved'
import EditListing from './pages/EditListing'

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
          <Route path="/add" element={<AddApartment />} />
          <Route path="/profile" element={<Profile />} />
          <Route path="/my-listings" element={<MyListings />} />
          <Route path="/verify-email" element={<VerifyEmail />} />
          <Route path="/dashboard" element={<Dashboard />} />
          <Route path="/saved" element={<Saved />} />
          <Route path="/apartments/:id/edit" element={<EditListing />} />
        </Routes>
      </main>
    </>
  )
}
