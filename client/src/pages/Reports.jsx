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
  const [selectedGrade, setSelectedGrade] = useState('all');
  const [reportType, setReportType] = useState('attendance');
  const [attendanceData, setAttendanceData] = useState([]);
  const [studentData, setStudentData] = useState([]);
  const [summaryData, setSummaryData] = useState({});
  const { colors, mode } = useThemeContext();
  const cardStyle = {
    borderRadius: 6,
    border: `1px solid ${colors.border}`,
    backgroundColor: colors.card,
    boxShadow: 'none',
  };

  const grades = ['all', '1', '2', '3', '4', '5', '6'];

  useEffect(() => {
    loadReportData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedDate, selectedGrade, reportType]);

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
      const gradeParam = selectedGrade;

      // Fetch summary
      const summaryRes = await fetch(
        `/api/reports/summary?date=${dateParam}&grade=${gradeParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const summary = await summaryRes.json();

      // Fetch attendance trend
      const attendanceRes = await fetch(
        `/api/reports/attendance?end=${dateParam}&grade=${gradeParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const attendance = await attendanceRes.json();

      // Fetch student details
      const studentRes = await fetch(
        `/api/reports/employees?date=${dateParam}&grade=${gradeParam}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );
      const students = await studentRes.json();

      // Hitung rata-rata kehadiran dari studentData
      let avgRate = 0;
      if (students.length > 0) {
        const totalRate = students.reduce((acc, e) => acc + (e.attendanceRate || 0), 0);
        avgRate = Math.round(totalRate / students.length);
      }

      setSummaryData({
        ...summary,
        averageAttendanceRate: avgRate || summary.averageAttendanceRate || 0,
      });
      setAttendanceData(attendance);
      setStudentData(students);
    } catch (error) {
      console.error('Error loading report data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format) => {
    try {
      const dateStr = formatDate(selectedDate);
      const gradeStr = selectedGrade === 'all' ? 'Semua Kelas' : `Kelas ${selectedGrade}`;
      const fileName = `Laporan_Absensi_${dateStr}_${gradeStr.replace(/\s+/g, '_')}`;

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
      doc.text('LAPORAN ABSENSI SISWA', pageWidth / 2, yPos, { align: 'center' });
      yPos += 10;

      doc.setFontSize(12);
      doc.setFont('helvetica', 'normal');
      doc.text(`Tanggal: ${formatDate(selectedDate)}`, margin, yPos);
      yPos += 6;
      doc.text(`Kelas: ${selectedGrade === 'all' ? 'Semua Kelas' : `Kelas ${selectedGrade}`}`, margin, yPos);
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

      // Student Data Table
      if (studentData.length > 0) {
        doc.setFontSize(14);
        doc.setFont('helvetica', 'bold');
        doc.text('Detail Kehadiran Siswa', margin, yPos);
        yPos += 10;

        const tableData = studentData.map((stu) => [
          stu.name,
          stu.grade ? `Kelas ${stu.grade}` : (stu.department || '-'),
          stu.presentDays || 0,
          stu.absentDays || 0,
          stu.lateDays || 0,
          `${stu.attendanceRate || 0}%`,
          stu.lastAttendance
            ? new Date(stu.lastAttendance).toLocaleDateString('id-ID')
            : '-',
        ]);

        // Check if autoTable is available
        if (typeof doc.autoTable === 'function') {
          doc.autoTable({
            startY: yPos,
            head: [['Nama', 'Kelas', 'Hadir', 'Tidak Hadir', 'Terlambat', 'Tingkat Kehadiran', 'Terakhir Hadir']],
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
          doc.text('Data siswa terlalu banyak untuk ditampilkan dalam format sederhana.', margin, yPos);
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
      ['LAPORAN ABSENSI SISWA'],
      [],
      ['Tanggal', formatDate(selectedDate)],
      ['Kelas', selectedGrade === 'all' ? 'Semua Kelas' : `Kelas ${selectedGrade}`],
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

    // Student Data Sheet
    if (studentData.length > 0) {
      const studentHeaders = [
        ['LAPORAN KEHADIRAN SISWA'],
        [],
        ['Nama', 'Kelas', 'Hari Hadir', 'Hari Tidak Hadir', 'Hari Terlambat', 'Tingkat Kehadiran (%)', 'Terakhir Hadir'],
      ];

      const studentRows = studentData.map((stu) => [
        stu.name,
        stu.grade ? `Kelas ${stu.grade}` : (stu.department || '-'),
        stu.presentDays || 0,
        stu.absentDays || 0,
        stu.lateDays || 0,
        stu.attendanceRate || 0,
        stu.lastAttendance
          ? new Date(stu.lastAttendance).toLocaleDateString('id-ID')
          : '-',
      ]);

      const studentWS = XLSX.utils.aoa_to_sheet([...studentHeaders, ...studentRows]);
      studentWS['!cols'] = [
        { wch: 25 },
        { wch: 15 },
        { wch: 12 },
        { wch: 15 },
        { wch: 15 },
        { wch: 18 },
        { wch: 15 },
      ];
      XLSX.utils.book_append_sheet(wb, studentWS, 'Detail Siswa');
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
                    <MenuItem value="employee">Laporan Siswa</MenuItem>
                    <MenuItem value="grade">Laporan Kelas</MenuItem>
                  </Select>
                </FormControl>
              </Grid>
              <Grid item xs={12} md={3}>
                <FormControl fullWidth>
                  <InputLabel>Kelas</InputLabel>
                  <Select
                    value={selectedGrade}
                    label="Kelas"
                    onChange={(e) => setSelectedGrade(e.target.value)}
                  >
                    {grades.map((grade) => (
                      <MenuItem key={grade} value={grade}>
                        {grade === 'all' ? 'Semua Kelas' : `Kelas ${grade}`}
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

        {/* Student Attendance Table */}
        <Card sx={{ ...cardStyle, mt: 4 }}>
          <CardContent>
            <Typography variant="h6" sx={{ mb: 2 }}>
              Laporan Kehadiran Siswa
            </Typography>

            <TableContainer component={Paper} sx={{ borderRadius: 2, backgroundColor: colors.card, border: `1px solid ${colors.border}` }}>
              <Table>
                <TableHead>
                  <TableRow sx={{ backgroundColor: mode === 'dark' ? '#1f2937' : 'grey.50' }}>
                    <TableCell>Siswa</TableCell>
                    <TableCell>Kelas</TableCell>
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
                  ) : studentData.length === 0 ? (
                    <TableRow>
                      <TableCell colSpan={8} align="center" sx={{ py: 4 }}>
                        <Typography color="text.secondary">
                          Tidak ada data kehadiran
                        </Typography>
                      </TableCell>
                    </TableRow>
                  ) : (
                    studentData.map((student) => (
                      <TableRow key={student.id} hover>
                        <TableCell>
                          <Typography variant="body2" sx={{ fontWeight: 600 }}>
                            {student.name}
                          </Typography>
                        </TableCell>
                        <TableCell>
                          <Chip
                            label={student.grade ? `Kelas ${student.grade}` : '-'}
                            size="small"
                            variant="outlined"
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <CheckIcon sx={{ fontSize: 16, color: 'success.main' }} />
                            <Typography variant="body2">
                              {student.presentDays}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ErrorIcon sx={{ fontSize: 16, color: 'error.main' }} />
                            <Typography variant="body2">
                              {student.absentDays}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                            <ScheduleIcon sx={{ fontSize: 16, color: 'warning.main' }} />
                            <Typography variant="body2">
                              {student.lateDays}
                            </Typography>
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 1 }}>
                            <Typography variant="body2" sx={{ fontWeight: 600 }}>
                              {student.attendanceRate}%
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              dari {student.workingDays || '-'} hari sekolah
                            </Typography>
                            <Chip
                              label={getAttendanceRateText(student.attendanceRate)}
                              size="small"
                              color={getAttendanceRateColor(student.attendanceRate)}
                              sx={{ borderRadius: 1 }}
                            />
                          </Box>
                        </TableCell>
                        <TableCell>
                          <Chip
                            icon={student.attendanceRate >= 80 ? <TrendingUpIcon /> : <TrendingDownIcon />}
                            label={student.attendanceRate >= 80 ? 'Baik' : 'Perlu Perhatian'}
                            color={student.attendanceRate >= 80 ? 'success' : 'warning'}
                            size="small"
                            sx={{ borderRadius: 1 }}
                          />
                        </TableCell>
                        <TableCell>
                          <Typography variant="body2">
                            {student.lastAttendance
                              ? new Date(student.lastAttendance).toLocaleDateString('id-ID')
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
                  Kelas Terbaik
                </Typography>
                <Alert severity="success" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Kelas {summaryData.topGrade}</strong> memiliki tingkat kehadiran tertinggi
                  </Typography>
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Kelas ini menunjukkan konsistensi dalam kehadiran dan kedisiplinan siswa.
                </Typography>
              </CardContent>
            </Card>
          </Grid>

          <Grid item xs={12} md={6}>
            <Card sx={cardStyle}>
              <CardContent>
                <Typography variant="h6" sx={{ mb: 2 }}>
                  Kelas Perlu Perhatian
                </Typography>
                <Alert severity="warning" sx={{ mb: 2 }}>
                  <Typography variant="body2">
                    <strong>Kelas {summaryData.lowestGrade}</strong> memiliki tingkat kehadiran terendah
                  </Typography>
                </Alert>
                <Typography variant="body2" color="text.secondary">
                  Perlu evaluasi dan tindakan untuk meningkatkan kedisiplinan siswa.
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
