import React, { useState, useEffect } from "react";
import { collection, getDocs, addDoc, query, where, getDoc, doc, updateDoc, deleteDoc } from "firebase/firestore";
import { db, auth } from "../firebase";

const PatientDashboard = () => {
  const [vaccines, setVaccines] = useState([]);
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedVaccine, setSelectedVaccine] = useState("");
  const [selectedDate, setSelectedDate] = useState("");
  const [myAppointments, setMyAppointments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  const currentUser = auth.currentUser;

  useEffect(() => {
    fetchVaccines();
    fetchMyAppointments();
  }, []);

  useEffect(() => {
    if (selectedVaccine || selectedDate) {
      fetchAvailableSlots();
    }
  }, [selectedVaccine, selectedDate]);

  const fetchVaccines = async () => {
    try {
      const vaccinesCollection = collection(db, "vaccines");
      const vaccineSnapshot = await getDocs(vaccinesCollection);
      const vaccinesList = vaccineSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVaccines(vaccinesList);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      showMessage("Failed to load vaccines.", "error");
    }
  };

  const fetchAvailableSlots = async () => {
    setIsLoading(true);
    try {
      let q = collection(db, "slots");
      
      if (selectedVaccine && selectedDate) {
        q = query(q, where("vaccineId", "==", selectedVaccine), where("date", "==", selectedDate));
      } else if (selectedVaccine) {
        q = query(q, where("vaccineId", "==", selectedVaccine));
      } else if (selectedDate) {
        q = query(q, where("date", "==", selectedDate));
      }
      
      const slotSnapshot = await getDocs(q);
      const slots = slotSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      })).filter(slot => {
        // Only show slots that have available appointments
        return (slot.bookedCount || 0) < slot.maxAppointments;
      });
      
      // Get vaccine details for each slot
      const slotsWithVaccineDetails = await Promise.all(slots.map(async (slot) => {
        if (slot.vaccineId) {
          const vaccineDoc = await getDoc(doc(db, "vaccines", slot.vaccineId));
          if (vaccineDoc.exists()) {
            return {
              ...slot,
              vaccine: vaccineDoc.data()
            };
          }
        }
        return slot;
      }));
      
      setAvailableSlots(slotsWithVaccineDetails);
    } catch (error) {
      console.error("Error fetching available slots:", error);
      showMessage("Failed to load available slots.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const fetchMyAppointments = async () => {
    if (!currentUser) return;
    
    setIsLoading(true);
    try {
      const q = query(collection(db, "appointments"), where("userId", "==", currentUser.uid));
      const appointmentSnapshot = await getDocs(q);
      
      const appointmentsWithDetails = await Promise.all(appointmentSnapshot.docs.map(async (appointmentDoc) => {
        const appointment = {
          id: appointmentDoc.id,
          ...appointmentDoc.data()
        };
        
        // Get slot details
        if (appointment.slotId) {
          const slotRef = doc(db, "slots", appointment.slotId);
          const slotSnap = await getDoc(slotRef);
          if (slotSnap.exists()) {
            appointment.slot = slotSnap.data();
            
            // Get vaccine details
            if (appointment.slot.vaccineId) {
              const vaccineRef = doc(db, "vaccines", appointment.slot.vaccineId);
              const vaccineSnap = await getDoc(vaccineRef);
              if (vaccineSnap.exists()) {
                appointment.vaccine = vaccineSnap.data();
              }
            }
          }
        }
        
        return appointment;
      }));
      
      setMyAppointments(appointmentsWithDetails);
    } catch (error) {
      console.error("Error fetching my appointments:", error);
      showMessage("Failed to load your appointments.", "error");
    } finally {
      setIsLoading(false);
    }
  };
  

  const bookAppointment = async (slotId) => {
    if (!currentUser) {
      showMessage("You need to be logged in to book an appointment.", "error");
      return;
    }
    
    setIsLoading(true);
    try {
      // Check if user already has an appointment for this slot
      const existingQuery = query(
        collection(db, "appointments"), 
        where("userId", "==", currentUser.uid),
        where("slotId", "==", slotId)
      );
      const existingSnapshot = await getDocs(existingQuery);
      
      if (!existingSnapshot.empty) {
        showMessage("You already have an appointment for this time slot.", "error");
        return;
      }
      
      // Get slot details
      const slotRef = doc(db, "slots", slotId);
      const slotSnap = await getDoc(slotRef);
      
      if (!slotSnap.exists()) {
        showMessage("This slot is no longer available.", "error");
        return;
      }
      
      const slotData = slotSnap.data();
      const currentBookedCount = slotData.bookedCount || 0;
      
      // Check if slot is full
      if (currentBookedCount >= slotData.maxAppointments) {
        showMessage("This slot is now fully booked.", "error");
        return;
      }
      
      // Create appointment
      await addDoc(collection(db, "appointments"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        slotId: slotId,
        vaccineId: slotData.vaccineId,
        bookedAt: new Date().toISOString(),
        status: "scheduled"
      });
      
      // Update slot booking count
      await updateDoc(slotRef, {
        bookedCount: currentBookedCount + 1
      });
      
      showMessage("Appointment booked successfully!", "success");
      fetchMyAppointments();
      fetchAvailableSlots();
    } catch (error) {
      console.error("Error booking appointment:", error);
      showMessage("Failed to book appointment.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const cancelAppointment = async (appointmentId, slotId) => {
    if (!window.confirm("Are you sure you want to cancel this appointment?")) {
      return;
    }
    
    setIsLoading(true);
    try {
      // Delete appointment
      await deleteDoc(doc(db, "appointments", appointmentId));
      
      // Update slot booking count
      const slotRef = doc(db, "slots", slotId);
      const slotSnap = await getDoc(slotRef);
      
      if (slotSnap.exists()) {
        const slotData = slotSnap.data();
        const currentBookedCount = slotData.bookedCount || 0;
        
        await updateDoc(slotRef, {
          bookedCount: Math.max(0, currentBookedCount - 1)
        });
      }
      
      showMessage("Appointment cancelled successfully!", "success");
      fetchMyAppointments();
      fetchAvailableSlots();
    } catch (error) {
      console.error("Error cancelling appointment:", error);
      showMessage("Failed to cancel appointment.", "error");
    } finally {
      setIsLoading(false);
    }
  };

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const clearFilters = () => {
    setSelectedVaccine("");
    setSelectedDate("");
  };

  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Patient Dashboard</h1>
      
      {message.text && (
        <div className={`p-4 mb-6 rounded ${message.type === "success" ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"}`}>
          {message.text}
        </div>
      )}
      
      {/* My Appointments */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <h2 className="text-xl font-semibold mb-4">My Appointments</h2>
        {myAppointments.length === 0 ? (
          <p className="text-gray-500">You don't have any appointments scheduled.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="min-w-full bg-white">
              <thead>
                <tr className="bg-gray-100">
                  <th className="py-2 px-4 text-left">Date</th>
                  <th className="py-2 px-4 text-left">Time</th>
                  <th className="py-2 px-4 text-left">Vaccine</th>
                  <th className="py-2 px-4 text-left">Status</th>
                  <th className="py-2 px-4 text-left">Actions</th>
                </tr>
              </thead>
              <tbody>
                {myAppointments.map(appointment => (
                  <tr key={appointment.id} className="border-t">
                    <td className="py-2 px-4">{appointment.slot?.date || "Unknown"}</td>
                    <td className="py-2 px-4">
                      {appointment.slot ? `${appointment.slot.startTime} - ${appointment.slot.endTime}` : "Unknown"}
                    </td>
                    <td className="py-2 px-4">{appointment.vaccine?.name || "Unknown"}</td>
                    <td className="py-2 px-4">
                      <span className="px-2 py-1 rounded bg-green-100 text-green-800">
                        {appointment.status || "Scheduled"}
                      </span>
                    </td>
                    <td className="py-2 px-4">
                      <button
                        onClick={() => cancelAppointment(appointment.id, appointment.slotId)}
                        className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                        disabled={isLoading}
                      >
                        Cancel
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
      
      {/* Book New Appointment */}
      <div className="bg-white p-6 rounded-lg shadow-md">
        <h2 className="text-xl font-semibold mb-4">Book New Appointment</h2>
        
        {/* Filters */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
          <div>
            <label className="block text-gray-700 mb-2">Filter by Vaccine</label>
            <select
              className="w-full p-2 border rounded"
              value={selectedVaccine}
              onChange={(e) => setSelectedVaccine(e.target.value)}
            >
              <option value="">All Vaccines</option>
              {vaccines.map(vaccine => (
                <option key={vaccine.id} value={vaccine.id}>{vaccine.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-gray-700 mb-2">Filter by Date</label>
            <input
              type="date"
              className="w-full p-2 border rounded"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              min={new Date().toISOString().split('T')[0]}
            />
          </div>
          <div className="flex items-end">
            <button
              onClick={clearFilters}
              className="bg-gray-500 text-white px-4 py-2 rounded hover:bg-gray-600"
            >
              Clear Filters
            </button>
          </div>
        </div>
        
        {/* Available Slots */}
        <h3 className="text-lg font-medium mb-3">Available Slots</h3>
        {isLoading ? (
          <p className="text-gray-500">Loading available slots...</p>
        ) : availableSlots.length === 0 ? (
          <p className="text-gray-500">No available slots match your criteria.</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {availableSlots.map(slot => {
              const availableCount = slot.maxAppointments - (slot.bookedCount || 0);
              
              return (
                <div key={slot.id} className="border rounded-lg p-4 hover:shadow-md">
                  <div className="font-medium">{slot.vaccine?.name || "Unknown Vaccine"}</div>
                  <div className="text-gray-600 mb-2">{slot.date}, {slot.startTime} - {slot.endTime}</div>
                  <div className="text-sm text-gray-500 mb-4">
                    {availableCount} of {slot.maxAppointments} slots available
                  </div>
                  <div className="text-sm text-gray-700 mb-3">
                    {slot.vaccine?.description || "No description available"}
                  </div>
                  <button
                    onClick={() => bookAppointment(slot.id)}
                    className="w-full bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
                    disabled={isLoading}
                  >
                    Book Appointment
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default PatientDashboard;