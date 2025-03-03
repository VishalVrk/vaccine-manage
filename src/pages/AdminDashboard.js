import React, { useEffect, useState } from "react";
import { db, auth } from "../firebase";
import { collection, getDocs, updateDoc, doc } from "firebase/firestore";
import { signOut } from "firebase/auth";
import { useNavigate } from "react-router-dom";
import { Calendar, Clock, Activity, Users, CheckCircle, Syringe, Package, BarChart } from 'lucide-react';

const AdminDashboard = () => {
  const [users, setUsers] = useState([]);
  const [appointments, setAppointments] = useState([]);
  const [slots, setSlots] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [analytics, setAnalytics] = useState({
    totalAppointments: 0,
    scheduledAppointments: 0,
    availableSlots: 0,
    bookedSlots: 0,
    totalVaccinesDoses: 0
  });
  const navigate = useNavigate();

  useEffect(() => {
    const fetchData = async () => {
      // Fetch users
      const usersSnapshot = await getDocs(collection(db, "users"));
      const usersData = usersSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setUsers(usersData);

      // Fetch appointments
      const appointmentsSnapshot = await getDocs(collection(db, "appointments"));
      const appointmentsData = appointmentsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAppointments(appointmentsData);

      // Fetch slots
      const slotsSnapshot = await getDocs(collection(db, "slots"));
      const slotsData = slotsSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setSlots(slotsData);

      // Fetch vaccines
      const vaccinesSnapshot = await getDocs(collection(db, "vaccines"));
      const vaccinesData = vaccinesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setVaccines(vaccinesData);

      // Calculate analytics
      const scheduledAppointments = appointmentsData.filter(app => app.status === "scheduled").length;
      const totalSlots = slotsData.reduce((sum, slot) => sum + slot.maxAppointments, 0);
      const bookedSlots = slotsData.reduce((sum, slot) => sum + (slot.bookedCount || 0), 0);
      const totalDoses = vaccinesData.reduce((sum, vaccine) => sum + vaccine.availableDoses, 0);

      setAnalytics({
        totalAppointments: appointmentsData.length,
        scheduledAppointments: scheduledAppointments,
        availableSlots: totalSlots - bookedSlots,
        bookedSlots: bookedSlots,
        totalVaccinesDoses: totalDoses
      });
    };

    fetchData();
  }, []);

  const updateRole = async (userId, newRole) => {
    await updateDoc(doc(db, "users", userId), { role: newRole });
    setUsers(users.map(user => (user.id === userId ? { ...user, role: newRole } : user)));
  };

  const getTodaysAppointments = () => {
    const today = new Date().toISOString().split('T')[0];
    return appointments.filter(app => app.bookedAt && app.bookedAt.startsWith(today)).length;
  };

  const getSlotUtilization = () => {
    if (slots.length === 0) return "0%";
    const utilization = (analytics.bookedSlots / (analytics.bookedSlots + analytics.availableSlots)) * 100;
    return `${utilization.toFixed(1)}%`;
  };

  const handleLogout = async () => {
    await signOut(auth);
    navigate("/login");
  };

  return (
    <div className="p-6">
      <div className="flex justify-between items-center">
        <h1 className="text-2xl font-bold">Admin Dashboard</h1>
        <button onClick={handleLogout} className="bg-red-500 text-white py-2 px-4 rounded">Logout</button>
      </div>
      
      {/* Analytics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-6">
      {/* Appointments Tile */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-blue-500 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-blue-800 text-lg">Appointments</h3>
          <Calendar className="text-blue-500" size={24} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-700">{analytics.totalAppointments}</p>
            <div className="flex items-center justify-center mt-1">
              <Users size={16} className="text-blue-500 mr-1" />
              <p className="text-xs text-blue-700">Total</p>
            </div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-700">{analytics.scheduledAppointments}</p>
            <div className="flex items-center justify-center mt-1">
              <CheckCircle size={16} className="text-blue-500 mr-1" />
              <p className="text-xs text-blue-700">Scheduled</p>
            </div>
          </div>
          <div className="text-center p-2 bg-blue-50 rounded">
            <p className="text-2xl font-bold text-blue-700">{getTodaysAppointments()}</p>
            <div className="flex items-center justify-center mt-1">
              <Clock size={16} className="text-blue-500 mr-1" />
              <p className="text-xs text-blue-700">Today</p>
            </div>
          </div>
        </div>
      </div>

      {/* Slot Availability Tile */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-green-500 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-green-800 text-lg">Slot Availability</h3>
          <Clock className="text-green-500" size={24} />
        </div>
        <div className="grid grid-cols-3 gap-2">
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-700">{analytics.availableSlots}</p>
            <div className="flex items-center justify-center mt-1">
              <CheckCircle size={16} className="text-green-500 mr-1" />
              <p className="text-xs text-green-700">Available</p>
            </div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-700">{analytics.bookedSlots}</p>
            <div className="flex items-center justify-center mt-1">
              <Calendar size={16} className="text-green-500 mr-1" />
              <p className="text-xs text-green-700">Booked</p>
            </div>
          </div>
          <div className="text-center p-2 bg-green-50 rounded">
            <p className="text-2xl font-bold text-green-700">{getSlotUtilization()}</p>
            <div className="flex items-center justify-center mt-1">
              <Activity size={16} className="text-green-500 mr-1" />
              <p className="text-xs text-green-700">Utilization</p>
            </div>
          </div>
        </div>
      </div>

      {/* Vaccine Inventory Tile */}
      <div className="bg-white p-6 rounded-lg shadow-md border-l-4 border-purple-500 hover:shadow-lg transition-shadow">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-bold text-purple-800 text-lg">Vaccine Inventory</h3>
          <Syringe className="text-purple-500" size={24} />
        </div>
        <div className="grid grid-cols-2 gap-2">
          <div className="text-center p-2 bg-purple-50 rounded">
            <p className="text-2xl font-bold text-purple-700">{vaccines.length}</p>
            <div className="flex items-center justify-center mt-1">
              <Package size={16} className="text-purple-500 mr-1" />
              <p className="text-xs text-purple-700">Types</p>
            </div>
          </div>
          <div className="text-center p-2 bg-purple-50 rounded">
            <p className="text-2xl font-bold text-purple-700">{analytics.totalVaccinesDoses}</p>
            <div className="flex items-center justify-center mt-1">
              <BarChart size={16} className="text-purple-500 mr-1" />
              <p className="text-xs text-purple-700">Available Doses</p>
            </div>
          </div>
        </div>
      </div>
    </div>
      
      {/* User Management */}
      <h2 className="mt-8 text-2xl font-bold text-gray-800">User Management</h2>
<div className="bg-white rounded-lg shadow-md mt-6 overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Role</th>
        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {users.map(user => (
        <tr key={user.id} className="hover:bg-gray-50 transition-colors">
          <td className="py-4 px-6 text-sm text-gray-900">{user.email}</td>
          <td className="py-4 px-6 text-sm text-gray-900">{user.role || "user"}</td>
          <td className="py-4 px-6 text-sm">
            {user.role !== "admin" && (
              <button 
                onClick={() => updateRole(user.id, "admin")} 
                className="bg-blue-500 hover:bg-blue-600 text-white py-2 px-4 rounded-md transition-colors"
              >
                Make Admin
              </button>
            )}
            {user.role === "admin" && (
              <button 
                onClick={() => updateRole(user.id, "user")} 
                className="bg-gray-500 hover:bg-gray-600 text-white py-2 px-4 rounded-md transition-colors"
              >
                Remove Admin
              </button>
            )}
          </td>
        </tr>
      ))}
    </tbody>
  </table>
</div>
      
      {/* Recent Appointments */}
      <h2 className="mt-8 text-2xl font-bold text-gray-800">Recent Appointments</h2>
<div className="bg-white rounded-lg shadow-md mt-6 overflow-hidden">
  <table className="min-w-full divide-y divide-gray-200">
    <thead className="bg-gray-50">
      <tr>
        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">User</th>
        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
        <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
      </tr>
    </thead>
    <tbody className="bg-white divide-y divide-gray-200">
      {appointments.slice(0, 5).map(appointment => {
        // Find the associated slot
        const slot = slots.find(s => s.id === appointment.slotId);
        return (
          <tr key={appointment.id} className="hover:bg-gray-50 transition-colors">
            <td className="py-4 px-6 text-sm text-gray-900">{appointment.userEmail}</td>
            <td className="py-4 px-6 text-sm text-gray-900">{slot?.date || "N/A"}</td>
            <td className="py-4 px-6 text-sm text-gray-900">
              {slot ? `${slot.startTime} - ${slot.endTime}` : "N/A"}
            </td>
            <td className="py-4 px-6 text-sm">
              <span className={`px-2 py-1 rounded-md text-xs font-medium ${
                appointment.status === "scheduled" ? "bg-green-100 text-green-800" : 
                appointment.status === "cancelled" ? "bg-red-100 text-red-800" : 
                "bg-yellow-100 text-yellow-800"
              }`}>
                {appointment.status}
              </span>
            </td>
          </tr>
        );
      })}
    </tbody>
  </table>
</div>
    </div>
  );
};

export default AdminDashboard;