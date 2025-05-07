const http = require('http');
const mongoose = require('mongoose');
require('dotenv').config();

const app = require('./app');
const { initSocket } = require('./socket');

const PORT = process.env.PORT || 10000;
const HOST = '0.0.0.0';

const server = http.createServer(app);
initSocket(server); // Initialize socket

mongoose
  .connect(process.env.MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB connected');
    server.listen(PORT, HOST, () => {
      console.log(`🚀 Server running on http://${HOST}:${PORT}`);
    });
  })
  .catch((err) => console.error('❌ MongoDB connection error:', err));
