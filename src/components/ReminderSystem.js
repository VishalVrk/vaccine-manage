import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, updateDoc, doc, query, where } from "firebase/firestore";
import { db } from "../firebase";

const ReminderSystem = () => {
  const [reminders, setReminders] = useState([]);
  const [newReminder, setNewReminder] = useState({
    patientId: "",
    message: "",
    reminderDate: "",
    reminderType: "appointment"
  });
  const [patients, setPatients] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchReminders();
    fetchPatients();
  }, []);

  const fetchReminders = async () => {
    setIsLoading(true);
    try {
      const reminderSnapshot = await getDocs(collection(db, "reminders"));
      const reminderList = await Promise.all(reminderSnapshot.docs.map(async (doc) => {
        const reminder = {
          id: doc.id,
          ...doc.data()
        };
        
        // Get patient details
        if (reminder.patientId) {
          const patientDoc = await doc(db, "users", reminder.patientId).get();
          if (patientDoc.exists()) {
            reminder.patient = patientDoc.data();
          }
        }
        
        return reminder;
      }));
      
      setReminders(reminderList);
    } catch (error) {
      console.error("Error fetching reminders:", error);
      showMessage("Failed to load reminders", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchPatients = async () => {
    try {
      const usersQuery = query(collection(db, "users"), where("role", "==", "patient"));
      const querySnapshot = await getDocs(usersQuery);
      const patientsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setPatients(patientsList);
    } catch (error) {
      console.error("Error fetching patients:", error);
      showMessage("Failed to load patients list", "error");
    }
  };

  const addReminder = async (e) => {
    e.preventDefault();
    if (!newReminder.patientId || !newReminder.message || !newReminder.reminderDate) {
      showMessage("Please fill all required fields", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      await addDoc(collection(db, "reminders"), {
        patientId: newReminder.patientId,
        message: newReminder.message,
        reminderDate: newReminder.reminderDate,
        reminderType: newReminder.reminderType,
        status: "scheduled",
        createdAt: new Date().toISOString()
      });
      
      setNewReminder({
        patientId: "",
        message: "",
        reminderDate: "",
        reminderType: "appointment"
      });
      
      showMessage("Reminder added successfully", "success");
      fetchReminders();
    } catch (error) {
      console.error("Error adding reminder:", error);
      showMessage("Failed to add reminder", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const markAsSent = async (reminderId) => {
    setIsLoading(true);
    try {
      await updateDoc(doc(db, "reminders", reminderId), {
        status: "sent",
        sentAt: new Date().toISOString()
      });
      
      showMessage("Reminder marked as sent", "success");
      fetchReminders();
    } catch (error) {
      console.error("Error updating reminder:", error);
      showMessage("Failed to update reminder status", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const formatDate = (dateString) => {
    return new Date(dateString).toLocaleString();
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Reminder System</h1>
      
      {message.text && (
        <div className={`p-4 mb-6 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Add Reminder Form */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Schedule New Reminder</h2>
          <form onSubmit={addReminder}>
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Patient</label>
              <select
                className="w-full p-2 border rounded"
                value={newReminder.patientId}
                onChange={(e) => setNewReminder({...newReminder, patientId: e.target.value})}
                required
              >
                <option value="">Select a patient</option>
                {patients.map(patient => (
                  <option key={patient.id} value={patient.id}>
                    {patient.name || patient.email}
                  </option>
                ))}
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Reminder Type</label>
              <select
                className="w-full p-2 border rounded"
                value={newReminder.reminderType}
                onChange={(e) => setNewReminder({...newReminder, reminderType: e.target.value})}
              >
                <option value="appointment">Appointment</option>
                <option value="followup">Follow-up Dose</option>
                <option value="general">General</option>
              </select>
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Message</label>
              <textarea
                className="w-full p-2 border rounded"
                value={newReminder.message}
                onChange={(e) => setNewReminder({...newReminder, message: e.target.value})}
                required
              />
            </div>
            
            <div className="mb-4">
              <label className="block text-gray-700 mb-2">Date & Time</label>
              <input
                type="datetime-local"
                className="w-full p-2 border rounded"
                value={newReminder.reminderDate}
                onChange={(e) => setNewReminder({...newReminder, reminderDate: e.target.value})}
                required
                min={new Date().toISOString().split('.')[0]}
              />
            </div>
            
            <button
              type="submit"
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
              disabled={isLoading}
            >
              {isLoading ? "Scheduling..." : "Schedule Reminder"}
            </button>
          </form>
        </div>
        
        {/* Reminders List */}
        <div className="bg-white p-6 rounded-lg shadow-md">
          <h2 className="text-xl font-semibold mb-4">Scheduled Reminders</h2>
          {isLoading ? (
            <p className="text-gray-500">Loading reminders...</p>
          ) : reminders.length === 0 ? (
            <p className="text-gray-500">No reminders scheduled</p>
          ) : (
            <div className="space-y-4 max-h-96 overflow-y-auto">
              {reminders.map(reminder => {
                const isPast = new Date(reminder.reminderDate) < new Date();
                const isSent = reminder.status === "sent";
                
                return (
                  <div 
                    key={reminder.id} 
                    className={`border p-4 rounded-lg ${isPast && !isSent ? "bg-yellow-50" : "bg-white"}`}
                  >
                    <div className="flex justify-between">
                      <div>
                        <span className={`text-xs px-2 py-1 rounded ${
                          reminder.status === "scheduled" ? "bg-blue-100 text-blue-800" : 
                          reminder.status === "sent" ? "bg-green-100 text-green-800" : 
                          "bg-gray-100 text-gray-800"
                        }`}>
                          {reminder.status}
                        </span>
                        <span className="text-xs ml-2 px-2 py-1 rounded bg-gray-100 text-gray-800">
                          {reminder.reminderType}
                        </span>
                      </div>
                      <p className="text-sm font-medium">
                        {formatDate(reminder.reminderDate)}
                      </p>
                    </div>
                    
                    <p className="mt-2 text-gray-700">{reminder.message}</p>
                    <p className="mt-1 text-sm text-gray-500">
                      Patient: {reminder.patient?.name || reminder.patient?.email || "Unknown"}
                    </p>
                    
                    {reminder.status === "scheduled" && (
                      <button
                        onClick={() => markAsSent(reminder.id)}
                        className="mt-2 text-sm bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600"
                      >
                        Mark as Sent
                      </button>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default ReminderSystem;