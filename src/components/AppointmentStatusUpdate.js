import React, { useState, useRef, useEffect } from 'react';
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

  // Request camera permissions
  const requestCameraPermission = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      stream.getTracks().forEach(track => track.stop());
      return true;
    } catch (err) {
      setError('Camera access denied. Please allow camera permissions.');
      return false;
    }
  };

  // Start QR code scanner with enhanced error handling
  const startScanner = async () => {
    // Check for camera permissions first
    const hasCameraAccess = await requestCameraPermission();
    if (!hasCameraAccess) return;

    if (videoRef.current) {
      try {
        scannerRef.current = new QrScanner(
          videoRef.current,
          (result) => handleScan(result.data),
          {
            onDecodeError: (error) => {
              console.log('Decode error:', error);
              setError('Failed to scan QR code. Please try again.');
            },
            highlightScanRegion: true,
            highlightCodeOutline: true,
            preferredCamera: 'environment' // Prefer back camera on mobile devices
          }
        );

        await scannerRef.current.start();
        setScannerActive(true);
        setError(''); // Clear any previous errors
      } catch (err) {
        console.error('Scanner start error:', err);
        setError('Could not start camera. Please check device permissions.');
      }
    }
  };

  // Stop QR code scanner
  const stopScanner = () => {
    if (scannerRef.current) {
      scannerRef.current.stop();
      setScannerActive(false);
    }
  };

  // Handle scanned QR code data with improved error handling
  const handleScan = async (data) => {
    try {
      const parsedData = JSON.parse(data);
      
      // Validate scanned data
      if (!parsedData.appointmentId) {
        throw new Error('Invalid QR code');
      }

      setIsLoading(true);
      setError('');

      // Fetch appointment details with concurrent fetching
      const appointmentRef = doc(db, 'appointments', parsedData.appointmentId);
      const appointmentSnap = await getDoc(appointmentRef);

      if (!appointmentSnap.exists()) {
        throw new Error('Appointment not found');
      }

      const appointmentData = {
        id: appointmentSnap.id,
        ...appointmentSnap.data()
      };

      // Fetch additional details with optional chaining and default values
      const slotRef = appointmentData.slotId 
        ? doc(db, 'slots', appointmentData.slotId) 
        : null;
      
      if (slotRef) {
        const slotSnap = await getDoc(slotRef);
        if (slotSnap.exists()) {
          appointmentData.slot = slotSnap.data();
          
          // Fetch vaccine details if available
          const vaccineRef = appointmentData.slot?.vaccineId
            ? doc(db, 'vaccines', appointmentData.slot.vaccineId)
            : null;
          
          if (vaccineRef) {
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
    } catch (err) {
      console.error('Error processing QR code:', err);
      setError(err.message || 'Invalid QR code format');
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

  // Handle component unmount
  useEffect(() => {
    return () => {
      if (scannerRef.current) {
        scannerRef.current.stop();
      }
    };
  }, []);

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
      <div className="sm:mx-auto sm:w-full sm:max-w-md">
        <h1 className="text-center text-3xl font-extrabold text-gray-900">
          Appointment Status Update
        </h1>

        {/* Error Message */}
        {error && (
          <div className="mt-6 bg-red-50 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center">
            {error}
          </div>
        )}

        <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
          <div className="bg-white py-8 px-6 shadow-xl rounded-lg">
            {/* QR Code Scanner */}
            {!scannedData && (
              <div className="space-y-4">
                <video 
                  ref={videoRef} 
                  className="w-full aspect-video border-2 border-gray-300 rounded-lg"
                  placeholder="Scan QR Code"
                />
                {!scannerActive ? (
                  <button 
                    onClick={startScanner}
                    className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                  >
                    Start QR Scanner
                  </button>
                ) : (
                  <button 
                    onClick={stopScanner}
                    className="w-full bg-red-600 text-white py-3 rounded-lg hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                  >
                    Stop Scanner
                  </button>
                )}
              </div>
            )}

            {/* Appointment Details */}
            {appointmentDetails && (
              <div className="space-y-6">
                <div>
                  <h2 className="text-xl font-semibold text-gray-800 mb-4">
                    Appointment Details
                  </h2>
                  <div className="grid grid-cols-2 gap-4 text-gray-700">
                    <div>
                      <strong className="block">Patient Email:</strong> 
                      {appointmentDetails.userEmail || 'N/A'}
                    </div>
                    <div>
                      <strong className="block">Vaccine:</strong> 
                      {appointmentDetails.vaccine?.name || 'Unknown'}
                    </div>
                    <div>
                      <strong className="block">Date:</strong> 
                      {appointmentDetails.slot?.date || 'Unknown'}
                    </div>
                    <div>
                      <strong className="block">Time:</strong> 
                      {appointmentDetails.slot 
                        ? `${appointmentDetails.slot.startTime} - ${appointmentDetails.slot.endTime}` 
                        : 'Unknown'}
                    </div>
                    <div>
                      <strong className="block">Current Status:</strong> 
                      {appointmentDetails.status || 'Scheduled'}
                    </div>
                  </div>
                </div>

                {/* Status Update Dropdown */}
                <div>
                  <label className="block text-gray-700 font-medium mb-2">
                    Update Appointment Status
                  </label>
                  <select
                    value={newStatus}
                    onChange={(e) => setNewStatus(e.target.value)}
                    className="w-full p-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
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
                <div className="flex space-x-4">
                  <button
                    onClick={updateAppointmentStatus}
                    disabled={!newStatus || isLoading}
                    className="flex-1 bg-green-600 text-white py-3 rounded-lg hover:bg-green-700 disabled:opacity-50 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500"
                  >
                    {isLoading ? 'Updating...' : 'Update Status'}
                  </button>
                  <button
                    onClick={resetScanner}
                    className="flex-1 bg-gray-600 text-white py-3 rounded-lg hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
                  >
                    Scan Another
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AppointmentStatusUpdate;