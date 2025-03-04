import React, { useState, useRef } from 'react';
import QrScanner from 'qr-scanner';
import { 
  doc, 
  getDoc, 
  updateDoc, 
} from 'firebase/firestore';
import { db } from '../firebase';

const AppointmentStatusUpdate = () => {
  const [scannedData, setScannedData] = useState(null);
  const [appointmentDetails, setAppointmentDetails] = useState(null);
  const [newStatus, setNewStatus] = useState('');
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [scannerActive, setScannerActive] = useState(false);
  const videoRef = useRef(null);
  const scannerRef = useRef(null);

  // Status options for healthcare providers
  const statusOptions = [
    'Scheduled',
    'In Progress',
    'Completed',
    'Missed',
    'Cancelled by Provider'
  ];

  // Start QR code scanner
  const startScanner = () => {
    if (videoRef.current) {
      scannerRef.current = new QrScanner(
        videoRef.current,
        (result) => handleScan(result.data),
        {
          onDecodeError: (error) => {
            console.log(error);
            setError('Failed to scan QR code');
          },
          highlightScanRegion: true,
          highlightCodeOutline: true,
        }
      );

      scannerRef.current.start();
      setScannerActive(true);
    }
  };

  // Stop QR code scanner
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setScannerActive(false);
    }
  };

  // Handle scanned QR code data
  const handleScan = async (data) => {
    try {
      const parsedData = JSON.parse(data);
      
      // Validate scanned data
      if (!parsedData.appointmentId) {
        setError('Invalid QR code');
        return;
      }

      setIsLoading(true);
      // Fetch appointment details
      const appointmentRef = doc(db, 'appointments', parsedData.appointmentId);
      const appointmentSnap = await getDoc(appointmentRef);

      if (appointmentSnap.exists()) {
        const appointmentData = {
          id: appointmentSnap.id,
          ...appointmentSnap.data()
        };

        // Fetch additional details
        if (appointmentData.slotId) {
          const slotRef = doc(db, 'slots', appointmentData.slotId);
          const slotSnap = await getDoc(slotRef);
          if (slotSnap.exists()) {
            appointmentData.slot = slotSnap.data();
            
            if (appointmentData.slot.vaccineId) {
              const vaccineRef = doc(db, 'vaccines', appointmentData.slot.vaccineId);
              const vaccineSnap = await getDoc(vaccineRef);
              if (vaccineSnap.exists()) {
                appointmentData.vaccine = vaccineSnap.data();
              }
            }
          }
        }

        setScannedData(parsedData);
        setAppointmentDetails(appointmentData);
        stopScanner();
      } else {
        setError('Appointment not found');
      }
    } catch (err) {
      console.error('Error processing QR code:', err);
      setError('Invalid QR code format');
    } finally {
      setIsLoading(false);
    }
  };

  // Update appointment status
  const updateAppointmentStatus = async () => {
    if (!appointmentDetails || !newStatus) {
      setError('Please select a new status');
      return;
    }

    try {
      setIsLoading(true);
      const appointmentRef = doc(db, 'appointments', appointmentDetails.id);
      
      await updateDoc(appointmentRef, {
        status: newStatus,
        updatedAt: new Date().toISOString()
      });

      // Reset state
      setScannedData(null);
      setAppointmentDetails(null);
      setNewStatus('');
      setError('');
    } catch (err) {
      console.error('Error updating appointment:', err);
      setError('Failed to update appointment status');
    } finally {
      setIsLoading(false);
    }
  };

  // Reset scanning process
  const resetScanner = () => {
    setScannedData(null);
    setAppointmentDetails(null);
    setNewStatus('');
    setError('');
    startScanner();
  };

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-2xl font-bold mb-6">Appointment Status Update</h1>

      {/* Error Message */}
      {error && (
        <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded relative mb-4">
          {error}
        </div>
      )}

      {/* QR Code Scanner */}
      {!scannedData && (
        <div className="mb-6">
          <video 
            ref={videoRef} 
            className="w-full max-w-md mx-auto border-2 border-gray-300 rounded"
          />
          {!scannerActive ? (
            <button 
              onClick={startScanner}
              className="mt-4 w-full max-w-md mx-auto bg-blue-500 text-white py-2 rounded hover:bg-blue-600"
            >
              Start QR Scanner
            </button>
          ) : (
            <button 
              onClick={stopScanner}
              className="mt-4 w-full max-w-md mx-auto bg-red-500 text-white py-2 rounded hover:bg-red-600"
            >
              Stop Scanner
            </button>
          )}
        </div>
      )}

      {/* Appointment Details */}
      {appointmentDetails && (
        <div className="bg-white shadow-md rounded-lg p-6">
          <h2 className="text-xl font-semibold mb-4">Appointment Details</h2>
          <div className="grid grid-cols-2 gap-4">
            <div>
              <strong>Patient Email:</strong> {appointmentDetails.userEmail}
            </div>
            <div>
              <strong>Vaccine:</strong> {appointmentDetails.vaccine?.name || 'Unknown'}
            </div>
            <div>
              <strong>Date:</strong> {appointmentDetails.slot?.date || 'Unknown'}
            </div>
            <div>
              <strong>Time:</strong> 
              {appointmentDetails.slot 
                ? `${appointmentDetails.slot.startTime} - ${appointmentDetails.slot.endTime}` 
                : 'Unknown'}
            </div>
            <div>
              <strong>Current Status:</strong> {appointmentDetails.status || 'Scheduled'}
            </div>
          </div>

          {/* Status Update Dropdown */}
          <div className="mt-6">
            <label className="block text-gray-700 mb-2">
              Update Appointment Status
            </label>
            <select
              value={newStatus}
              onChange={(e) => setNewStatus(e.target.value)}
              className="w-full p-2 border rounded"
            >
              <option value="">Select New Status</option>
              {statusOptions.map((status) => (
                <option key={status} value={status}>
                  {status}
                </option>
              ))}
            </select>
          </div>

          {/* Action Buttons */}
          <div className="mt-6 flex space-x-4">
            <button
              onClick={updateAppointmentStatus}
              disabled={!newStatus || isLoading}
              className="flex-1 bg-green-500 text-white py-2 rounded hover:bg-green-600 disabled:opacity-50"
            >
              Update Status
            </button>
            <button
              onClick={resetScanner}
              className="flex-1 bg-gray-500 text-white py-2 rounded hover:bg-gray-600"
            >
              Scan Another
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default AppointmentStatusUpdate;