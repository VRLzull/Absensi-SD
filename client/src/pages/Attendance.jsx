import React, { useState, useEffect } from 'react';
import axios from 'axios'; // <-- tambahin ini
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  TextField,
  InputAdornment,
  IconButton,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip,
  Avatar,
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  Tooltip,
  Fade,
  CircularProgress,
} from '@mui/material';
import {
  Search,
  FilterList,
  Download,
  AccessTime,
  CheckCircle,
  Error,
  Warning,
  Person,
  Description,
  Print,
  Close,
  Delete,
} from '@mui/icons-material';
import * as XLSX from 'xlsx';
import jsPDF from 'jspdf';

// Import jspdf-autotable - harus di-import sebagai side effect
import 'jspdf-autotable';

const Attendance = () => {
  const [attendanceData, setAttendanceData] = useState([]);
  const [totalEmployees, setTotalEmployees] = useState(0);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [filterStatus, setFilterStatus] = useState('all');
  const [filterDepartment, setFilterDepartment] = useState('all');
  const [filterRange, setFilterRange] = useState('date');
  const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().toISOString().slice(0, 7));
  const [openDetailsDialog, setOpenDetailsDialog] = useState(false);
  const [selectedAttendance, setSelectedAttendance] = useState(null);
  const [printPreview, setPrintPreview] = useState({ open: false, content: '' });
  const [deletingId, setDeletingId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState({ open: false, attendance: null });
  const [openExportDialog, setOpenExportDialog] = useState(false);
  const [exportFilters, setExportFilters] = useState({
    employeeName: '',
    year: new Date().getFullYear().toString(),
    month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
    exportMethod: 'pdf'
  });
  const [exportLoading, setExportLoading] = useState(false);

  const departments = ['IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'];

  useEffect(() => {
    loadAttendanceData();
    loadTotalEmployees();
  }, [filterRange, selectedDate]);

  const loadTotalEmployees = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Token autentikasi tidak ditemukan');
        return;
      }

      // Ambil jumlah total pegawai dari endpoint employees
      const res = await axios.get('http://localhost:5000/api/employees', {
        headers: { Authorization: `Bearer ${token}` }
      });

      const employees = res.data.data || [];
      setTotalEmployees(employees.length);
    } catch (error) {
      console.error('Error loading total employees:', error);
    }
  };

  const loadAttendanceData = async () => {
    try {
      setLoading(true);

      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Token autentikasi tidak ditemukan');
        return;
      }

      // 🔹 Ambil data absensi dari backend Express dengan filter tanggal jika dipilih
      const params = {
        limit: 1000, // Limit besar untuk memastikan semua data terambil
        page: 1
      };
      
      // Hanya tambahkan filter tanggal jika user memilih tanggal
      if (filterRange === 'date' && selectedDate && selectedDate.trim() !== '') {
        // Pastikan format tanggal benar (YYYY-MM-DD)
        const dateStr = selectedDate.trim();
        params.date = dateStr;
        console.log('📅 Filtering by date:', dateStr);
      } else if (filterRange === 'month' && selectedMonth && selectedMonth.trim() !== '') {
        const monthStr = selectedMonth.trim();
        params.month = monthStr;
        console.log('📅 Filtering by month:', monthStr);
      } else {
        console.log('📅 Loading all attendance data (no date/month filter)');
      }
      
      const res = await axios.get('http://localhost:5000/api/attendance', {
        params: params,
        headers: { Authorization: `Bearer ${token}` }
      });
      
      console.log('📊 Attendance data received:', res.data.data?.length || 0, 'records');
      if (res.data.data?.length === 0 && (selectedDate || selectedMonth)) {
        console.warn('⚠️ No attendance data found for date/month:', selectedDate || selectedMonth);
      }

      // 🔹 Sesuaikan field sesuai database kamu
      const rawData = res.data.data || [];

      const calculateWorkingDuration = (checkIn, checkOut) => {
        if (!checkIn || !checkOut) return { seconds: 0, hours: 0 };
        const start = new Date(checkIn);
        const end = new Date(checkOut);
        if (isNaN(start.getTime()) || isNaN(end.getTime())) return { seconds: 0, hours: 0 };
        const diffMs = end - start;
        if (diffMs <= 0) return { seconds: 0, hours: 0 };
        const seconds = Math.floor(diffMs / 1000);
        const hours = parseFloat((diffMs / (1000 * 60 * 60)).toFixed(2));
        return { seconds, hours };
      };

      const mappedData = rawData.map(item => {
        const duration = calculateWorkingDuration(item.check_in, item.check_out);
        const overtime = duration.hours > 8 ? parseFloat((duration.hours - 8).toFixed(2)) : 0;

        return {
          id: item.id,
          name: item.full_name,
          employeeId: item.emp_id || item.employee_id,
          department: item.department,
          position: item.position,
          checkIn: item.check_in,
          checkOut: item.check_out,
          status: item.status,
          avatar: item.full_name ? item.full_name[0].toUpperCase() : '?',
          totalHours: duration.hours,
          totalDurationSeconds: duration.seconds,
          overtime,
        };
      });

      setAttendanceData(mappedData);
    } catch (error) {
      console.error('Error loading attendance data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleOpenDetails = (attendance) => {
    setSelectedAttendance(attendance);
    setOpenDetailsDialog(true);
  };

  const handleCloseDetails = () => {
    setOpenDetailsDialog(false);
    setSelectedAttendance(null);
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#10b981';
      case 'late': return '#f59e0b';
      case 'absent': return '#ef4444';
      default: return '#6b7280';
    }
  };

  const getStatusLabel = (status) => {
    switch (status) {
      case 'present': return 'Hadir';
      case 'late': return 'Terlambat';
      case 'absent': return 'Tidak Hadir';
      default: return 'Unknown';
    }
  };

  const formatDuration = (seconds) => {
    if (!seconds || seconds <= 0) return '-';
    const hrs = Math.floor(seconds / 3600);
    const mins = Math.floor((seconds % 3600) / 60);
    const secs = seconds % 60;
    const parts = [];
    parts.push(`${hrs} jam`);
    parts.push(`${mins} menit`);
    parts.push(`${secs} detik`);
    return parts.join(' ');
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'present': return <CheckCircle />;
      case 'late': return <Warning />;
      case 'absent': return <Error />;
      default: return <AccessTime />;
    }
  };

  const rangeFilteredAttendance = attendanceData.filter(attendance => {
    if (filterRange === 'date') {
      if (!selectedDate) return true;
      const checkInDate = attendance.checkIn ? new Date(attendance.checkIn).toISOString().split('T')[0] : '';
      return checkInDate === selectedDate;
    }
    if (filterRange === 'month') {
      if (!selectedMonth) return true;
      const checkInMonth = attendance.checkIn ? new Date(attendance.checkIn).toISOString().slice(0, 7) : '';
      return checkInMonth === selectedMonth;
    }
    return true; // all data
  });

  const filteredAttendance = rangeFilteredAttendance.filter(attendance => {
    const matchesSearch = attendance.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         attendance.employeeId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesStatus = filterStatus === 'all' || attendance.status === filterStatus;
    const matchesDepartment = filterDepartment === 'all' || attendance.department === filterDepartment;
    
    return matchesSearch && matchesStatus && matchesDepartment;
  });

  const getStats = () => {
    const statusByEmployee = new Map();
    filteredAttendance.forEach((att) => {
      const key = att.employeeId || att.id;
      if (!statusByEmployee.has(key)) {
        statusByEmployee.set(key, att.status || 'unknown');
      }
    });

    const uniqueStatuses = Array.from(statusByEmployee.values());
    const present = uniqueStatuses.filter((status) => status === 'present').length;
    const late = uniqueStatuses.filter((status) => status === 'late').length;
    const recordedAbsent = uniqueStatuses.filter((status) => status === 'absent').length;

    const calculatedAbsent = totalEmployees - (present + late);
    const absent = Math.max(recordedAbsent, calculatedAbsent > 0 ? calculatedAbsent : 0);
    
    return { total: totalEmployees, present, late, absent };
  };

  const stats = getStats();

  const handleOpenExportDialog = () => {
    setOpenExportDialog(true);
  };

  const handleCloseExportDialog = () => {
    setOpenExportDialog(false);
    setExportFilters({
      employeeName: '',
      year: new Date().getFullYear().toString(),
      month: (new Date().getMonth() + 1).toString().padStart(2, '0'),
      exportMethod: 'pdf'
    });
  };

  const handleExportFilterChange = (field, value) => {
    setExportFilters(prev => ({
      ...prev,
      [field]: value
    }));
  };

  const fetchAttendanceForExport = async () => {
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        throw new Error('Token autentikasi tidak ditemukan');
      }

      const { employeeName, year, month } = exportFilters;
      const startDate = `${year}-${month}-01`;
      const endDate = `${year}-${month}-${new Date(parseInt(year), parseInt(month), 0).getDate()}`;

      // Fetch all data for the month
      let allData = [];
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const res = await axios.get(`http://localhost:5000/api/attendance`, {
          params: {
            page,
            limit: 1000,
          },
          headers: { Authorization: `Bearer ${token}` }
        });

        const pageData = res.data.data || [];
        allData = [...allData, ...pageData];

        // Check if there's more data
        hasMore = pageData.length === 1000;
        page++;
      }

      // Filter by date range
      let data = allData.filter(item => {
        if (!item.check_in) return false;
        const checkInDate = new Date(item.check_in).toISOString().split('T')[0];
        return checkInDate >= startDate && checkInDate <= endDate;
      });

      // Filter by employee name if provided
      if (employeeName && employeeName.trim()) {
        data = data.filter(item => 
          item.full_name?.toLowerCase().includes(employeeName.toLowerCase())
        );
      }

      return data.map(item => ({
        id: item.id,
        name: item.full_name,
        employeeId: item.emp_id || item.employee_id,
        department: item.department,
        position: item.position,
        checkIn: item.check_in,
        checkOut: item.check_out,
        status: item.status,
        location: item.location || '-',
        notes: item.notes || '-',
      }));
    } catch (error) {
      console.error('Error fetching attendance for export:', error);
      throw error;
    }
  };

  const handleExport = async () => {
    try {
      setExportLoading(true);
      const data = await fetchAttendanceForExport();
      
      if (data.length === 0) {
        alert('Tidak ada data absensi untuk diekspor berdasarkan filter yang dipilih');
        return;
      }

      const { year, month, exportMethod } = exportFilters;
      const monthName = new Date(2000, parseInt(month) - 1).toLocaleString('id-ID', { month: 'long' });
      const fileName = `Data_Absensi_${monthName}_${year}`;

      if (exportMethod === 'pdf') {
        await exportToPDF(fileName, data);
      } else {
        exportToExcel(fileName, data);
      }

      handleCloseExportDialog();
    } catch (error) {
      console.error('Error exporting attendance data:', error);
      alert('Terjadi kesalahan saat mengekspor data');
    } finally {
      setExportLoading(false);
    }
  };

  const exportToPDF = async (fileName, data) => {
    try {
      // Pastikan jspdf-autotable ter-load
      // Dynamic import untuk memastikan module ter-load
      try {
        await import('jspdf-autotable');
      } catch (e) {
        console.warn('jspdf-autotable import warning:', e);
      }
      
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPos = 20;

      // Header dengan background abu-abu
      doc.setFillColor(240, 240, 240);
      doc.rect(0, 0, pageWidth, 50, 'F');
      
      // Icon jam (simplified)
      doc.setFontSize(24);
      doc.text('🕐', pageWidth / 2, 25, { align: 'center' });
      
      // Nama instansi (placeholder)
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('[Ubah Nama Instansi]', pageWidth / 2, 40, { align: 'center' });
      
      yPos = 60;

      // Table data - format sesuai contoh
      const tableData = data.map((item, index) => {
        let tanggalAbsen = '-';
        let jamDatang = '-';
        let jamPulang = '-';
        
        if (item.checkIn) {
          const checkInDate = new Date(item.checkIn);
          tanggalAbsen = checkInDate.toLocaleDateString('id-ID', {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric'
          });
          jamDatang = checkInDate.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
        }
        
        if (item.checkOut) {
          const checkOutDate = new Date(item.checkOut);
          jamPulang = checkOutDate.toLocaleTimeString('id-ID', { 
            hour: '2-digit', 
            minute: '2-digit',
            hour12: false
          });
        }
        
        return [
          index + 1,
          item.name || '-',
          tanggalAbsen,
          jamDatang,
          jamPulang,
          getStatusLabel(item.status),
        ];
      });

      // Cek apakah autoTable tersedia
      const hasAutoTable = typeof doc.autoTable === 'function';
      console.log('autoTable available:', hasAutoTable);
      
      if (hasAutoTable) {
        // Gunakan autoTable jika tersedia
        // @ts-ignore
        doc.autoTable({
          startY: yPos,
          head: [['No', 'Nama Pegawai', 'Tanggal Absen', 'Jam Datang', 'Jam Pulang', 'Status Kehadiran']],
          body: tableData,
          theme: 'grid',
          headStyles: { 
            fillColor: [60, 60, 60], 
            textColor: 255, 
            fontStyle: 'bold',
            fontSize: 9
          },
          bodyStyles: { 
            fontSize: 8,
            textColor: [0, 0, 0]
          },
          margin: { left: margin, right: margin },
          styles: { 
            fontSize: 8, 
            cellPadding: 2,
            overflow: 'linebreak',
            cellWidth: 'wrap'
          },
          columnStyles: {
            0: { cellWidth: 15, halign: 'center' },
            1: { cellWidth: 50 },
            2: { cellWidth: 35, halign: 'center' },
            3: { cellWidth: 30, halign: 'center' },
            4: { cellWidth: 30, halign: 'center' },
            5: { cellWidth: 35, halign: 'center' },
          },
        });
        // @ts-ignore
        yPos = doc.lastAutoTable.finalY + 10;
      } else {
        // Manual table dengan format yang lebih baik
        const tableStartX = margin;
        const tableWidth = pageWidth - (margin * 2);
        const colWidths = [
          15,  // No
          50,  // Nama Pegawai
          35,  // Tanggal Absen
          30,  // Jam Datang
          30,  // Jam Pulang
          35,  // Status Kehadiran
        ];
        
        const headers = ['No', 'Nama Pegawai', 'Tanggal Absen', 'Jam Datang', 'Jam Pulang', 'Status Kehadiran'];
        const headerHeight = 8;
        const headerY = yPos;
        
        // Draw header background - mulai dari yPos, bukan yPos - headerHeight
        doc.setFillColor(60, 60, 60);
        doc.rect(tableStartX, headerY, tableWidth, headerHeight, 'F');
        
        // Draw header text - center vertically dalam header
        doc.setFontSize(9);
        doc.setFont('helvetica', 'bold');
        doc.setTextColor(255, 255, 255);
        let currentX = tableStartX;
        headers.forEach((header, idx) => {
          const textY = headerY + (headerHeight / 2) + 2; // Center text dalam header
          const align = idx === 0 || idx === 2 || idx === 3 || idx === 4 || idx === 5 ? 'center' : 'left';
          const textX = align === 'center' 
            ? currentX + (colWidths[idx] / 2)
            : currentX + 3;
          
          doc.text(header, textX, textY, { 
            maxWidth: colWidths[idx] - 6,
            align: align
          });
          currentX += colWidths[idx];
        });
        
        yPos = headerY + headerHeight + 2;
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(0, 0, 0);
        
        // Draw table rows with borders
        const rowHeight = 7;
        tableData.forEach((row, rowIdx) => {
          if (yPos + rowHeight > doc.internal.pageSize.getHeight() - 30) {
            doc.addPage();
            yPos = 20;
          }
          
          const rowY = yPos;
          currentX = tableStartX;
          
          // Alternating row background untuk readability
          if (rowIdx % 2 === 0) {
            doc.setFillColor(250, 250, 250);
            doc.rect(tableStartX, rowY, tableWidth, rowHeight, 'F');
          }
          
          // Draw cell borders and content
          row.forEach((cell, colIdx) => {
            // Draw cell border
            doc.setDrawColor(220, 220, 220);
            doc.rect(currentX, rowY, colWidths[colIdx], rowHeight, 'S');
            
            // Draw cell content - center vertically
            doc.setFontSize(8);
            const cellText = String(cell || '-');
            const align = colIdx === 0 || colIdx === 2 || colIdx === 3 || colIdx === 4 || colIdx === 5 ? 'center' : 'left';
            const textX = align === 'center' 
              ? currentX + (colWidths[colIdx] / 2)
              : currentX + 3;
            const textY = rowY + (rowHeight / 2) + 2;
            
            doc.text(cellText, textX, textY, { 
              maxWidth: colWidths[colIdx] - 6,
              align: align
            });
            
            currentX += colWidths[colIdx];
          });
          
          yPos += rowHeight;
        });
      }

      // Footer - format sesuai contoh
      const footerY = doc.internal.pageSize.getHeight() - 15;
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const now = new Date();
      const footerText = `PDF was generated on ${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')} ${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')}:${String(now.getSeconds()).padStart(2, '0')}`;
      doc.text(footerText, margin, footerY);

      // Save PDF
      doc.save(`${fileName}.pdf`);
    } catch (error) {
      console.error('Error generating PDF:', error);
      throw error;
    }
  };

  const exportToExcel = (fileName, data) => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const present = data.filter(a => a.status === 'present').length;
    const late = data.filter(a => a.status === 'late').length;
    const absent = data.filter(a => a.status === 'absent').length;

    const summaryWS = XLSX.utils.aoa_to_sheet([
      ['DATA ABSENSI'],
      [],
      ['Periode', `${exportFilters.month}/${exportFilters.year}`],
      ['Dibuat', new Date().toLocaleString('id-ID')],
      [],
      ['RINGKASAN'],
      ['Item', 'Jumlah'],
      ['Total', data.length],
      ['Hadir', present],
      ['Terlambat', late],
      ['Tidak Hadir', absent],
    ]);

    summaryWS['!cols'] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Ringkasan');

    // Attendance Data Sheet
    if (data.length > 0) {
      const headers = [
        ['DATA ABSENSI PEGAWAI'],
        [],
        ['No', 'Nama Pegawai', 'Tanggal Absen', 'Jam Datang', 'Jam Pulang', 'Status Kehadiran'],
      ];

      const rows = data.map((att, index) => [
        index + 1,
        att.name || '-',
        att.checkIn ? new Date(att.checkIn).toLocaleDateString('id-ID') : '-',
        att.checkIn ? new Date(att.checkIn).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        att.checkOut ? new Date(att.checkOut).toLocaleTimeString('id-ID', { hour: '2-digit', minute: '2-digit' }) : '-',
        getStatusLabel(att.status),
      ]);

      const dataWS = XLSX.utils.aoa_to_sheet([...headers, ...rows]);
      dataWS['!cols'] = [
        { wch: 5 },
        { wch: 30 },
        { wch: 15 },
        { wch: 12 },
        { wch: 12 },
        { wch: 18 },
      ];
      XLSX.utils.book_append_sheet(wb, dataWS, 'Data Absensi');
    }

    // Save Excel file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const buildPrintTemplate = (attendance) => {
    const formatDate = (value) => {
      if (!value) return '-';
      try {
        return new Date(value).toLocaleDateString('id-ID', {
          weekday: 'long',
          year: 'numeric',
          month: 'long',
          day: 'numeric',
        });
      } catch (e) {
        return value;
      }
    };

    const formatTime = (value) => {
      if (!value) return 'Tidak Hadir';
      try {
        return new Date(value).toLocaleTimeString('id-ID', {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        });
      } catch (e) {
        return value;
      }
    };

    const generatedAt = new Date().toLocaleString('id-ID');
    const totalJam = formatDuration(attendance.totalDurationSeconds);
    const lembur = attendance.overtime > 0 ? `${attendance.overtime} jam` : 'Tidak ada';

    return `<!DOCTYPE html>
    <html lang="id">
      <head>
        <meta charset="utf-8" />
        <title>Cetak Absensi</title>
        <style>
          * { box-sizing: border-box; }
          body {
            margin: 0;
            padding: 32px;
            background: #edf2ff;
            font-family: 'Segoe UI', Tahoma, sans-serif;
            color: #0f172a;
          }
          .container {
            max-width: 760px;
            margin: 0 auto;
            background: #ffffff;
            border-radius: 18px;
            box-shadow: 0 18px 42px rgba(15, 23, 42, 0.14);
            overflow: hidden;
          }
          .header {
            background: linear-gradient(135deg, #f3f4ff, #e3e9ff);
            padding: 30px 36px;
            display: flex;
            align-items: center;
            gap: 22px;
          }
          .header-icon {
            width: 84px;
            height: 84px;
            border-radius: 24px;
            background: #1d4ed8;
            display: flex;
            align-items: center;
            justify-content: center;
            color: #fff;
            font-size: 42px;
            box-shadow: 0 12px 28px rgba(29, 78, 216, 0.25);
          }
          .header-text h1 {
            margin: 0;
            font-size: 24px;
            letter-spacing: 1px;
            font-weight: 700;
            text-transform: uppercase;
          }
          .header-text span {
            display: inline-block;
            margin-top: 8px;
            padding: 6px 14px;
            border-radius: 999px;
            background: rgba(29, 78, 216, 0.1);
            color: #1d4ed8;
            font-size: 12px;
            font-weight: 600;
            text-transform: uppercase;
          }
          .body {
            padding: 32px 38px;
          }
          .section-title {
            font-size: 14px;
            font-weight: 700;
            text-transform: uppercase;
            color: #2563eb;
            margin-bottom: 12px;
            letter-spacing: 1px;
          }
          .section-desc {
            font-size: 13px;
            color: #64748b;
            margin-bottom: 22px;
          }
          table {
            width: 100%;
            border-collapse: collapse;
            border-radius: 14px;
            overflow: hidden;
            margin-bottom: 28px;
          }
          th, td {
            padding: 14px 18px;
            border-bottom: 1px solid #e2e8f0;
            font-size: 14px;
          }
          th {
            width: 33%;
            background: #f1f5f9;
            font-weight: 600;
            text-transform: uppercase;
            letter-spacing: 0.5px;
            color: #1e293b;
          }
          tr:last-child th, tr:last-child td {
            border-bottom: none;
          }
          .footer {
            display: flex;
            justify-content: space-between;
            font-size: 12px;
            color: #94a3b8;
            margin-top: 24px;
            padding-top: 16px;
            border-top: 1px dashed #d1d5db;
          }
          .signature {
            text-align: right;
            font-size: 13px;
            color: #475569;
            margin-top: 40px;
          }
          .signature span {
            display: inline-block;
            margin-top: 36px;
            border-top: 1px solid #cbd5f5;
            padding-top: 6px;
          }
          @media print {
            body {
              background: #ffffff;
              padding: 0;
            }
            .container {
              box-shadow: none;
              border-radius: 0;
            }
          }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <div class="header-icon">🕒</div>
            <div class="header-text">
              <h1>Detail Absensi Karyawan</h1>
              <span>[Ubah Nama Instansi]</span>
            </div>
          </div>
          <div class="body">
            <div class="section-desc">
              Berikut adalah catatan kehadiran yang tersimpan pada sistem untuk pegawai berikut:
            </div>
            <div class="section-title">Informasi Umum</div>
            <table>
              <tr><th>Nama Pegawai</th><td>${attendance.name || '-'}</td></tr>
              <tr><th>Employee ID</th><td>${attendance.employeeId || '-'}</td></tr>
              <tr><th>Departemen</th><td>${attendance.department || '-'}</td></tr>
              <tr><th>Posisi</th><td>${attendance.position || '-'}</td></tr>
            </table>
            <div class="section-title">Detail Kehadiran</div>
            <table>
              <tr><th>Tanggal</th><td>${formatDate(attendance.checkIn)}</td></tr>
              <tr><th>Check In</th><td>${formatTime(attendance.checkIn)}</td></tr>
              <tr><th>Check Out</th><td>${formatTime(attendance.checkOut)}</td></tr>
              <tr><th>Status Kehadiran</th><td>${getStatusLabel(attendance.status)}</td></tr>
              <tr><th>Total Jam</th><td>${totalJam}</td></tr>
              <tr><th>Lembur</th><td>${lembur}</td></tr>
              <tr><th>Keterangan</th><td>${attendance.notes || '-'}</td></tr>
            </table>
            <div class="footer">
              <div>Dicetak pada: ${generatedAt}</div>
              <div>Lokasi Absen: ${attendance.location || 'Lokasi tidak diketahui'}</div>
            </div>
            <div class="signature">
              Atas Nama.<br />
              <span>&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;</span>
            </div>
          </div>
        </div>
      </body>
    </html>`;
  };

  const handlePrintRecord = (attendance) => {
    const template = buildPrintTemplate(attendance);
    setPrintPreview({ open: true, content: template });
  };

  const handleExecutePrint = () => {
    const frame = document.getElementById('attendance-print-frame');
    if (frame && frame.contentWindow) {
      frame.contentWindow.focus();
      frame.contentWindow.print();
    }
  };

  const handleConfirmDelete = (attendance) => {
    setDeleteConfirm({ open: true, attendance });
  };

  const handleDeleteAttendance = async () => {
    if (!deleteConfirm.attendance) return;
    
    try {
      setDeletingId(deleteConfirm.attendance.id);
      const token = localStorage.getItem('token');
      if (!token) throw new Error('Token autentikasi tidak ditemukan');

      await axios.delete(`http://localhost:5000/api/attendance/${deleteConfirm.attendance.id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      setAttendanceData(prev => prev.filter(item => item.id !== deleteConfirm.attendance.id));
    } catch (error) {
      console.error('Error deleting attendance:', error);
      alert('Gagal menghapus data absensi');
    } finally {
      setDeletingId(null);
      setDeleteConfirm({ open: false, attendance: null });
    }
  };

  if (loading) {
    return (
      <Box display="flex" justifyContent="center" alignItems="center" minHeight="60vh">
        <CircularProgress size={60} />
      </Box>
    );
  }

  return (
    <Fade in={true} timeout={800}>
      <Box sx={{ p: { xs: 2, sm: 3, md: 4 } }}>
        {/* Header */}
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={4}>
          <Box>
            <Typography variant="h3" sx={{ fontWeight: 800, color: '#0f172a', mb: 1, fontSize: { xs: '2rem', sm: '2.5rem', md: '3rem' } }}>
              Data Absensi
            </Typography>
            <Typography variant="h6" color="text.secondary" sx={{ fontWeight: 500, fontSize: { xs: '1rem', sm: '1.1rem', md: '1.25rem' } }}>
              Monitor kehadiran karyawan dan catatan waktu kerja
            </Typography>
          </Box>
          <Button
            variant="outlined"
            startIcon={<Download />}
            onClick={handleOpenExportDialog}
            sx={{
              borderColor: '#1976d2',
              color: '#1976d2',
              '&:hover': { 
                borderColor: '#1565c0',
                bgcolor: '#f3f4f6'
              },
              borderRadius: 2,
              px: 3,
              py: 1.5,
            }}
          >
            Export Data
          </Button>
        </Box>

        {/* Stats Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              bgcolor: '#1976d2', 
              color: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 4px 6px -1px rgba(25, 118, 210, 0.3)'
            }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {stats.total}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Total Karyawan
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              bgcolor: '#10b981', 
              color: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 4px 6px -1px rgba(16, 185, 129, 0.3)'
            }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {stats.present}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Hadir
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              bgcolor: '#f59e0b', 
              color: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 4px 6px -1px rgba(245, 158, 11, 0.3)'
            }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {stats.late}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Terlambat
                </Typography>
              </CardContent>
            </Card>
          </Grid>
          <Grid item xs={12} sm={6} md={3}>
            <Card sx={{ 
              bgcolor: '#ef4444', 
              color: '#ffffff',
              borderRadius: 2,
              boxShadow: '0 4px 6px -1px rgba(239, 68, 68, 0.3)'
            }}>
              <CardContent sx={{ p: 3, textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 800, mb: 1 }}>
                  {stats.absent}
                </Typography>
                <Typography variant="body2" sx={{ opacity: 0.9 }}>
                  Tidak Hadir
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Filters and Search */}
        <Card sx={{ 
          border: 'none',
          borderRadius: 6,
          boxShadow: '0 8px 12px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.06)',
          mb: 4
        }}>
          <CardContent sx={{ p: 4 }}>
            <Grid container spacing={3} alignItems="center">
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Rentang</InputLabel>
                  <Select
                    value={filterRange}
                    label="Rentang"
                    onChange={(e) => setFilterRange(e.target.value)}
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="date">Per Tanggal</MenuItem>
                    <MenuItem value="month">Per Bulan</MenuItem>
                    <MenuItem value="all">Semua Data</MenuItem>
                  </Select>
                </FormControl>
              </Grid>

              {filterRange === 'date' && (
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="date"
                    label="Filter Tanggal"
                    value={selectedDate}
                    onChange={(e) => setSelectedDate(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText={selectedDate ? `Menampilkan absensi pada ${new Date(selectedDate).toLocaleDateString('id-ID')}` : 'Kosongkan untuk menampilkan semua data'}
                    InputProps={{
                      endAdornment: selectedDate ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSelectedDate('')}>
                            <Close fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: '#1976d2' },
                        '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                      },
                    }}
                  />
                </Grid>
              )}

              {filterRange === 'month' && (
                <Grid item xs={12} md={3}>
                  <TextField
                    fullWidth
                    type="month"
                    label="Filter Bulan"
                    value={selectedMonth}
                    onChange={(e) => setSelectedMonth(e.target.value)}
                    InputLabelProps={{ shrink: true }}
                    helperText="Pilih bulan untuk menampilkan data"
                    InputProps={{
                      endAdornment: selectedMonth ? (
                        <InputAdornment position="end">
                          <IconButton size="small" onClick={() => setSelectedMonth('')}>
                            <Close fontSize="small" />
                          </IconButton>
                        </InputAdornment>
                      ) : null,
                    }}
                    sx={{
                      '& .MuiOutlinedInput-root': {
                        borderRadius: 2,
                        '&:hover fieldset': { borderColor: '#1976d2' },
                        '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                      },
                    }}
                  />
                </Grid>
              )}

              <Grid item xs={12} md={filterRange === 'date' || filterRange === 'month' ? 3 : 4}>
                <TextField
                  fullWidth
                  placeholder="Cari nama atau ID karyawan..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  InputProps={{
                    startAdornment: (
                      <InputAdornment position="start">
                        <Search sx={{ color: '#64748b' }} />
                      </InputAdornment>
                    ),
                  }}
                  sx={{
                    '& .MuiOutlinedInput-root': {
                      borderRadius: 2,
                      bgcolor: '#ffffff',
                      '&:hover fieldset': { borderColor: '#1976d2' },
                      '&.Mui-focused fieldset': { borderColor: '#1976d2' },
                    },
                  }}
                />
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Status</InputLabel>
                  <Select
                    value={filterStatus}
                    onChange={(e) => setFilterStatus(e.target.value)}
                    label="Status"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="all">Semua Status</MenuItem>
                    <MenuItem value="present">Hadir</MenuItem>
                    <MenuItem value="late">Terlambat</MenuItem>
                    <MenuItem value="absent">Tidak Hadir</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <FormControl fullWidth>
                  <InputLabel>Departemen</InputLabel>
                  <Select
                    value={filterDepartment}
                    onChange={(e) => setFilterDepartment(e.target.value)}
                    label="Departemen"
                    sx={{ borderRadius: 2 }}
                  >
                    <MenuItem value="all">Semua Dept</MenuItem>
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>{dept}</MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={2}>
                <Button
                  variant="outlined"
                  startIcon={<FilterList />}
                  fullWidth
                  sx={{
                    borderColor: '#e2e8f0',
                    color: '#64748b',
                    '&:hover': { 
                      borderColor: '#cbd5e1',
                      bgcolor: '#f8fafc'
                    },
                    borderRadius: 2,
                    py: 1.5,
                  }}
                >
                  Filter
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Attendance Table */}
        <Card sx={{ 
          border: 'none',
          borderRadius: 6,
          boxShadow: '0 8px 12px -1px rgba(0, 0, 0, 0.1), 0 4px 6px -1px rgba(0, 0, 0, 0.06)',
        }}>
          <TableContainer>
            <Table>
              <TableHead>
                <TableRow sx={{ bgcolor: '#f8fafc' }}>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>Karyawan</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>Departemen</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>Check In</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>Check Out</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>Total Jam</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>Status</TableCell>
                  <TableCell sx={{ fontWeight: 600, color: '#0f172a' }}>Aksi</TableCell>
                </TableRow>
              </TableHead>
              <TableBody>
                {filteredAttendance.map((attendance) => (
                  <TableRow key={attendance.id} hover>
                    <TableCell>
                      <Box sx={{ display: 'flex', alignItems: 'center', gap: 2 }}>
                        <Avatar sx={{ 
                          bgcolor: '#1976d2',
                          width: 40,
                          height: 40,
                          fontSize: '1rem',
                          fontWeight: 600
                        }}>
                          {attendance.avatar}
                        </Avatar>
                        <Box>
                          <Typography variant="body1" sx={{ fontWeight: 600, color: '#0f172a' }}>
                            {attendance.name}
                          </Typography>
                          <Typography variant="body2" color="text.secondary">
                            {attendance.employeeId}
                          </Typography>
                        </Box>
                      </Box>
                    </TableCell>
                    <TableCell>
                      <Chip 
                        label={attendance.department} 
                        size="small"
                        sx={{ 
                          bgcolor: '#f1f5f9',
                          color: '#0f172a',
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 500,
                        color: attendance.checkIn ? '#0f172a' : '#ef4444'
                      }}>
                        {attendance.checkIn || 'Tidak Hadir'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ 
                        fontWeight: 500,
                        color: attendance.checkOut ? '#0f172a' : '#ef4444'
                      }}>
                        {attendance.checkOut || 'Tidak Hadir'}
                      </Typography>
                    </TableCell>
                    <TableCell>
                      <Typography variant="body2" sx={{ fontWeight: 500 }}>
                        {formatDuration(attendance.totalDurationSeconds)}
                      </Typography>
                      {attendance.overtime > 0 && (
                        <Typography variant="caption" sx={{ color: '#f59e0b', fontWeight: 500 }}>
                          +{attendance.overtime} jam OT
                        </Typography>
                      )}
                    </TableCell>
                    <TableCell>
                      <Chip 
                        icon={getStatusIcon(attendance.status)}
                        label={getStatusLabel(attendance.status)} 
                        size="small"
                        sx={{ 
                          bgcolor: getStatusColor(attendance.status),
                          color: '#ffffff',
                          fontWeight: 500
                        }}
                      />
                    </TableCell>
                    <TableCell>
                      <Tooltip title="Lihat Detail">
                        <IconButton
                          size="small"
                          onClick={() => handleOpenDetails(attendance)}
                          sx={{ 
                            color: '#1976d2',
                            '&:hover': { bgcolor: '#e3f2fd' }
                          }}
                        >
                          <Person fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Print Absensi">
                        <IconButton
                          size="small"
                          onClick={() => handlePrintRecord(attendance)}
                          sx={{ 
                            color: '#1976d2',
                            '&:hover': { bgcolor: '#e3f2fd' }
                          }}
                        >
                          <Print fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Hapus Absensi">
                        <span>
                          <IconButton
                            size="small"
                          onClick={() => handleConfirmDelete(attendance)}
                            disabled={deletingId === attendance.id}
                            sx={{ 
                              color: '#dc2626',
                              '&:hover': { bgcolor: '#fee2e2' }
                            }}
                          >
                            <Delete fontSize="small" />
                          </IconButton>
                        </span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          </TableContainer>
        </Card>

        {/* Attendance Details Dialog */}
        <Dialog open={openDetailsDialog} onClose={handleCloseDetails} maxWidth="md" fullWidth>
          <DialogTitle sx={{ pb: 1 }}>
            Detail Absensi - {selectedAttendance?.name}
          </DialogTitle>
          <DialogContent sx={{ pt: 2 }}>
            {selectedAttendance && (
              <Grid container spacing={3}>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Employee ID
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedAttendance.employeeId}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Departemen
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedAttendance.department}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Tanggal
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {new Date(selectedAttendance.date).toLocaleDateString('id-ID', {
                      weekday: 'long',
                      year: 'numeric',
                      month: 'long',
                      day: 'numeric'
                    })}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Status
                  </Typography>
                  <Chip 
                    icon={getStatusIcon(selectedAttendance.status)}
                    label={getStatusLabel(selectedAttendance.status)} 
                    size="small"
                    sx={{ 
                      bgcolor: getStatusColor(selectedAttendance.status),
                      color: '#ffffff',
                      fontWeight: 500
                    }}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Check In
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedAttendance.checkIn || 'Tidak Hadir'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Check Out
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedAttendance.checkOut || 'Tidak Hadir'}
                  </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Total Jam Kerja
                  </Typography>
                    <Typography variant="body1" sx={{ fontWeight: 500 }}>
                      {formatDuration(selectedAttendance.totalDurationSeconds)}
                    </Typography>
                </Grid>
                <Grid item xs={12} sm={6}>
                  <Typography variant="subtitle2" color="text.secondary" gutterBottom>
                    Lembur
                  </Typography>
                  <Typography variant="body1" sx={{ fontWeight: 500 }}>
                    {selectedAttendance.overtime > 0 ? `${selectedAttendance.overtime} jam` : 'Tidak ada'}
                  </Typography>
                </Grid>
              </Grid>
            )}
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button onClick={handleCloseDetails} sx={{ color: '#64748b' }}>
              Tutup
            </Button>
          </DialogActions>
        </Dialog>

        {/* Export Dialog */}
        <Dialog open={openExportDialog} onClose={handleCloseExportDialog} maxWidth="sm" fullWidth>
          <DialogTitle sx={{ display: 'flex', alignItems: 'center', gap: 1, pb: 2 }}>
            <Description sx={{ color: '#1976d2' }} />
            <Typography variant="h6" sx={{ fontWeight: 600 }}>
              Export Absensi
            </Typography>
          </DialogTitle>
          <DialogContent>
            <Box sx={{ display: 'flex', flexDirection: 'column', gap: 3, pt: 1 }}>
              {/* Nama Pegawai */}
              <TextField
                fullWidth
                label="Nama Pegawai"
                placeholder="Nama Pegawai"
                value={exportFilters.employeeName}
                onChange={(e) => handleExportFilterChange('employeeName', e.target.value)}
                helperText="*Kosongkan bagian ini jika ingin menampilkan semua"
                sx={{ borderRadius: 2 }}
              />

              {/* Tahun Absen */}
              <TextField
                fullWidth
                label="Tahun Absen"
                type="number"
                value={exportFilters.year}
                onChange={(e) => handleExportFilterChange('year', e.target.value)}
                inputProps={{ min: 2000, max: 2100 }}
                sx={{ borderRadius: 2 }}
              />

              {/* Bulan Absen */}
              <FormControl fullWidth>
                <InputLabel>Bulan Absen</InputLabel>
                <Select
                  value={exportFilters.month}
                  label="Bulan Absen"
                  onChange={(e) => handleExportFilterChange('month', e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="01">Januari</MenuItem>
                  <MenuItem value="02">Februari</MenuItem>
                  <MenuItem value="03">Maret</MenuItem>
                  <MenuItem value="04">April</MenuItem>
                  <MenuItem value="05">Mei</MenuItem>
                  <MenuItem value="06">Juni</MenuItem>
                  <MenuItem value="07">Juli</MenuItem>
                  <MenuItem value="08">Agustus</MenuItem>
                  <MenuItem value="09">September</MenuItem>
                  <MenuItem value="10">Oktober</MenuItem>
                  <MenuItem value="11">November</MenuItem>
                  <MenuItem value="12">Desember</MenuItem>
                </Select>
              </FormControl>

              {/* Metode Export */}
              <FormControl fullWidth>
                <InputLabel>Metode Export Data</InputLabel>
                <Select
                  value={exportFilters.exportMethod}
                  label="Metode Export Data"
                  onChange={(e) => handleExportFilterChange('exportMethod', e.target.value)}
                  sx={{ borderRadius: 2 }}
                >
                  <MenuItem value="pdf">Files PDF</MenuItem>
                  <MenuItem value="excel">Files Excel</MenuItem>
                </Select>
              </FormControl>
            </Box>
          </DialogContent>
          <DialogActions sx={{ p: 3, pt: 1 }}>
            <Button 
              onClick={handleCloseExportDialog} 
              sx={{ color: '#64748b' }}
              disabled={exportLoading}
            >
              Batal
            </Button>
            <Button
              onClick={handleExport}
              variant="contained"
              startIcon={exportLoading ? <CircularProgress size={16} /> : <Download />}
              disabled={exportLoading}
              sx={{
                bgcolor: '#1976d2',
                '&:hover': { bgcolor: '#1565c0' },
                borderRadius: 2,
                px: 3,
              }}
            >
              {exportLoading ? 'Mengekspor...' : 'Export'}
            </Button>
          </DialogActions>
        </Dialog>

        {/* Print Preview Dialog */}
        <Dialog
          open={printPreview.open}
          onClose={() => setPrintPreview({ open: false, content: '' })}
          maxWidth="md"
          fullWidth
        >
          <DialogTitle>Print Absensi</DialogTitle>
          <DialogContent dividers sx={{ height: 600, bgcolor: '#edf2ff' }}>
            {printPreview.content && (
              <iframe
                id="attendance-print-frame"
                title="print-preview"
                srcDoc={printPreview.content}
                style={{ width: '100%', height: '100%', border: 'none', borderRadius: 12 }}
              />
            )}
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setPrintPreview({ open: false, content: '' })} sx={{ color: '#64748b' }}>
              Tutup
            </Button>
            <Button onClick={handleExecutePrint} variant="contained" sx={{ bgcolor: '#1976d2', '&:hover': { bgcolor: '#1565c0' } }}>
              Cetak
            </Button>
          </DialogActions>
        </Dialog>

        {/* Delete Confirmation Dialog */}
        <Dialog
          open={deleteConfirm.open}
          onClose={() => setDeleteConfirm({ open: false, attendance: null })}
          maxWidth="xs"
          fullWidth
        >
          <DialogTitle>Hapus Data Absensi</DialogTitle>
          <DialogContent dividers>
            <Typography>
              Apakah Anda yakin ingin menghapus absensi{' '}
              <strong>{deleteConfirm.attendance?.name}</strong>?
            </Typography>
          </DialogContent>
          <DialogActions>
            <Button onClick={() => setDeleteConfirm({ open: false, attendance: null })} sx={{ color: '#64748b' }}>
              Batal
            </Button>
            <Button
              onClick={handleDeleteAttendance}
              variant="contained"
              sx={{ bgcolor: '#dc2626', '&:hover': { bgcolor: '#b91c1c' } }}
              disabled={deletingId === deleteConfirm.attendance?.id}
            >
              {deletingId === deleteConfirm.attendance?.id ? 'Menghapus...' : 'Hapus'}
            </Button>
          </DialogActions>
        </Dialog>
      </Box>
    </Fade>
  );
};

export default Attendance;
