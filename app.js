const express = require('express');
const cors = require('cors');
const app = express();

const authRoutes = require('./routes/authRoutes');
const taskRoutes = require('./routes/taskRoutes');
const userRoutes = require('./routes/userRoutes');
const flightRoutes = require('./routes/flightRoutes');

const notificationRoutes = require('./routes/notificationRoutes');

app.use(cors());
app.use(express.json());

app.get('/', (req, res) => res.send('✅ API is running'));

app.use('/api/auth', authRoutes);
app.use('/api/tasks', taskRoutes);
app.use('/api/users', userRoutes);
app.use('/api/flights', flightRoutes);
app.use('/api/notifications', notificationRoutes);

module.exports = app;
