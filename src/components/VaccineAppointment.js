import React, { useState, useEffect } from "react";
import { collection, addDoc, getDocs, updateDoc, doc, deleteDoc } from "firebase/firestore";
import { db } from "../firebase";

const VaccineAppointment = () => {
  const [vaccines, setVaccines] = useState([]);
  const [newVaccine, setNewVaccine] = useState({
    name: "",
    description: "",
    availableDoses: 0
  });
  const [slots, setSlots] = useState([]);
  const [newSlot, setNewSlot] = useState({
    date: "",
    startTime: "",
    endTime: "",
    vaccineId: "",
    maxAppointments: 10,
    bookedCount: 0
  });
  const [editingSlot, setEditingSlot] = useState(null);
  const [isLoading, setIsLoading] = useState(false);

  // Fetch vaccines and slots
  useEffect(() => {
    fetchVaccines();
    fetchSlots();
  }, []);

  const fetchVaccines = async () => {
    try {
      const vaccineCollection = collection(db, "vaccines");
      const vaccineSnapshot = await getDocs(vaccineCollection);
      const vaccineList = vaccineSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setVaccines(vaccineList);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
    }
  };

  const fetchSlots = async () => {
    try {
      const slotCollection = collection(db, "slots");
      const slotSnapshot = await getDocs(slotCollection);
      const slotList = slotSnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
      setSlots(slotList);
    } catch (error) {
      console.error("Error fetching slots:", error);
    }
  };

  // Add new vaccine
  const handleAddVaccine = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    
    try {
      await addDoc(collection(db, "vaccines"), newVaccine);
      setNewVaccine({ name: "", description: "", availableDoses: 0 });
      fetchVaccines();
    } catch (error) {
      console.error("Error adding vaccine:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Add new time slot
  const handleAddSlot = async (e) => {
    e.preventDefault();
    setIsLoading(true);

    try {
      if (editingSlot) {
        // Update existing slot
        await updateDoc(doc(db, "slots", editingSlot), {
          ...newSlot,
          availableDoses: parseInt(newSlot.maxAppointments)
        });
        setEditingSlot(null);
      } else {
        // Add new slot
        await addDoc(collection(db, "slots"), {
          ...newSlot,
          availableDoses: parseInt(newSlot.maxAppointments)
        });
      }
      setNewSlot({
        date: "",
        startTime: "",
        endTime: "",
        vaccineId: "",
        maxAppointments: 10,
        bookedCount: 0
      });
      fetchSlots();
    } catch (error) {
      console.error("Error managing slot:", error);
    } finally {
      setIsLoading(false);
    }
  };

  // Delete a slot
  const handleDeleteSlot = async (slotId) => {
    if (window.confirm("Are you sure you want to delete this slot?")) {
      setIsLoading(true);
      try {
        await deleteDoc(doc(db, "slots", slotId));
        fetchSlots();
      } catch (error) {
        console.error("Error deleting slot:", error);
      } finally {
        setIsLoading(false);
      }
    }
  };

  // Edit a slot
  const handleEditSlot = (slot) => {
    setNewSlot({
      date: slot.date,
      startTime: slot.startTime,
      endTime: slot.endTime,
      vaccineId: slot.vaccineId,
      maxAppointments: slot.maxAppointments,
      bookedCount: slot.bookedCount || 0
    });
    setEditingSlot(slot.id);
  };

  return (
    <div className="p-6">
  <h1 className="text-2xl font-bold text-gray-800 mb-6">Vaccine Appointment Management</h1>
  
  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
    {/* Add Vaccine Form */}
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">Add New Vaccine</h2>
      <form onSubmit={handleAddVaccine}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Vaccine Name</label>
          <input
            type="text"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={newVaccine.name}
            onChange={(e) => setNewVaccine({...newVaccine, name: e.target.value})}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Description</label>
          <textarea
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={newVaccine.description}
            onChange={(e) => setNewVaccine({...newVaccine, description: e.target.value})}
            required
          />
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Available Doses</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={newVaccine.availableDoses}
            onChange={(e) => setNewVaccine({...newVaccine, availableDoses: parseInt(e.target.value)})}
            required
            min="0"
          />
        </div>
        <button
          type="submit"
          className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
          disabled={isLoading}
        >
          {isLoading ? "Adding..." : "Add Vaccine"}
        </button>
      </form>
    </div>

    {/* Add Time Slot Form */}
    <div className="bg-white p-6 rounded-lg shadow-md">
      <h2 className="text-xl font-semibold text-gray-800 mb-4">
        {editingSlot ? "Edit Time Slot" : "Add New Time Slot"}
      </h2>
      <form onSubmit={handleAddSlot}>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Vaccine</label>
          <select
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={newSlot.vaccineId}
            onChange={(e) => setNewSlot({...newSlot, vaccineId: e.target.value})}
            required
          >
            <option value="">Select a vaccine</option>
            {vaccines.map(vaccine => (
              <option key={vaccine.id} value={vaccine.id}>
                {vaccine.name} ({vaccine.availableDoses} doses available)
              </option>
            ))}
          </select>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Date</label>
          <input
            type="date"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={newSlot.date}
            onChange={(e) => setNewSlot({...newSlot, date: e.target.value})}
            required
            min={new Date().toISOString().split('T')[0]}
          />
        </div>
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Start Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={newSlot.startTime}
              onChange={(e) => setNewSlot({...newSlot, startTime: e.target.value})}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">End Time</label>
            <input
              type="time"
              className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
              value={newSlot.endTime}
              onChange={(e) => setNewSlot({...newSlot, endTime: e.target.value})}
              required
            />
          </div>
        </div>
        <div className="mb-4">
          <label className="block text-sm font-medium text-gray-700 mb-2">Maximum Appointments</label>
          <input
            type="number"
            className="w-full p-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-colors"
            value={newSlot.maxAppointments}
            onChange={(e) => setNewSlot({...newSlot, maxAppointments: parseInt(e.target.value)})}
            required
            min="1"
          />
        </div>
        <div className="flex space-x-2">
          <button
            type="submit"
            className="bg-blue-500 text-white px-4 py-2 rounded-md hover:bg-blue-600 transition-colors"
            disabled={isLoading}
          >
            {isLoading ? "Saving..." : (editingSlot ? "Update Slot" : "Add Slot")}
          </button>
          {editingSlot && (
            <button
              type="button"
              className="bg-gray-500 text-white px-4 py-2 rounded-md hover:bg-gray-600 transition-colors"
              onClick={() => {
                setEditingSlot(null);
                setNewSlot({
                  date: "",
                  startTime: "",
                  endTime: "",
                  vaccineId: "",
                  maxAppointments: 10,
                  bookedCount: 0
                });
              }}
            >
              Cancel
            </button>
          )}
        </div>
      </form>
    </div>
  </div>

  {/* Available Slots List */}
  <div className="mt-8 bg-white p-6 rounded-lg shadow-md">
    <h2 className="text-xl font-semibold text-gray-800 mb-4">Available Time Slots</h2>
    {slots.length === 0 ? (
      <p className="text-gray-500">No time slots available.</p>
    ) : (
      <div className="overflow-x-auto">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Date</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Time</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vaccine</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Available/Total</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {slots.map(slot => {
              const vaccine = vaccines.find(v => v.id === slot.vaccineId);
              const availableSlots = slot.maxAppointments - (slot.bookedCount || 0);
              
              return (
                <tr key={slot.id} className="hover:bg-gray-50 transition-colors">
                  <td className="py-4 px-6 text-sm text-gray-900">{slot.date}</td>
                  <td className="py-4 px-6 text-sm text-gray-900">{slot.startTime} - {slot.endTime}</td>
                  <td className="py-4 px-6 text-sm text-gray-900">{vaccine ? vaccine.name : 'Unknown'}</td>
                  <td className="py-4 px-6 text-sm text-gray-900">{availableSlots}/{slot.maxAppointments}</td>
                  <td className="py-4 px-6 text-sm">
                    <button
                      onClick={() => handleEditSlot(slot)}
                      className="bg-green-500 text-white px-3 py-1 rounded-md hover:bg-green-600 transition-colors mr-2"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => handleDeleteSlot(slot.id)}
                      className="bg-red-500 text-white px-3 py-1 rounded-md hover:bg-red-600 transition-colors"
                    >
                      Delete
                    </button>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
</div>
  );
};

export default VaccineAppointment;