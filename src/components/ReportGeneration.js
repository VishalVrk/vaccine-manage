// ReportGeneration.js - Component for generating reports
import React, { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, query, where } from "firebase/firestore";
import { db } from "../firebase";

const ReportGeneration = () => {
  const [reportType, setReportType] = useState("vaccineAdministration");
  const [dateRange, setDateRange] = useState({
    startDate: new Date(new Date().setMonth(new Date().getMonth() - 1)).toISOString().split('T')[0],
    endDate: new Date().toISOString().split('T')[0]
  });
  const [patientId, setPatientId] = useState("");
  const [vaccineId, setVaccineId] = useState("");
  const [reportData, setReportData] = useState(null);
  const [patients, setPatients] = useState([]);
  const [vaccines, setVaccines] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" });

  useEffect(() => {
    fetchPatients();
    fetchVaccines();
  }, []);

  const fetchPatients = async () => {
    try {
      const usersQuery = query(collection(db, "users"), where("role", "==", "patient"));
      const querySnapshot = await getDocs(usersQuery);
      const patientList = [];
      querySnapshot.forEach((doc) => {
        patientList.push({ id: doc.id, ...doc.data() });
      });
      setPatients(patientList);
    } catch (error) {
      console.error("Error fetching patients:", error);
      setMessage({
        text: "Failed to fetch patients: " + error.message,
        type: "error"
      });
    }
  };

  const fetchVaccines = async () => {
    try {
      const vaccinesSnapshot = await getDocs(collection(db, "vaccines"));
      const vaccineList = [];
      vaccinesSnapshot.forEach((doc) => {
        vaccineList.push({ id: doc.id, ...doc.data() });
      });
      setVaccines(vaccineList);
    } catch (error) {
      console.error("Error fetching vaccines:", error);
      setMessage({
        text: "Failed to fetch vaccines: " + error.message,
        type: "error"
      });
    }
  };

  const generateReport = async () => {
    setIsLoading(true);
    setMessage({ text: "", type: "" });
    setReportData(null);

    try {
      let reportResult = [];

      if (reportType === "vaccineAdministration") {
        // Query for vaccine administrations based on date range and optional filters
        const administrationsRef = collection(db, "vaccineAdministrations");
        
        // Build query based on filters
        let reportQuery = query(
          administrationsRef,
          where("administrationDate", ">=", dateRange.startDate),
          where("administrationDate", "<=", dateRange.endDate)
        );
        
        const querySnapshot = await getDocs(reportQuery);
        
        // Process results
        const administrations = [];
        for (const doc of querySnapshot.docs) {
          const adminData = { id: doc.id, ...doc.data() };
          
          // Apply patient filter if specified
          if (patientId && adminData.patientId !== patientId) continue;
          
          // Apply vaccine filter if specified
          if (vaccineId && adminData.vaccineId !== vaccineId) continue;
          
          // Fetch related data
          const patientDoc = await getDoc(doc(db, "users", adminData.patientId));
          const vaccineDoc = await getDoc(doc(db, "vaccines", adminData.vaccineId));
          
          administrations.push({
            ...adminData,
            patientName: patientDoc.exists() ? 
              `${patientDoc.data().firstName} ${patientDoc.data().lastName}` : 
              "Unknown Patient",
            vaccineName: vaccineDoc.exists() ? 
              vaccineDoc.data().name : 
              "Unknown Vaccine"
          });
        }
        
        reportResult = administrations;
      } else if (reportType === "inventoryStatus") {
        // Query for current inventory status
        const inventorySnapshot = await getDocs(collection(db, "vaccines"));
        const inventoryItems = [];
        
        inventorySnapshot.forEach((doc) => {
          const vaccineData = doc.data();
          
          // Apply vaccine filter if specified
          if (vaccineId && doc.id !== vaccineId) return;
          
          inventoryItems.push({
            id: doc.id,
            name: vaccineData.name,
            manufacturer: vaccineData.manufacturer,
            dosesAvailable: vaccineData.dosesAvailable || 0,
            expirationDate: vaccineData.expirationDate || "N/A",
            lastUpdated: vaccineData.lastUpdated || "N/A"
          });
        });
        
        reportResult = inventoryItems;
      } else if (reportType === "patientHistory") {
        // Ensure patient ID is provided for patient history report
        if (!patientId) {
          throw new Error("Patient ID is required for patient history report");
        }
        
        // Get patient details
        const patientDoc = await getDoc(doc(db, "users", patientId));
        if (!patientDoc.exists()) {
          throw new Error("Patient not found");
        }
        
        const patientData = patientDoc.data();
        
        // Get vaccination history
        const historyQuery = query(
          collection(db, "vaccineAdministrations"),
          where("patientId", "==", patientId)
        );
        
        const historySnapshot = await getDocs(historyQuery);
        const vaccinationHistory = [];
        
        for (const doc of historySnapshot.docs) {
          const adminData = doc.data();
          
          // Apply date range filter
          if (adminData.administrationDate < dateRange.startDate ||
              adminData.administrationDate > dateRange.endDate) continue;
          
          // Get vaccine details
          const vaccineDoc = await getDoc(doc(db, "vaccines", adminData.vaccineId));
          
          vaccinationHistory.push({
            id: doc.id,
            administrationDate: adminData.administrationDate,
            vaccineName: vaccineDoc.exists() ? 
              vaccineDoc.data().name : 
              "Unknown Vaccine",
            lotNumber: adminData.lotNumber,
            administeredBy: adminData.administeredBy,
            notes: adminData.notes || ""
          });
        }
        
        // Sort history by date (newest first)
        vaccinationHistory.sort((a, b) => 
          new Date(b.administrationDate) - new Date(a.administrationDate)
        );
        
        reportResult = {
          patient: {
            id: patientId,
            name: `${patientData.firstName} ${patientData.lastName}`,
            dateOfBirth: patientData.dateOfBirth,
            contactInfo: patientData.contactInfo || {}
          },
          vaccinationHistory: vaccinationHistory
        };
      }

      setReportData(reportResult);
      setMessage({
        text: `Successfully generated ${reportType} report.`,
        type: "success"
      });
    } catch (error) {
      console.error("Error generating report:", error);
      setMessage({
        text: "Failed to generate report: " + error.message,
        type: "error"
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDateChange = (e) => {
    const { name, value } = e.target;
    setDateRange(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const renderReportOutput = () => {
    if (!reportData) return null;

    if (reportType === "vaccineAdministration") {
      return (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Vaccine Administration Report</h3>
          <p>Period: {dateRange.startDate} to {dateRange.endDate}</p>
          <p>Total administrations: {reportData.length}</p>
          
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border">Date</th>
                  <th className="py-2 px-4 border">Patient</th>
                  <th className="py-2 px-4 border">Vaccine</th>
                  <th className="py-2 px-4 border">Lot #</th>
                  <th className="py-2 px-4 border">Administered By</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 px-4 border">{item.administrationDate}</td>
                    <td className="py-2 px-4 border">{item.patientName}</td>
                    <td className="py-2 px-4 border">{item.vaccineName}</td>
                    <td className="py-2 px-4 border">{item.lotNumber}</td>
                    <td className="py-2 px-4 border">{item.administeredBy}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (reportType === "inventoryStatus") {
      return (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Inventory Status Report</h3>
          <p>Generated on: {new Date().toLocaleDateString()}</p>
          <p>Total vaccine types: {reportData.length}</p>
          
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border">Vaccine Name</th>
                  <th className="py-2 px-4 border">Manufacturer</th>
                  <th className="py-2 px-4 border">Doses Available</th>
                  <th className="py-2 px-4 border">Expiration Date</th>
                  <th className="py-2 px-4 border">Last Updated</th>
                </tr>
              </thead>
              <tbody>
                {reportData.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 px-4 border">{item.name}</td>
                    <td className="py-2 px-4 border">{item.manufacturer}</td>
                    <td className="py-2 px-4 border">{item.dosesAvailable}</td>
                    <td className="py-2 px-4 border">{item.expirationDate}</td>
                    <td className="py-2 px-4 border">{item.lastUpdated}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    } else if (reportType === "patientHistory") {
      const patientInfo = reportData.patient;
      return (
        <div className="mt-4">
          <h3 className="text-lg font-semibold mb-2">Patient Vaccination History</h3>
          <div className="bg-gray-100 p-3 rounded mb-3">
            <p><strong>Patient:</strong> {patientInfo.name}</p>
            <p><strong>Date of Birth:</strong> {patientInfo.dateOfBirth}</p>
            <p><strong>Contact:</strong> {patientInfo.contactInfo.email || 'N/A'}</p>
          </div>
          
          <p>Period: {dateRange.startDate} to {dateRange.endDate}</p>
          <p>Total vaccinations: {reportData.vaccinationHistory.length}</p>
          
          <div className="overflow-x-auto mt-3">
            <table className="min-w-full bg-white border">
              <thead>
                <tr>
                  <th className="py-2 px-4 border">Date</th>
                  <th className="py-2 px-4 border">Vaccine</th>
                  <th className="py-2 px-4 border">Lot #</th>
                  <th className="py-2 px-4 border">Administered By</th>
                  <th className="py-2 px-4 border">Notes</th>
                </tr>
              </thead>
              <tbody>
                {reportData.vaccinationHistory.map(item => (
                  <tr key={item.id}>
                    <td className="py-2 px-4 border">{item.administrationDate}</td>
                    <td className="py-2 px-4 border">{item.vaccineName}</td>
                    <td className="py-2 px-4 border">{item.lotNumber}</td>
                    <td className="py-2 px-4 border">{item.administeredBy}</td>
                    <td className="py-2 px-4 border">{item.notes}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      );
    }
    
    return null;
  };

  const exportToCsv = () => {
    if (!reportData) return;
    
    let csvContent = "";
    
    if (reportType === "vaccineAdministration") {
      // Add headers
      csvContent = "Date,Patient,Vaccine,LotNumber,AdministeredBy\n";
      
      // Add rows
      reportData.forEach(item => {
        csvContent += `"${item.administrationDate}","${item.patientName}","${item.vaccineName}","${item.lotNumber}","${item.administeredBy}"\n`;
      });
    } else if (reportType === "inventoryStatus") {
      // Add headers
      csvContent = "VaccineName,Manufacturer,DosesAvailable,ExpirationDate,LastUpdated\n";
      
      // Add rows
      reportData.forEach(item => {
        csvContent += `"${item.name}","${item.manufacturer}","${item.dosesAvailable}","${item.expirationDate}","${item.lastUpdated}"\n`;
      });
    } else if (reportType === "patientHistory") {
      // Add headers
      csvContent = "Date,Vaccine,LotNumber,AdministeredBy,Notes\n";
      
      // Add rows
      reportData.vaccinationHistory.forEach(item => {
        csvContent += `"${item.administrationDate}","${item.vaccineName}","${item.lotNumber}","${item.administeredBy}","${item.notes}"\n`;
      });
    }
    
    // Create download link
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.setAttribute("href", url);
    link.setAttribute("download", `${reportType}_report_${new Date().toISOString().split('T')[0]}.csv`);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  return (
    <div className="container mx-auto p-4">
      <h2 className="text-2xl font-bold mb-4">Report Generation</h2>
      
      {message.text && (
        <div className={`p-3 mb-4 rounded ${message.type === 'error' ? 'bg-red-100 text-red-700' : 'bg-green-100 text-green-700'}`}>
          {message.text}
        </div>
      )}
      
      <div className="bg-white p-4 rounded shadow">
        <div className="mb-4">
          <label className="block mb-1 font-medium">Report Type</label>
          <select
            className="w-full p-2 border rounded"
            value={reportType}
            onChange={(e) => setReportType(e.target.value)}
          >
            <option value="vaccineAdministration">Vaccine Administration</option>
            <option value="inventoryStatus">Inventory Status</option>
            <option value="patientHistory">Patient Vaccination History</option>
          </select>
        </div>
        
        <div className="mb-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block mb-1 font-medium">Start Date</label>
            <input
              type="date"
              name="startDate"
              className="w-full p-2 border rounded"
              value={dateRange.startDate}
              onChange={handleDateChange}
            />
          </div>
          <div>
            <label className="block mb-1 font-medium">End Date</label>
            <input
              type="date"
              name="endDate"
              className="w-full p-2 border rounded"
              value={dateRange.endDate}
              onChange={handleDateChange}
            />
          </div>
        </div>
        
        {(reportType === "vaccineAdministration" || reportType === "patientHistory") && (
          <div className="mb-4">
            <label className="block mb-1 font-medium">Patient</label>
            <select
              className="w-full p-2 border rounded"
              value={patientId}
              onChange={(e) => setPatientId(e.target.value)}
              disabled={isLoading}
              required={reportType === "patientHistory"}
            >
              <option value="">All Patients</option>
              {patients.map(patient => (
                <option key={patient.id} value={patient.id}>
                  {patient.firstName} {patient.lastName}
                </option>
              ))}
            </select>
          </div>
        )}
        
        {(reportType === "vaccineAdministration" || reportType === "inventoryStatus") && (
          <div className="mb-4">
            <label className="block mb-1 font-medium">Vaccine</label>
            <select
              className="w-full p-2 border rounded"
              value={vaccineId}
              onChange={(e) => setVaccineId(e.target.value)}
              disabled={isLoading}
            >
              <option value="">All Vaccines</option>
              {vaccines.map(vaccine => (
                <option key={vaccine.id} value={vaccine.id}>
                  {vaccine.name}
                </option>
              ))}
            </select>
          </div>
        )}
        
        <div className="flex space-x-2">
          <button
            className="bg-blue-500 text-white px-4 py-2 rounded hover:bg-blue-600 disabled:bg-blue-300"
            onClick={generateReport}
            disabled={isLoading || (reportType === "patientHistory" && !patientId)}
          >
            {isLoading ? "Generating..." : "Generate Report"}
          </button>
          
          {reportData && (
            <button
              className="bg-green-500 text-white px-4 py-2 rounded hover:bg-green-600"
              onClick={exportToCsv}
            >
              Export to CSV
            </button>
          )}
        </div>
      </div>
      
      {reportData && renderReportOutput()}
    </div>
  );
};

export default ReportGeneration;