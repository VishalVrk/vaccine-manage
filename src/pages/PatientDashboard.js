import React, { useState, useEffect } from "react";
import QRCode from 'qrcode';
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
  const [selectedAppointmentQR, setSelectedAppointmentQR] = useState(null);

  const currentUser = auth.currentUser;

  const dataURLtoBlob = (dataURL) => {
    const parts = dataURL.split(';base64,');
    const contentType = parts[0].split(':')[1];
    const raw = window.atob(parts[1]);
    const rawLength = raw.length;
    const uInt8Array = new Uint8Array(rawLength);

    for (let i = 0; i < rawLength; ++i) {
      uInt8Array[i] = raw.charCodeAt(i);
    }

    return new Blob([uInt8Array], { type: contentType });
  };

  // Function to generate QR code
  const generateAppointmentQR = async (appointment) => {
    try {
      // Create a detailed appointment information string
      const qrData = JSON.stringify({
        appointmentId: appointment.id,
        patientEmail: appointment.userEmail,
        vaccine: appointment.vaccine?.name || 'Unknown',
        date: appointment.slot?.date || 'Unknown',
        time: `${appointment.slot?.startTime || 'Unknown'} - ${appointment.slot?.endTime || 'Unknown'}`,
        status: appointment.status || 'Scheduled'
      });

      // Generate QR code as data URL
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2
      });

      return qrCodeDataUrl;
    } catch (error) {
      console.error("Error generating QR code:", error);
      return null;
    }
  };



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

  const generateAppointmentBlob = (appointment) => {
    return new Promise((resolve, reject) => {
      // Create a canvas to draw the appointment details
      const canvas = document.createElement('canvas');
      canvas.width = 400;
      canvas.height = 300;
      const ctx = canvas.getContext('2d');

      // White background
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);

      // Set text styles
      ctx.fillStyle = 'black';
      ctx.font = 'bold 20px Arial';
      ctx.textAlign = 'center';

      // Draw appointment details
      ctx.fillText('Vaccine Appointment', canvas.width / 2, 50);
      ctx.font = '16px Arial';
      ctx.fillText(`Vaccine: ${appointment.vaccine?.name || 'Unknown'}`, canvas.width / 2, 100);
      ctx.fillText(`Date: ${appointment.slot?.date || 'Unknown'}`, canvas.width / 2, 130);
      ctx.fillText(`Time: ${appointment.slot?.startTime || 'Unknown'}`, canvas.width / 2, 160);
      ctx.fillText(`Patient: ${currentUser.email || 'Unknown'}`, canvas.width / 2, 190);

      // Convert canvas to blob
      canvas.toBlob((blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error('Failed to create blob'));
        }
      }, 'image/png');
    });
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
      const appointmentRef = await addDoc(collection(db, "appointments"), {
        userId: currentUser.uid,
        userEmail: currentUser.email,
        slotId: slotId,
        vaccineId: slotData.vaccineId,
        bookedAt: new Date().toISOString(),
        status: "scheduled"
      });
      
      // Generate QR code for the appointment
      const appointmentDoc = await getDoc(appointmentRef);
      const appointmentData = { 
        id: appointmentRef.id, 
        ...appointmentDoc.data() 
      };
      
      // Fetch additional details (slot and vaccine information)
      if (appointmentData.slotId) {
        const slotRef = doc(db, "slots", appointmentData.slotId);
        const slotSnap = await getDoc(slotRef);
        if (slotSnap.exists()) {
          appointmentData.slot = slotSnap.data();
          
          if (appointmentData.slot.vaccineId) {
            const vaccineRef = doc(db, "vaccines", appointmentData.slot.vaccineId);
            const vaccineSnap = await getDoc(vaccineRef);
            if (vaccineSnap.exists()) {
              appointmentData.vaccine = vaccineSnap.data();
            }
          }
        }
      }
      
      // Generate QR code
      const qrData = JSON.stringify({
        appointmentId: appointmentData.id,
        patientEmail: appointmentData.userEmail,
        vaccine: appointmentData.vaccine?.name || 'Unknown',
        date: appointmentData.slot?.date || 'Unknown',
        time: `${appointmentData.slot?.startTime || 'Unknown'} - ${appointmentData.slot?.endTime || 'Unknown'}`,
        status: appointmentData.status || 'Scheduled'
      });
  
      const qrCodeDataUrl = await QRCode.toDataURL(qrData, {
        errorCorrectionLevel: 'H',
        width: 300,
        margin: 2
      });
      
      // Convert QR code to blob
      const qrCodeBlob = dataURLtoBlob(qrCodeDataUrl);
      
      // Convert blob to base64 for Firestore storage
      const reader = new FileReader();
      reader.readAsDataURL(qrCodeBlob);
      reader.onloadend = async () => {
        const base64data = reader.result;
        
        // Update appointment with QR code blob
        await updateDoc(appointmentRef, {
          qrCodeBlob: base64data
        });
      };
      
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

  const viewAppointmentQR = async (appointment) => {
    // If QR code is already stored in the appointment, use that
    if (appointment.qrCodeBlob) {
      setSelectedAppointmentQR(appointment.qrCodeBlob);
      return;
    }

    // Otherwise, generate a new QR code
    try {
      const qrCodeDataUrl = await generateAppointmentQR(appointment);
      setSelectedAppointmentQR(qrCodeDataUrl);
    } catch (error) {
      console.error("Error generating QR code:", error);
      showMessage("Failed to generate QR code.", "error");
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
      <th className="py-2 px-4 text-left">QR Code</th>
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
          <button
            onClick={() => viewAppointmentQR(appointment)}
            className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
          >
            View QR
          </button>
        </td>
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
        {selectedAppointmentQR && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-xl text-center">
            <h2 className="text-xl font-bold mb-4">Appointment QR Code</h2>
            <img 
              src={selectedAppointmentQR} 
              alt="Appointment QR Code" 
              className="mx-auto mb-4"
            />
            <button
              onClick={() => setSelectedAppointmentQR(null)}
              className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600"
            >
              Close
            </button>
          </div>
        </div>
      )}
      </div>
    </div>
  );
};

export default PatientDashboard;