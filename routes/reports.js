const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// -------------------- SUMMARY --------------------
router.get("/summary", async (req, res) => {
  try {
    const { date, grade } = req.query;
    const filterGrade = grade && grade !== "all" ? `AND e.grade='${grade}'` : "";

    // total students
    const [totalStudents] = await pool.query(
      `SELECT COUNT(*) AS total FROM employees e WHERE 1=1 ${filterGrade}`
    );

    // hadir
    const [presentToday] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM attendance a 
       JOIN employees e ON a.employee_id = e.id
       WHERE DATE(a.check_in) = ? AND a.status='present' ${filterGrade}`,
      [date]
    );

    // terlambat
    const [lateToday] = await pool.query(
      `SELECT COUNT(*) AS total 
       FROM attendance a 
       JOIN employees e ON a.employee_id = e.id
       WHERE DATE(a.check_in) = ? AND a.status='late' ${filterGrade}`,
      [date]
    );

    // tidak hadir
    const [absentToday] = await pool.query(
      `SELECT COUNT(*) AS total
       FROM employees e
       WHERE 1=1 ${filterGrade}
       AND NOT EXISTS (
         SELECT 1 FROM attendance a
         WHERE a.employee_id = e.id 
         AND DATE(a.check_in) = ? 
         AND a.status IN ('present','late')
       )`,
      [date]
    );

    // Rata-rata kehadiran (7 hari terakhir)
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
       WHERE a.check_in >= DATE_SUB(?, INTERVAL 6 DAY) ${filterGrade.replace('e.', 'a.')}
       GROUP BY DATE(a.check_in)`,
      [date]
    );

    // Hitung rata-rata
    let totalPresent = 0;
    dailyData.forEach(day => {
      totalPresent += day.totalPresent;
    });

    const avgRate = workingDays > 0 && totalStudents[0].total > 0 
      ? Math.round((totalPresent / (workingDays * totalStudents[0].total)) * 100)
      : 0;

    // Kelas terbaik & terburuk
    const [gradeRank] = await pool.query(
      `SELECT e.grade,
              ROUND((SUM(CASE WHEN a.status IN ('present','late') THEN 1 ELSE 0 END) / COUNT(e.id))*100,0) AS rate
       FROM employees e
       LEFT JOIN attendance a ON e.id=a.employee_id AND DATE(a.check_in)=?
       GROUP BY e.grade
       ORDER BY rate DESC`,
      [date]
    );

    res.json({
      totalStudents: totalStudents[0].total,
      presentToday: presentToday[0].total,
      absentToday: absentToday[0].total,
      lateToday: lateToday[0].total,
      averageAttendanceRate: avgRate,
      topGrade: gradeRank[0]?.grade || "-",
      lowestGrade: gradeRank[gradeRank.length - 1]?.grade || "-",
    });
  } catch (err) {
    console.error("Error fetching summary:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- ATTENDANCE TREND (7 days) --------------------
router.get("/attendance", async (req, res) => {
  try {
    const { end, grade } = req.query;
    const filterGrade = grade && grade !== "all" ? `AND e.grade='${grade}'` : "";

    const [rows] = await pool.query(
      `SELECT DATE(a.check_in) as date,
              SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as present,
              SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) as late,
              SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as absent
       FROM employees e
       LEFT JOIN attendance a ON e.id=a.employee_id
       WHERE a.check_in >= DATE_SUB(?, INTERVAL 6 DAY) ${filterGrade}
       GROUP BY DATE(a.check_in)
       ORDER BY date ASC`,
      [end]
    );

    // format hasil: selalu 7 hari terakhir
    const result = [];
    // Parse end date safely as local date
    const [ey, em, ed] = end.split('-').map(Number);
    
    for (let i = 6; i >= 0; i--) {
      const d = new Date(ey, em - 1, ed);
      d.setDate(d.getDate() - i);
      // Fix: use local date string
      const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;

      const row = rows.find((r) => {
        if (!r.date) return false;
        const rd = new Date(r.date);
        const rKey = `${rd.getFullYear()}-${String(rd.getMonth() + 1).padStart(2, "0")}-${String(rd.getDate()).padStart(2, "0")}`;
        return rKey === key;
      });
      
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

// -------------------- STUDENT DETAIL --------------------
router.get("/employees", async (req, res) => {
  try {
    const { date, grade } = req.query;
    const filterGrade = grade && grade !== "all" ? `AND e.grade='${grade}'` : "";

    const [rows] = await pool.query(
      `SELECT e.id, e.full_name, e.grade, e.classroom,
              SUM(CASE WHEN a.status='present' THEN 1 ELSE 0 END) as presentDays,
              SUM(CASE WHEN a.status='late' THEN 1 ELSE 0 END) as lateDays,
              SUM(CASE WHEN a.status='absent' THEN 1 ELSE 0 END) as recordedAbsentDays,
              MAX(a.check_in) as lastAttendance
       FROM employees e
       LEFT JOIN attendance a ON e.id=a.employee_id
       WHERE (a.check_in IS NULL OR DATE(a.check_in) <= ?) ${filterGrade}
       GROUP BY e.id, e.full_name, e.grade, e.classroom`,
      [date]
    );

    // Hitung working days
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

    const formatted = rows.map((r) => {
      const totalAttendanceDays = r.presentDays + r.lateDays + r.recordedAbsentDays;
      const actualAbsentDays = workingDays - (r.presentDays + r.lateDays);
      const finalAbsentDays = Math.max(0, actualAbsentDays);
      const attendanceRate = workingDays > 0 ? Math.round(((r.presentDays + r.lateDays) / workingDays) * 100) : 0;
      
      return {
        id: r.id,
        name: r.full_name,
        grade: r.grade,
        classroom: r.classroom,
        presentDays: r.presentDays,
        absentDays: finalAbsentDays,
        lateDays: r.lateDays,
        attendanceRate: Math.min(100, attendanceRate),
        lastAttendance: r.lastAttendance,
        workingDays: workingDays
      };
    });

    res.json(formatted);
  } catch (err) {
    console.error("Error fetching student detail:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- MONTHLY RECAP --------------------
router.get("/monthly-recap", async (req, res) => {
  try {
    const { month, year, grade } = req.query;
    
    if (!month || !year) {
      return res.status(400).json({ error: "Month and year are required" });
    }

    let filterGrade = "";
    let params = [month, year];

    if (grade && grade !== "all") {
      filterGrade = "AND e.grade = ?";
      params.push(grade);
    }

    const query = `
      SELECT 
        e.id, 
        e.full_name, 
        COALESCE(e.student_id, CAST(e.id AS CHAR)) as student_id,
        e.grade, 
        e.classroom,
        DATE(a.check_in) as date,
        a.status
      FROM employees e
      LEFT JOIN attendance a ON e.id = a.employee_id 
        AND MONTH(a.check_in) = ? 
        AND YEAR(a.check_in) = ?
      WHERE e.is_active = TRUE ${filterGrade}
      ORDER BY e.grade ASC, e.classroom ASC, e.full_name ASC, date ASC
    `;

    const [rows] = await pool.query(query, params);

    // Group by student
    const studentsMap = new Map();

    rows.forEach(row => {
      if (!studentsMap.has(row.id)) {
        studentsMap.set(row.id, {
          id: row.id,
          name: row.full_name,
          studentId: row.student_id,
          grade: row.grade,
          classroom: row.classroom,
          attendance: {}
        });
      }
      
      if (row.date) {
        const student = studentsMap.get(row.id);
        // Use local date to ensure correct day in local timezone (WIB)
        // toISOString() converts to UTC which can shift date to previous day for GMT+7
        const d = new Date(row.date);
        const day = d.getDate();
        student.attendance[day] = row.status;
      }
    });

    const result = Array.from(studentsMap.values());
    res.json(result);

  } catch (err) {
    console.error("Error fetching monthly recap:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

module.exports = router;
