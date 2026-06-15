const express = require('express');
const cors = require('cors');
const authRoutes = require('./routes/auth');
const attendanceRoutes = require('./routes/attendance');
const locationRoutes = require('./routes/locations');
const assignmentRoutes = require('./routes/assignments');
const documentationRoutes = require('./routes/documentation');

const app = express();
const PORT = process.env.PORT || 3001;

app.use(cors());
app.use(express.json());

app.use('/api/auth', authRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/locations', locationRoutes);
app.use('/api/assignments', assignmentRoutes);
app.use('/api/documentation', documentationRoutes);

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
