import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import {
  Box,
  Card,
  CardContent,
  Typography,
  Button,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Grid,
  CircularProgress,
  IconButton,
  Tooltip
} from '@mui/material';
import {
  Print as PrintIcon,
  ArrowBack as ArrowBackIcon,
  Download as DownloadIcon
} from '@mui/icons-material';
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import * as XLSX from 'xlsx';

const MonthlyRecap = () => {
  const [loading, setLoading] = useState(false);
  const [students, setStudents] = useState([]);
  const [selectedMonth, setSelectedMonth] = useState(new Date().getMonth() + 1);
  const [selectedYear, setSelectedYear] = useState(new Date().getFullYear());
  const [selectedGrade, setSelectedGrade] = useState('all');
  
  const months = [
    { value: 1, label: 'Januari' },
    { value: 2, label: 'Februari' },
    { value: 3, label: 'Maret' },
    { value: 4, label: 'April' },
    { value: 5, label: 'Mei' },
    { value: 6, label: 'Juni' },
    { value: 7, label: 'Juli' },
    { value: 8, label: 'Agustus' },
    { value: 9, label: 'September' },
    { value: 10, label: 'Oktober' },
    { value: 11, label: 'November' },
    { value: 12, label: 'Desember' }
  ];

  const years = Array.from({ length: 5 }, (_, i) => new Date().getFullYear() - i);
  const grades = [1, 2, 3, 4, 5, 6];

  useEffect(() => {
    fetchData();
  }, [selectedMonth, selectedYear, selectedGrade]);

  const fetchData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) return;

      const response = await axios.get('http://localhost:5000/api/reports/monthly-recap', {
        params: {
          month: selectedMonth,
          year: selectedYear,
          grade: selectedGrade
        },
        headers: { Authorization: `Bearer ${token}` }
      });

      setStudents(response.data);
    } catch (error) {
      console.error('Error fetching monthly recap:', error);
    } finally {
      setLoading(false);
    }
  };

  const getDaysInMonth = (month, year) => {
    return new Date(year, month, 0).getDate();
  };

  const daysInMonth = getDaysInMonth(selectedMonth, selectedYear);
  const daysArray = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const getStatusCode = (status) => {
    switch (status) {
      case 'present': return 'H';
      case 'late': return 'T';
      case 'permission': return 'I';
      case 'sick': return 'S';
      case 'absent': return 'A';
      default: return '-';
    }
  };

  const getStatusColor = (status) => {
    switch (status) {
      case 'present': return '#d1fae5'; // green-100
      case 'late': return '#fef3c7'; // yellow-100
      case 'permission': return '#dbeafe'; // blue-100
      case 'sick': return '#e0e7ff'; // indigo-100
      case 'absent': return '#fee2e2'; // red-100
      default: return 'transparent';
    }
  };

  const getEffectiveStatus = (student, day) => {
    const status = student.attendance[day];
    if (status) return status;

    // Check if date is valid for Alpha
    const date = new Date(selectedYear, selectedMonth - 1, day);
    const today = new Date();
    today.setHours(0, 0, 0, 0);

    // If future date, return empty
    if (date > today) return null;

    // If Sunday, return empty (or holiday)
    if (date.getDay() === 0) return null;

    // If past/today and no status -> Alpha
    return 'absent';
  };

  const calculateStats = (student) => {
    let h = 0, s = 0, i = 0, a = 0, t = 0;
    
    daysArray.forEach(day => {
      const status = getEffectiveStatus(student, day);
      if (status === 'present') h++;
      else if (status === 'sick') s++;
      else if (status === 'permission') i++;
      else if (status === 'absent') a++;
      else if (status === 'late') t++;
    });
    
    return { h, s, i, a, t };
  };

  const handlePrint = () => {
    window.print();
  };

  const handleExportPDF = () => {
    const doc = new jsPDF('l', 'mm', 'a4'); // Landscape
    
    // Title
    doc.setFontSize(16);
    doc.text(`REKAP ABSENSI BULAN ${months.find(m => m.value === selectedMonth)?.label.toUpperCase()} ${selectedYear}`, 14, 20);
    doc.setFontSize(12);
    doc.text(`Kelas: ${selectedGrade === 'all' ? 'Semua' : selectedGrade}`, 14, 28);

    // Table
    const tableColumn = [
      'No', 'Nama Siswa', 
      ...daysArray.map(d => d.toString()), 
      'H', 'S', 'I', 'A'
    ];

    const tableRows = students.map((student, index) => {
      const stats = calculateStats(student);
      const row = [
        index + 1,
        student.name,
        ...daysArray.map(day => {
          const status = getEffectiveStatus(student, day);
          return status ? getStatusCode(status) : '-';
        }),
        stats.h + stats.t, // Total Hadir (termasuk terlambat)
        stats.s,
        stats.i,
        stats.a
      ];
      return row;
    });

    doc.autoTable({
      head: [tableColumn],
      body: tableRows,
      startY: 35,
      styles: { fontSize: 7, cellPadding: 1 },
      columnStyles: {
        0: { cellWidth: 8 },
        1: { cellWidth: 40 },
        // Dynamic width for date columns
      },
      theme: 'grid'
    });

    // Signature
    const finalY = doc.lastAutoTable.finalY + 20;
    doc.text(`.................., ${new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}`, 200, finalY);
    doc.text('Wali Kelas,', 200, finalY + 7);
    doc.text('(_______________________)', 200, finalY + 30);

    doc.save(`rekap_absensi_${selectedMonth}_${selectedYear}.pdf`);
  };

  return (
    <Box sx={{ p: 3 }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }} className="no-print">
        <Typography variant="h5" sx={{ fontWeight: 'bold', color: '#1e293b' }}>
          Rekap Bulanan
        </Typography>
        <Box>
          <Button 
            variant="outlined" 
            startIcon={<PrintIcon />} 
            onClick={handlePrint}
            sx={{ mr: 1 }}
          >
            Cetak
          </Button>
          <Button 
            variant="contained" 
            startIcon={<DownloadIcon />} 
            onClick={handleExportPDF}
          >
            Export PDF
          </Button>
        </Box>
      </Box>

      {/* Filters */}
      <Card sx={{ mb: 3 }} className="no-print">
        <CardContent>
          <Grid container spacing={2} alignItems="center">
            <Grid item xs={12} md={3}>
              <FormControl fullWidth size="small">
                <InputLabel>Bulan</InputLabel>
                <Select
                  value={selectedMonth}
                  label="Bulan"
                  onChange={(e) => setSelectedMonth(e.target.value)}
                >
                  {months.map((m) => (
                    <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Tahun</InputLabel>
                <Select
                  value={selectedYear}
                  label="Tahun"
                  onChange={(e) => setSelectedYear(e.target.value)}
                >
                  {years.map((y) => (
                    <MenuItem key={y} value={y}>{y}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <FormControl fullWidth size="small">
                <InputLabel>Kelas</InputLabel>
                <Select
                  value={selectedGrade}
                  label="Kelas"
                  onChange={(e) => setSelectedGrade(e.target.value)}
                >
                  <MenuItem value="all">Semua</MenuItem>
                  {grades.map((g) => (
                    <MenuItem key={g} value={g}>Kelas {g}</MenuItem>
                  ))}
                </Select>
              </FormControl>
            </Grid>
            <Grid item xs={12} md={2}>
              <Button 
                variant="contained" 
                fullWidth 
                onClick={fetchData}
                disabled={loading}
              >
                {loading ? <CircularProgress size={24} color="inherit" /> : 'Tampilkan'}
              </Button>
            </Grid>
          </Grid>
        </CardContent>
      </Card>

      {/* Report View */}
      <Paper sx={{ p: 2, overflowX: 'auto' }}>
        <Box sx={{ textAlign: 'center', mb: 3 }}>
          <Typography variant="h6" sx={{ fontWeight: 'bold' }}>REKAP ABSENSI SISWA</Typography>
          <Typography variant="subtitle1">
            Bulan: {months.find(m => m.value === selectedMonth)?.label} {selectedYear}
          </Typography>
          {selectedGrade !== 'all' && (
            <Typography variant="subtitle2">Kelas: {selectedGrade}</Typography>
          )}
        </Box>

        <TableContainer>
          <Table size="small" sx={{ minWidth: 1200, border: '1px solid #e2e8f0' }}>
            <TableHead>
              <TableRow sx={{ bgcolor: '#1e293b' }}>
                <TableCell rowSpan={2} sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center', width: 40 }}>No</TableCell>
                <TableCell rowSpan={2} sx={{ color: 'white', border: '1px solid #475569', minWidth: 200 }}>Nama Siswa</TableCell>
                <TableCell colSpan={daysInMonth} sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center' }}>
                  Tanggal ({months.find(m => m.value === selectedMonth)?.label})
                </TableCell>
                <TableCell colSpan={4} sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center' }}>Total</TableCell>
              </TableRow>
              <TableRow sx={{ bgcolor: '#334155' }}>
                {daysArray.map(day => (
                  <TableCell key={day} sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center', minWidth: 28, padding: '4px' }}>
                    {day}
                  </TableCell>
                ))}
                <TableCell sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center', bgcolor: '#10b981', width: 30 }}>H</TableCell>
                <TableCell sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center', bgcolor: '#3b82f6', width: 30 }}>S</TableCell>
                <TableCell sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center', bgcolor: '#f59e0b', width: 30 }}>I</TableCell>
                <TableCell sx={{ color: 'white', border: '1px solid #475569', textAlign: 'center', bgcolor: '#ef4444', width: 30 }}>A</TableCell>
              </TableRow>
            </TableHead>
            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={daysInMonth + 6} align="center" sx={{ py: 4 }}>
                    <CircularProgress />
                  </TableCell>
                </TableRow>
              ) : students.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={daysInMonth + 6} align="center" sx={{ py: 4 }}>
                    Tidak ada data siswa
                  </TableCell>
                </TableRow>
              ) : (
                students.map((student, index) => {
                  const stats = calculateStats(student);
                  return (
                    <TableRow key={student.id} hover>
                      <TableCell align="center" sx={{ border: '1px solid #e2e8f0' }}>{index + 1}</TableCell>
                      <TableCell sx={{ border: '1px solid #e2e8f0', fontWeight: 500 }}>{student.name}</TableCell>
                      {daysArray.map(day => {
                        const status = getEffectiveStatus(student, day);
                        const code = status ? getStatusCode(status) : '-';
                        const color = status ? getStatusColor(status) : 'transparent';
                        return (
                          <TableCell 
                            key={day} 
                            align="center" 
                            sx={{ 
                              border: '1px solid #e2e8f0', 
                              bgcolor: color,
                              padding: '2px',
                              fontSize: '0.75rem'
                            }}
                          >
                            {code !== '-' ? code : ''}
                          </TableCell>
                        );
                      })}
                      <TableCell align="center" sx={{ border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{stats.h + stats.t}</TableCell>
                      <TableCell align="center" sx={{ border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{stats.s}</TableCell>
                      <TableCell align="center" sx={{ border: '1px solid #e2e8f0', fontWeight: 'bold' }}>{stats.i}</TableCell>
                      <TableCell align="center" sx={{ border: '1px solid #e2e8f0', fontWeight: 'bold', color: 'error.main' }}>{stats.a}</TableCell>
                    </TableRow>
                  );
                })
              )}
            </TableBody>
          </Table>
        </TableContainer>

        <Box sx={{ mt: 4, display: 'flex', justifyContent: 'flex-end' }}>
          <Box sx={{ textAlign: 'center', minWidth: 200 }}>
            <Typography variant="body2">
              .................., {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}
            </Typography>
            <Typography variant="body2" sx={{ mt: 1 }}>Wali Kelas,</Typography>
            <Box sx={{ height: 60 }} />
            <Typography variant="body2" sx={{ borderTop: '1px solid black', pt: 1 }}>
              (_______________________)
            </Typography>
          </Box>
        </Box>
      </Paper>
    </Box>
  );
};

export default MonthlyRecap;
