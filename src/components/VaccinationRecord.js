import React, { useState, useEffect, useCallback } from "react";
import { collection, getDocs, query } from "firebase/firestore";
import { db } from "../firebase";
import { sha256 } from "js-sha256";

const VaccinationRecord = () => {
  const [records, setRecords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [message, setMessage] = useState({ text: "", type: "" });
  const [vaccines, setVaccines] = useState({});

  useEffect(() => {
    const fetchData = async () => {
      await fetchVaccines();
      await fetchAllVaccinationRecords();
    };
    
    fetchData();
  }, []);

  const fetchVaccines = useCallback(async () => {
    try {
      const vaccinesQuery = query(collection(db, "vaccines"));
      const querySnapshot = await getDocs(vaccinesQuery);
      
      const vaccinesMap = {};
      querySnapshot.docs.forEach(doc => {
        vaccinesMap[doc.id] = doc.data().name || "Unknown Vaccine";
      });
      
      setVaccines(vaccinesMap);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      showMessage("Failed to load vaccine information", "error");
    }
  }, []);

  const fetchAllVaccinationRecords = useCallback(async () => {
    try {
      setLoading(true);
      const appointmentsQuery = query(collection(db, "appointments"));
      const querySnapshot = await getDocs(appointmentsQuery);
      
      const recordsList = querySnapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data(),
        recordHash: sha256(JSON.stringify(doc.data())),
      }));
      
      setRecords(recordsList);
    } catch (error) {
      console.error("Error fetching vaccination records:", error);
      showMessage("Failed to load vaccination records", "error");
    } finally {
      setLoading(false);
    }
  }, []);

  const showMessage = (text, type) => {
    setMessage({ text, type });
    setTimeout(() => setMessage({ text: "", type: "" }), 5000);
  };

  const getVaccineName = (vaccineId) => {
    return vaccines[vaccineId] || "Unknown Vaccine";
  };
  

  return (
    <div className="container mx-auto p-4">
  <h1 className="text-2xl font-bold text-gray-800 mb-6">Vaccination Records</h1>
  
  {loading ? (
    <div className="p-4 text-center text-gray-600">Loading vaccination records...</div>
  ) : records.length > 0 ? (
    <div className="overflow-x-auto">
      <div className="bg-white rounded-lg shadow-md overflow-hidden">
        <table className="min-w-full divide-y divide-gray-200">
          <thead className="bg-gray-50">
            <tr>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Patient Email</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Vaccine</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Administered At</th>
              <th className="py-3 px-6 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">QR Code</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {records.map((record) => (
              <tr key={record.id} className="hover:bg-gray-50 transition-colors">
                <td className="py-4 px-6 text-sm text-gray-900">{record.userEmail || "N/A"}</td>
                <td className="py-4 px-6 text-sm text-gray-900">{getVaccineName(record.vaccineId)}</td>
                <td className="py-4 px-6 text-sm text-gray-900">{record.status || "Unknown"}</td>
                <td className="py-4 px-6 text-sm text-gray-900">{record.administeredAt || record.bookedAt || "N/A"}</td>
                <td className="py-4 px-6 text-sm">
                  {record.qrCodeBlob ? (
                    <img 
                      src={record.qrCodeBlob} 
                      alt="QR Code" 
                      className="w-24 h-24 object-contain"
                    />
                  ) : (
                    <span className="text-gray-500">No QR Code</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  ) : (
    <div className="p-4 bg-gray-50 rounded-lg text-gray-600 text-center">
      No vaccination records found.
    </div>
  )}
</div>
  );
};

export default VaccinationRecord;