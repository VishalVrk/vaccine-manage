import React, { useState, useEffect } from "react";
import { BrowserRouter as Router, Route, Routes, Navigate } from "react-router-dom";
import { onAuthStateChanged } from "firebase/auth";
import { doc, getDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import Layout from "./components/Layout";
import VaccineAppointment from "./components/VaccineAppointment";
import VaccinationRecord from "./components/VaccinationRecord";
import LoginPage from "./pages/LoginPage";
import AdminDashboard from "./pages/AdminDashboard";
import ReportGeneration from "./components/ReportGeneration";
import ReminderSystem from "./components/ReminderSystem";
import PatientDashboard from "./pages/PatientDashboard";
import PrivateRoute from "./components/PrivateRoute";
import RegisterPage from "./pages/RegisterPage";

function App() {
  const [user, setUser] = useState(null);
  const [userRole, setUserRole] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, async (currentUser) => {
      setUser(currentUser);

      if (currentUser) {
        // Fetch user role from Firestore
        const userDoc = await getDoc(doc(db, "users", currentUser.uid));
        if (userDoc.exists()) {
          setUserRole(userDoc.data().role);
        }
      } else {
        setUserRole(null);
      }
      setLoading(false);
    });

    return () => unsubscribe();
  }, []);

  if (loading) return <div>Loading...</div>;

  return (
    <Router>
      {user ? (
        <div className="bg-gray-100 min-h-screen">
          <Layout userRole={userRole}>
            <Routes>
              <Route path="/login" element={<Navigate to={userRole === "admin" ? "/admin" : "/dashboard"} />} />
              <Route path="/admin" element={<PrivateRoute requiredRole="admin"><AdminDashboard /></PrivateRoute>} />
              <Route path="/vaccine-appointment" element={<PrivateRoute requiredRole="admin"><VaccineAppointment /></PrivateRoute>} />
              <Route path="/vaccine-record" element={<PrivateRoute requiredRole="admin"><VaccinationRecord /></PrivateRoute>} />
              <Route path="/report-generation" element={<PrivateRoute requiredRole="admin"><ReportGeneration /></PrivateRoute>} />
              <Route path="/remainder-system" element={<PrivateRoute requiredRole="admin"><ReminderSystem /></PrivateRoute>} />
              <Route path="/dashboard" element={<PrivateRoute requiredRole="patient"><PatientDashboard /></PrivateRoute>} />
              <Route path="*" element={<Navigate to={userRole === "admin" ? "/admin" : "/dashboard"} />} />
            </Routes>
          </Layout>
        </div>
      ) : (
        <Routes>
          <Route path="/" element={<LoginPage />} />
          <Route path="*" element={<Navigate to="/" />} />
          <Route path="/register" element={<RegisterPage />} />
        </Routes>
      )}
    </Router>
  );
}

export default App;