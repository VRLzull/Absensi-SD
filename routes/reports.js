const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// -------------------- SUMMARY --------------------
router.get("/summary", async (req, res) => {
  try {
    const { date, department } = req.query;
    const filterDept = department && department !== "all" ? `AND e.department='${department}'` : "";

    // total employees
    const [totalEmployees] = await pool.query(
      `SELECT COUNT(*) AS total FROM employees e WHERE 1=1 ${filterDept}`
    );

    // hadir
    const [presentToday] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM attendance a 
       JOIN employees e ON a.employee_id = e.id
       WHERE DATE(a.check_in) = ? AND a.status='present' ${filterDept}`,
      [date]
    );

    // terlambat
    const [lateToday] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM attendance a 
       JOIN employees e ON a.employee_id = e.id
       WHERE DATE(a.check_in) = ? AND a.status='late' ${filterDept}`,
      [date]
    );

    // tidak hadir
    const [absentToday] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM employees e
       WHERE 1=1 ${filterDept}
       AND NOT EXISTS (
         SELECT 1 FROM attendance a
         WHERE a.employee_id = e.id 
         AND DATE(a.check_in) = ? 
         AND a.status IN ('present','late')
       )`,
      [date]
    );

    // Rata-rata kehadiran (7 hari terakhir) - PERBAIKAN SEDERHANA
    // Hitung working days dulu
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 6);
    const endDate = new Date(date);
    
    let workingDays = 0;
    const currentDate = new Date(startDate);
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    // Ambil data attendance per hari
    const [dailyData] = await pool.query(
      `SELECT DATE(a.check_in) as day,
              SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) as totalPresent
       FROM attendance a
       WHERE a.check_in >= DATE_SUB(?, INTERVAL 6 DAY) ${filterDept.replace('e.', 'a.')}
       GROUP BY DATE(a.check_in)`,
      [date]
    );

    // Hitung rata-rata dengan pembagian yang benar
    let totalPresent = 0;
    dailyData.forEach(day => {
      totalPresent += day.totalPresent;
    });

    // Ambil total pegawai
    const [totalEmp] = await pool.query(
      `SELECT COUNT(*) AS total FROM employees e WHERE 1=1 ${filterDept}`
    );

    const avgRate = workingDays > 0 && totalEmp[0].total > 0 
      ? Math.round((totalPresent / (workingDays * totalEmp[0].total)) * 100)
      : 0;

    // Departemen terbaik & terburuk
    const [deptRank] = await pool.query(
      `SELECT e.department,
              ROUND((SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(e.id))*100,0) AS rate
       FROM employees e
       LEFT JOIN attendance a ON e.id=a.employee_id AND DATE(a.check_in)=?
       GROUP BY e.department
       ORDER BY rate DESC`,
      [date]
    );

    res.json({
      totalEmployees: totalEmployees[0].total,
      presentToday: presentToday[0].total,
      absentToday: absentToday[0].total,
      lateToday: lateToday[0].total,
      averageAttendanceRate: avgRate, // Sudah number, bukan array
      topDepartment: deptRank[0]?.department || "-",
      lowestDepartment: deptRank[deptRank.length - 1]?.department || "-",
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- ATTENDANCE TREND (7 days) --------------------
router.get("/attendance", async (req, res) => {
  try {
    const { end, department } = req.query;
    const filterDept = department && department !== "all" ? `AND e.department='${department}'` : "";

    const [rows] = await pool.query(
      `SELECT DATE(a.check_in) as date,
              SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent
       FROM employees e
       LEFT JOIN attendance a ON e.id=a.employee_id
       WHERE a.check_in >= DATE_SUB(?, INTERVAL 6 DAY) ${filterDept}
       GROUP BY DATE(a.check_in)
       ORDER BY date ASC`,
      [end]
    );

    // format hasil: selalu 7 hari terakhir
    const result = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date(end);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];

      const row = rows.find((r) => r.date && r.date.toISOString().slice(0, 10) === key);
      result.push({
        date: key,
        present: row?.present || 0,
        late: row?.late || 0,
        absent: row?.absent || 0,
      });
    }

    res.json(result);
  } catch (err) {
    console.error("Error fetching attendance trend:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- EMPLOYEE DETAIL --------------------
router.get("/employees", async (req, res) => {
  try {
    const { date, department } = req.query;
    const filterDept = department && department !== "all" ? `AND e.department='${department}'` : "";

    const [rows] = await pool.query(
      `SELECT e.id, e.full_name, e.department,
              SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as presentDays,
              SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) as lateDays,
              SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as recordedAbsentDays,
              MAX(a.check_in) as lastAttendance
       FROM employees e
       LEFT JOIN attendance a ON e.id=a.employee_id
       WHERE (a.check_in IS NULL OR DATE(a.check_in) <= ?) ${filterDept}
       GROUP BY e.id, e.full_name, e.department`,
      [date]
    );

    // Hitung working days secara terpisah (lebih sederhana)
    const startDate = new Date(date);
    startDate.setDate(startDate.getDate() - 6); // 7 hari terakhir
    
    const endDate = new Date(date);
    
    // Generate working days (weekdays only untuk sekarang)
    let workingDays = 0;
    const currentDate = new Date(startDate);
    
    while (currentDate <= endDate) {
      const dayOfWeek = currentDate.getDay();
      // 0 = Sunday, 6 = Saturday
      if (dayOfWeek !== 0 && dayOfWeek !== 6) {
        workingDays++;
      }
      currentDate.setDate(currentDate.getDate() + 1);
    }

    const formatted = rows.map((r) => {
      // PERBAIKAN: Hitung absent days yang sebenarnya
      const totalAttendanceDays = r.presentDays + r.lateDays + r.recordedAbsentDays;
      const actualAbsentDays = workingDays - (r.presentDays + r.lateDays);
      
      // Pastikan tidak negatif
      const finalAbsentDays = Math.max(0, actualAbsentDays);
      
      // Hitung attendance rate dengan pembagian yang benar
      const attendanceRate = workingDays > 0 ? Math.round(((r.presentDays + r.lateDays) / workingDays) * 100) : 0;
      
      return {
        id: r.id,
        name: r.full_name,
        department: r.department,
        presentDays: r.presentDays,
        absentDays: finalAbsentDays,
        lateDays: r.lateDays,
        attendanceRate: Math.min(100, attendanceRate), // Max 100%
        lastAttendance: r.lastAttendance,
        workingDays: workingDays
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching employee detail:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
