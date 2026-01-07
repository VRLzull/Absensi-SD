const express = require("express");
const router = express.Router();
const pool = require("../config/database");

// -------------------- API STATS --------------------
router.get("/stats", async (req, res) => {
  try {
    const [totalEmployees] = await pool.query(
      "SELECT COUNT(*) AS total FROM employees"
    );

    const [presentToday] = await pool.query(
      "SELECT COUNT(*) AS total FROM attendance WHERE DATE(check_in) = CURDATE() AND status IN ('present','late')"
    );

    const [lateToday] = await pool.query(
      "SELECT COUNT(*) AS total FROM attendance WHERE DATE(check_in) = CURDATE() AND status='late'"
    );

    const absentToday =
      totalEmployees[0].total - presentToday[0].total;

    res.json({
      totalEmployees: totalEmployees[0].total,
      presentToday: presentToday[0].total,
      absentToday,
      lateToday: lateToday[0].total,
      systemStatus: "online",
    });
  } catch (err) {
    console.error("Error fetching stats:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- API RECENT --------------------
router.get("/recent", async (req, res) => {
  try {
    const [rows] = await pool.query(
      `SELECT a.id, e.full_name, e.department, a.check_in, a.status
       FROM attendance a
       JOIN employees e ON a.employee_id = e.id
       ORDER BY a.check_in DESC
       LIMIT 10`
    );
    res.json(rows);
  } catch (err) {
    console.error("Error fetching recent attendance:", err);
    res.status(500).json({ error: "Internal server error" });
  }
});

// -------------------- API WEEKLY CHART --------------------
router.get("/chart", async (req, res) => {
    try {
      // ambil total karyawan
      const [totalEmployees] = await pool.query(
        "SELECT COUNT(*) AS total FROM employees"
      );
      const total = totalEmployees[0].total;
  
      // ambil data absensi 7 hari terakhir
      const [rows] = await pool.query(
        `SELECT 
            DATE(check_in) as date,
            SUM(CASE WHEN status='present' THEN 1 ELSE 0 END) as present,
            SUM(CASE WHEN status='late' THEN 1 ELSE 0 END) as late
         FROM attendance
         WHERE check_in >= DATE_SUB(CURDATE(), INTERVAL 6 DAY)
         GROUP BY DATE(check_in)`
      );
  
      // bikin map data biar gampang dicari per tanggal
      const map = {};
      rows.forEach(r => {
        map[r.date.toISOString().split("T")[0]] = r;
      });
  
      // generate 7 hari terakhir (dari 6 hari lalu sampai hari ini)
      const formatted = [];
      for (let i = 6; i >= 0; i--) {
        const d = new Date();
        d.setDate(d.getDate() - i);
        const key = d.toISOString().split("T")[0];
  
        const r = map[key] || { present: 0, late: 0 };
        const hadir = r.present + r.late;
        const absent = Math.max(total - hadir, 0);
  
        formatted.push({
          day: d.toLocaleDateString("id-ID", { weekday: "short" }),
          present: r.present || 0,
          late: r.late || 0,
          absent,
        });
      }
  
      res.json(formatted);
    } catch (err) {
      console.error("Error fetching weekly chart:", err);
      res.status(500).json({ error: "Internal server error" });
    }
  });
  

module.exports = router;
