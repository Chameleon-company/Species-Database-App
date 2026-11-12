const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// 🔹 MySQL connection
const db = mysql.createConnection({
  host: 'localhost',
  user: 'root',
  password: 'Tarun@1234',   // ⬅️ change this
  database: 'test_db'
});

// 🔹 Connect to MySQL
db.connect(err => {
  if (err) {
    console.error('Database connection failed:', err);
  } else {
    console.log('Connected to MySQL database');
  }
});

// =========================
// USERS TABLE API
// =========================
app.get('/api/users', (req, res) => {
  const sql = 'SELECT user_id, name, role, is_active FROM users';
  db.query(sql, (err, results) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(results);
  });
});

// =========================
// SPECIES (ENGLISH)
// =========================
app.get('/api/species/en', (req, res) => {
  db.query('SELECT * FROM species_en', (err, results) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(results);
  });
});

// =========================
// SPECIES (TETUM)
// =========================
app.get('/api/species/tet', (req, res) => {
  db.query('SELECT * FROM species_tet', (err, results) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(results);
  });
});

// =========================
// MEDIA (by species_id)
// =========================
app.get('/api/media', (req, res) => {
  const { species_id } = req.query;
  const sql = 'SELECT * FROM media WHERE species_id = ?';

  db.query(sql, [species_id], (err, results) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(results);
  });
});

// =========================
// ANALYTICS
// =========================
app.get('/api/analytics', (req, res) => {
  db.query('SELECT * FROM analytics', (err, results) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(results);
  });
});

// =========================
// CHANGELOG
// =========================
app.get('/api/changelog', (req, res) => {
  db.query('SELECT * FROM changelog', (err, results) => {
    if (err) return res.status(500).json(err);
    res.status(200).json(results);
  });
});

// =========================
// START SERVER
// =========================
const PORT = 3000;
app.listen(PORT, () => {
  console.log(`Backend running at http://localhost:${PORT}`);
});