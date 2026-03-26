process.chdir(__dirname);
require('dotenv').config();
const express = require('express');
const mysql   = require('mysql2/promise');
const cors    = require('cors');
const path    = require('path');

const app = express();
app.use(cors());
app.use(express.json());

// ── Database connection pool ────────────────────────────
const pool = mysql.createPool({
  host:               process.env.DB_HOST,
  user:               process.env.DB_USER,
  password:           process.env.DB_PASSWORD,
  database:           process.env.DB_NAME,
  port:               process.env.DB_PORT || 3306,
  waitForConnections: true,
  connectionLimit:    10,
});

// ── Test DB connection on startup ───────────────────────
pool.getConnection()
  .then(conn => {
    console.log('✅ MySQL connected successfully');
    conn.release();
  })
  .catch(err => {
    console.error('❌ MySQL connection failed:', err.message);
  });

// ── GET all projects with baseline + tracking data ──────
app.get('/api/projects', async (req, res) => {
  try {
    const [projects] = await pool.query(
      `SELECT id, project_name AS name FROM projects ORDER BY id`
    );
    for (const p of projects) {
      const [bl] = await pool.query(
        `SELECT baseline_avg, green_threshold
         FROM project_baselines
         WHERE project_id = ? LIMIT 1`,
        [p.id]
      );
      const [tr] = await pool.query(
        `SELECT year, month, story_points
         FROM monthly_story_points
         WHERE project_id = ?
         ORDER BY year, month`,
        [p.id]
      );
      if (bl.length > 0) {
        p.baseline_avg    = parseFloat(bl[0].baseline_avg);
        p.green_threshold = parseFloat(bl[0].green_threshold);
        p.baseline = {
          7: p.baseline_avg, 8: p.baseline_avg, 9:  p.baseline_avg,
          10:p.baseline_avg, 11:p.baseline_avg, 12: p.baseline_avg,
        };
      } else {
        p.baseline = {};
      }
      p.tracking = {};
      tr.forEach(r => {
        if (r.year >= 2026) {
          p.tracking[`${r.year}-${r.month}`] = parseFloat(r.story_points);
        }
      });
    }
    res.json(projects);
  } catch (err) {
    console.error('GET /api/projects error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST add new project ────────────────────────────────
app.post('/api/projects', async (req, res) => {
  const { name } = req.body;
  try {
    const [result] = await pool.query(
      `INSERT INTO projects (project_name) VALUES (?)`, [name]
    );
    res.json({ id: result.insertId, name });
  } catch (err) {
    console.error('POST /api/projects error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── DELETE a project ────────────────────────────────────
app.delete('/api/projects/:id', async (req, res) => {
  try {
    await pool.query(`DELETE FROM monthly_story_points WHERE project_id = ?`, [req.params.id]);
    await pool.query(`DELETE FROM project_baselines WHERE project_id = ?`,    [req.params.id]);
    await pool.query(`DELETE FROM projects WHERE id = ?`,                      [req.params.id]);
    res.json({ success: true });
  } catch (err) {
    console.error('DELETE /api/projects error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST save / update one baseline month ──────────────
app.post('/api/baseline', async (req, res) => {
  const { project_id, months } = req.body;
  try {
    const valid = months.filter(v => !isNaN(v) && v >= 0);
    if (valid.length === 0) {
      return res.status(400).json({ error: 'No valid month values provided' });
    }
    const baseline_avg    = parseFloat((valid.reduce((a,b) => a+b, 0) / valid.length).toFixed(2));
    const green_threshold = parseFloat((baseline_avg * 1.3).toFixed(2));
    const [existing] = await pool.query(
      `SELECT id FROM project_baselines WHERE project_id = ?`, [project_id]
    );
    if (existing.length > 0) {
      await pool.query(
        `UPDATE project_baselines SET baseline_avg = ?, green_threshold = ? WHERE project_id = ?`,
        [baseline_avg, green_threshold, project_id]
      );
    } else {
      await pool.query(
        `INSERT INTO project_baselines (project_id, baseline_avg, green_threshold) VALUES (?, ?, ?)`,
        [project_id, baseline_avg, green_threshold]
      );
    }
    res.json({ success: true, baseline_avg, green_threshold });
  } catch (err) {
    console.error('POST /api/baseline error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── POST save / update monthly story points ─────────────
app.post('/api/productivity', async (req, res) => {
  const { project_id, year, month, story_points } = req.body;
  try {
    await pool.query(
      `INSERT INTO monthly_story_points (project_id, year, month, story_points)
       VALUES (?, ?, ?, ?)
       ON DUPLICATE KEY UPDATE story_points = VALUES(story_points)`,
      [project_id, year, month, story_points]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('POST /api/productivity error:', err.message);
    res.status(500).json({ error: err.message });
  }
});

// ── Serve React build files ─────────────────────────────
app.use(express.static(path.join(__dirname, '../build')));
app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, '../build', 'index.html'));
});

// ── Start server ────────────────────────────────────────
const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`🚀 API running on http://localhost:${PORT}`);
});