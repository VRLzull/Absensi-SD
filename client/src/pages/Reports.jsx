 import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Button,
  Card,
  CardContent,
  Grid,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Paper,
  Chip,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  TextField,
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Download as DownloadIcon,
  Refresh as RefreshIcon,
  FilterList as FilterIcon,
  TrendingUp as TrendingUpIcon,
  TrendingDown as TrendingDownIcon,
  CheckCircle as CheckIcon,
  Error as ErrorIcon,
  Schedule as ScheduleIcon,
} from '@mui/icons-material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
} from 'recharts';
import jsPDF from 'jspdf';
import * as XLSX from 'xlsx';

// Import jspdf-autotable - ini akan menambahkan method autoTable ke prototype jsPDF
import 'jspdf-autotable';
import { useTheme as useThemeContext } from '../contexts/ThemeContext';

const Reports = () => {
  const [loading, setLoading] = useState(false);
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [selectedDepartment, setSelectedDepartment] = useState('all');
  const [reportType, setReportType] = useState('attendance');
  const [attendanceData, setAttendanceData] = useState([]);
  const [employeeData, setEmployeeData] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const { colors, mode } = useThemeContext();
  const cardStyle = {
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.card,
    boxShadow: 'none',
  };

  const departments = ['all', 'IT', 'HR', 'Finance', 'Marketing', 'Sales', 'Operations'];

  useEffect(() => {
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedDepartment, reportType]);

  const formatDate = (date) => {
    return date.toISOString().split('T')[0]; // yyyy-mm-dd
  };

  const loadReportData = async () => {
    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      if (!token) {
        console.warn('Token autentikasi tidak ditemukan');
        return;
      }

      const dateParam = formatDate(selectedDate);
      const deptParam = selectedDepartment;

      // Fetch summary
      const summaryRes = await fetch(
        `/api/reports/summary?date=${dateParam}&department=${deptParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const summary = await summaryRes.json();

      // Fetch attendance trend
      const attendanceRes = await fetch(
        `/api/reports/attendance?end=${dateParam}&department=${deptParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const attendance = await attendanceRes.json();

      // Fetch employee details
      const employeeRes = await fetch(
        `/api/reports/employees?date=${dateParam}&department=${deptParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const employees = await employeeRes.json();

      // Hitung rata-rata kehadiran dari employeeData
      let avgRate = 0;
      if (employees.length > 0) {
        const totalRate = employees.reduce((acc, e) => acc + (e.attendanceRate || 0), 0);
        avgRate = Math.round(totalRate / employees.length);
      }

      setSummaryData({
        ...summary,
        averageAttendanceRate: avgRate || summary.averageAttendanceRate || 0,
      });
      setAttendanceData(attendance);
      setEmployeeData(employees);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    try {
      const dateStr = formatDate(selectedDate);
      const deptStr = selectedDepartment === 'all' ? 'Semua Departemen' : selectedDepartment;
      const fileName = `Laporan_Absensi_${dateStr}_${deptStr.replace(/\s+/g, '_')}`;

      if (format === 'pdf') {
        exportToPDF(fileName);
      } else if (format === 'excel') {
        exportToExcel(fileName);
      }
    } catch (error) {
      console.error('Error exporting report:', error);
      alert('Terjadi kesalahan saat mengekspor laporan');
    }
  };

  const exportToPDF = (fileName, options = { autoPrint: false }) => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const margin = 14;
      let yPos = 20;

      // Header
      doc.setFontSize(18);
      doc.setFont('helvetica', 'bold');
      doc.text('LAPORAN ABSENSI', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal: ${formatDate(selectedDate)}`, margin, yPos);
      yPos += 6;
      doc.text(`Departemen: ${selectedDepartment === 'all' ? 'Semua Departemen' : selectedDepartment}`, margin, yPos);
      yPos += 6;
      doc.text(`Dibuat: ${new Date().toLocaleString('id-ID')}`, margin, yPos);
      yPos += 15;

      // Summary Section
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Ringkasan', margin, yPos);
      yPos += 10;

      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      const summaryRows = [
        ['Hadir Hari Ini', summaryData.presentToday || 0],
        ['Tidak Hadir', summaryData.absentToday || 0],
        ['Terlambat', summaryData.lateToday || 0],
        ['Rata-rata Kehadiran', `${summaryData.averageAttendanceRate || 0}%`],
      ];

      // Check if autoTable is available
      if (typeof doc.autoTable === 'function') {
        doc.autoTable({
          startY: yPos,
          head: [['Item', 'Nilai']],
          body: summaryRows,
          theme: 'grid',
          headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
          margin: { left: margin, right: margin },
        });
        yPos = doc.lastAutoTable.finalY + 15;
      } else {
        // Fallback: manual table
        doc.setFontSize(10);
        doc.setFont('helvetica', 'bold');
        doc.text('Item', margin, yPos);
        doc.text('Nilai', pageWidth - margin - 30, yPos);
        yPos += 8;
        doc.setFont('helvetica', 'normal');
        summaryRows.forEach((row) => {
          doc.text(row[0], margin, yPos);
          doc.text(String(row[1]), pageWidth - margin - 30, yPos);
          yPos += 7;
        });
        yPos += 5;
      }

      // Employee Data Table
      if (employeeData.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Detail Kehadiran Pegawai', margin, yPos);
        yPos += 10;

        const tableData = employeeData.map((emp) => [
          emp.name,
          emp.department,
          emp.presentDays || 0,
          emp.absentDays || 0,
          emp.lateDays || 0,
          `${emp.attendanceRate || 0}%`,
          emp.lastAttendance
            ? new Date(emp.lastAttendance).toLocaleDateString('id-ID')
            : '-',
        ]);

        // Check if autoTable is available
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: yPos,
            head: [['Nama', 'Departemen', 'Hadir', 'Tidak Hadir', 'Terlambat', 'Tingkat Kehadiran', 'Terakhir Hadir']],
            body: tableData,
            theme: 'grid',
            headStyles: { fillColor: [25, 118, 210], textColor: 255, fontStyle: 'bold' },
            margin: { left: margin, right: margin },
            styles: { fontSize: 8 },
            headStyles: { fontSize: 9 },
          });
        } else {
          // Fallback message
          doc.setFontSize(10);
          doc.setFont('helvetica', 'normal');
          doc.text('Data pegawai terlalu banyak untuk ditampilkan dalam format sederhana.', margin, yPos);
          doc.text('Silakan gunakan export Excel untuk melihat detail lengkap.', margin, yPos + 7);
        }
      }

      // Output
      if (options.autoPrint) {
        // @ts-ignore
        doc.autoPrint();
        const blobUrl = doc.output('bloburl');
        window.open(blobUrl, '_blank');
      } else {
        doc.save(`${fileName}.pdf`);
      }
    } catch (error) {
      console.error('Error generating PDF:', error);
      alert('Terjadi kesalahan saat membuat PDF. Pastikan jspdf-autotable terinstall dengan benar.');
    }
  };

  const exportToExcel = (fileName) => {
    // Create workbook
    const wb = XLSX.utils.book_new();

    // Summary Sheet
    const summaryWS = XLSX.utils.aoa_to_sheet([
      ['LAPORAN ABSENSI'],
      [],
      ['Tanggal', formatDate(selectedDate)],
      ['Departemen', selectedDepartment === 'all' ? 'Semua Departemen' : selectedDepartment],
      ['Dibuat', new Date().toLocaleString('id-ID')],
      [],
      ['RINGKASAN'],
      ['Item', 'Nilai'],
      ['Hadir Hari Ini', summaryData.presentToday || 0],
      ['Tidak Hadir', summaryData.absentToday || 0],
      ['Terlambat', summaryData.lateToday || 0],
      ['Rata-rata Kehadiran', `${summaryData.averageAttendanceRate || 0}%`],
    ]);

    // Set column widths
    summaryWS['!cols'] = [{ wch: 25 }, { wch: 15 }];
    XLSX.utils.book_append_sheet(wb, summaryWS, 'Ringkasan');

    // Employee Data Sheet
    if (employeeData.length > 0) {
      const employeeHeaders = [
        ['LAPORAN KEHADIRAN PEGAWAI'],
        [],
        ['Nama', 'Departemen', 'Hari Hadir', 'Hari Tidak Hadir', 'Hari Terlambat', 'Tingkat Kehadiran (%)', 'Terakhir Hadir'],
      ];

      const employeeRows = employeeData.map((emp) => [
        emp.name,
        emp.department,
        emp.presentDays || 0,
        emp.absentDays || 0,
        emp.lateDays || 0,
        emp.attendanceRate || 0,
        emp.lastAttendance
          ? new Date(emp.lastAttendance).toLocaleDateString('id-ID')
          : '-',
      ]);

      const employeeWS = XLSX.utils.aoa_to_sheet([...employeeHeaders, ...employeeRows]);
      employeeWS['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, employeeWS, 'Detail Pegawai');
    }

    // Attendance Trend Sheet
    if (attendanceData.length > 0) {
      const trendHeaders = [['TREN KEHADIRAN (7 HARI TERAKHIR)'], [], ['Tanggal', 'Hadir', 'Tidak Hadir', 'Terlambat']];
      const trendRows = attendanceData.map((item) => [
        item.date,
        item.present || 0,
        item.absent || 0,
        item.late || 0,
      ]);

      const trendWS = XLSX.utils.aoa_to_sheet([...trendHeaders, ...trendRows]);
      trendWS['!cols'] = [{ wch: 15 }, { wch: 10 }, { wch: 12 }, { wch: 12 }];
      XLSX.utils.book_append_sheet(wb, trendWS, 'Tren Kehadiran');
    }

    // Save Excel file
    XLSX.writeFile(wb, `${fileName}.xlsx`);
  };

  const getAttendanceRateColor = (rate) => {
    if (rate >= 90) return 'success';
    if (rate >= 80) return 'warning';
    return 'error';
  };

  const getAttendanceRateText = (rate) => {
    if (rate >= 90) return 'Excellent';
    if (rate >= 80) return 'Good';
    if (rate >= 70) return 'Fair';
    return 'Poor';
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box sx={{ color: colors.textPrimary }}>
        {/* Header */}
        <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 3 }}>
          <Typography variant="h4" component="h1" sx={{ fontWeight: 600 }}>
            Laporan
          </Typography>
          <Box sx={{ display: 'flex', gap: 1 }}>
            <Button
              variant="outlined"
              startIcon={<RefreshIcon />}
              onClick={loadReportData}
              disabled={loading}
            >
              Refresh
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('pdf')}
            >
              Export PDF
            </Button>
            <Button
              variant="outlined"
              startIcon={<DownloadIcon />}
              onClick={() => handleExport('excel')}
            >
              Export Excel
            </Button>
          </Box>
        </Box>

        {/* Filters */}
        <Card sx={{ ...cardStyle, mb: 3 }}>
          <CardContent>
            <Grid container spacing={2} alignItems="center">
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Jenis Laporan</InputLabel>
                  <Select
                    value={reportType}
                    label="Jenis Laporan"
                    onChange={(e) => setReportType(e.target.value)}
                  >
                    <MenuItem value="attendance">Laporan Absensi</MenuItem>
                    <MenuItem value="employee">Laporan Pegawai</MenuItem>
                    <MenuItem value="department">Laporan Departemen</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Departemen</InputLabel>
                  <Select
                    value={selectedDepartment}
                    label="Departemen"
                    onChange={(e) => setSelectedDepartment(e.target.value)}
                  >
                    {departments.map((dept) => (
                      <MenuItem key={dept} value={dept}>
                        {dept === 'all' ? 'Semua Departemen' : dept}
                      </MenuItem>
                    ))}
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <DatePicker
                  label="Tanggal"
                  value={selectedDate}
                  onChange={(newValue) => setSelectedDate(newValue)}
                  renderInput={(params) => <TextField {...params} fullWidth />}
                />
              </Grid>
              <Grid item xs={12} md={3}>
                <Button
                  variant="contained"
                  startIcon={<FilterIcon />}
                  fullWidth
                  onClick={loadReportData}
                >
                  Terapkan Filter
                </Button>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Summary Cards */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={3}>
            <Card sx={cardStyle}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'success.main', mb: 1 }}>
                  {summaryData.presentToday || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Hadir Hari Ini
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={cardStyle}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'error.main', mb: 1 }}>
                  {summaryData.absentToday || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Tidak Hadir
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={cardStyle}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'warning.main', mb: 1 }}>
                  {summaryData.lateToday || 0}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Terlambat
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={3}>
            <Card sx={cardStyle}>
              <CardContent sx={{ textAlign: 'center' }}>
                <Typography variant="h4" sx={{ fontWeight: 700, color: 'info.main', mb: 1 }}>
                  {summaryData.averageAttendanceRate || 0}%
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  Rata-rata Kehadiran
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Charts */}
        <Grid container spacing={3} sx={{ mb: 4 }}>
          <Grid item xs={12} md={8}>
            <Card sx={{ ...cardStyle, minHeight: 360 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Tren Kehadiran (7 Hari Terakhir)
                </Typography>
                <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={attendanceData}>
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis />
                    <RechartsTooltip />
                    <Line type="monotone" dataKey="present" stroke="#4caf50" strokeWidth={2} name="Hadir" />
                    <Line type="monotone" dataKey="absent" stroke="#f44336" strokeWidth={2} name="Tidak Hadir" />
                    <Line type="monotone" dataKey="late" stroke="#ff9800" strokeWidth={2} name="Terlambat" />
                  </LineChart>
                </ResponsiveContainer>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={4}>
            <Card sx={{ ...cardStyle, minHeight: 360 }}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Distribusi Kehadiran Hari Ini
                </Typography>
                {
                  (() => {
                    const pieData = [
                      { name: 'Hadir', value: summaryData.presentToday || 0, color: '#4caf50' },
                      { name: 'Tidak Hadir', value: summaryData.absentToday || 0, color: '#f44336' },
                      { name: 'Terlambat', value: summaryData.lateToday || 0, color: '#ff9800' },
                    ];
                    const total = pieData.reduce((acc, d) => acc + (Number(d.value) || 0), 0);

                    if (!total) {
                      return (
                        <Box display="flex" alignItems="center" justifyContent="center" height={300}>
                          <Typography color="text.secondary">
                            Tidak ada data untuk ditampilkan
                          </Typography>
                        </Box>
                      );
                    }

                    const LegendContent = () => (
                      <Box sx={{ position: 'absolute', left: 8, top: 8 }}>
                        {pieData.filter(d => d.value > 0).map(d => {
                          const pct = Math.round((d.value / total) * 100);
                          return (
                            <Box key={d.name} sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
                              <Box sx={{ width: 10, height: 10, borderRadius: '50%', bgcolor: d.color, mr: 1 }} />
                              <Typography variant="caption" sx={{ color: colors.textPrimary }}>{`${d.name} ${pct}%`}</Typography>
                            </Box>
                          );
                        })}
                      </Box>
                    );

                    return (
                      <Box sx={{ position: 'relative', height: 300 }}>
                        <ResponsiveContainer width="100%" height="100%">
                          <PieChart>
                            <Pie
                              data={pieData}
                              cx="60%"
                              cy="50%"
                              outerRadius={80}
                              dataKey="value"
                              label={false}
                              labelLine={false}
                            >
                              {pieData.map((entry, index) => (
                                <Cell key={`cell-${index}`} fill={entry.color} />
                              ))}
                            </Pie>
                          </PieChart>
                        </ResponsiveContainer>
                        <LegendContent />
                      </Box>
                    );
                  })()
                }
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Employee Attendance Table */}
        <Card sx={{ ...cardStyle, mt: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Laporan Kehadiran Pegawai
            </Typography>

            <TableContainer component={Paper} sx={{ borderRadius: 2, backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: mode === 'dark' ? '#1f2937' : 'grey.50' }}>
                    <TableCell>Pegawai</TableCell>
                    <TableCell>Departemen</TableCell>
                    <TableCell>Hari Hadir</TableCell>
                    <TableCell>Hari Tidak Hadir</TableCell>
                    <TableCell>Hari Terlambat</TableCell>
                    <TableCell>Tingkat Kehadiran</TableCell>
                    <TableCell>Status</TableCell>
                    <TableCell>Terakhir Hadir</TableCell>
                  </TableRow>
                </TableHead>
                <TableBody>
                  {loading ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <CircularProgress />
                      </TableCell>
                    </TableRow>
                  ) : employeeData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          Tidak ada data kehadiran
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    employeeData.map((employee) => (
                      <TableRow key={employee.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {employee.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={employee.department}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="body2">
                              {employee.presentDays}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            <Typography variant="body2">
                              {employee.absentDays}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography variant="body2">
                              {employee.lateDays}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {employee.attendanceRate}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              dari {employee.workingDays || '-'} hari kerja
                            </Typography>
                            <Chip
                              label={getAttendanceRateText(employee.attendanceRate)}
                              size="small"
                              color={getAttendanceRateColor(employee.attendanceRate)}
                              sx={{ borderRadius: 1 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={employee.attendanceRate >= 80 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={employee.attendanceRate >= 80 ? 'Baik' : 'Perlu Perhatian'}
                            color={employee.attendanceRate >= 80 ? 'success' : 'warning'}
                            size="small"
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {employee.lastAttendance
                              ? new Date(employee.lastAttendance).toLocaleDateString('id-ID')
                              : '-'}
                          </Typography>
                        </TableCell>
                      </TableRow>
                    ))
                  )}
                </TableBody>
              </Table>
            </TableContainer>
          </CardContent>
        </Card>

        {/* Additional Insights */}
        <Grid container spacing={3} sx={{ mt: 3 }}>
          <Grid item xs={12} md={6}>
            <Card sx={cardStyle}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Departemen Terbaik
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>{summaryData.topDepartment}</strong> memiliki tingkat kehadiran tertinggi
                  </Typography>
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Departemen ini menunjukkan konsistensi dalam kehadiran dan kedisiplinan pegawai.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={cardStyle}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Departemen Perlu Perhatian
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>{summaryData.lowestDepartment}</strong> memiliki tingkat kehadiran terendah
                  </Typography>
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Perlu evaluasi dan tindakan untuk meningkatkan kedisiplinan pegawai.
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        </Grid>
      </Box>
    </LocalizationProvider>
  );
};

export default Reports;
