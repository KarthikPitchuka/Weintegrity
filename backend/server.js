import express from 'express';
import { createServer } from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import helmet from 'helmet';
import morgan from 'morgan';
import dotenv from 'dotenv';
import jwt from 'jsonwebtoken';
import connectDB from './config/db.js';
import { setSocketIO } from './controllers/notificationController.js';

// Route imports
import authRoutes from './routes/authRoutes.js';
import employeeRoutes from './routes/employeeRoutes.js';
import recruitmentRoutes from './routes/recruitmentRoutes.js';
import attendanceRoutes from './routes/attendanceRoutes.js';
import leaveRoutes from './routes/leaveRoutes.js';
import leaveTypeRoutes from './routes/leaveTypeRoutes.js';
import payrollRoutes from './routes/payrollRoutes.js';
import performanceRoutes from './routes/performanceRoutes.js';
import trainingRoutes from './routes/trainingRoutes.js';
import assetRoutes from './routes/assetRoutes.js';
import documentRoutes from './routes/documentRoutes.js';
import complianceRoutes from './routes/complianceRoutes.js';
import holidayRoutes from './routes/holidayRoutes.js';
import notificationRoutes from './routes/notificationRoutes.js';
import organizationRoutes from './routes/organizationRoutes.js';
import salaryRoutes from './routes/salaryRoutes.js';
import onboardingRoutes from './routes/onboardingRoutes.js';
import auditRoutes from './routes/auditRoutes.js';
import projectRoutes from './routes/projectRoutes.js';


// Load environment variables
dotenv.config();

// Initialize express app
const app = express();
const httpServer = createServer(app);

// Initialize Socket.IO with CORS
const io = new Server(httpServer, {
  cors: {
    origin: process.env.FRONTEND_URL || 'http://localhost:5173',
    methods: ['GET', 'POST'],
    credentials: true
  }
});

// Set Socket.IO instance in notification controller
setSocketIO(io);

// Socket.IO authentication middleware
io.use((socket, next) => {
  const token = socket.handshake.auth.token;
  if (!token) {
    return next(new Error('Authentication required'));
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    socket.userId = decoded.id;
    next();
  } catch (error) {
    next(new Error('Invalid token'));
  }
});

// Socket.IO connection handling
io.on('connection', (socket) => {
  console.log(`🔌 User connected: ${socket.userId}`);

  // Join user-specific room for targeted notifications
  socket.join(`user_${socket.userId}`);

  // Handle disconnection
  socket.on('disconnect', () => {
    console.log(`🔌 User disconnected: ${socket.userId}`);
  });

  // Allow clients to mark notification as read via socket
  socket.on('mark_read', async (notificationId) => {
    try {
      const Notification = (await import('./models/Notification.js')).default;
      await Notification.findOneAndUpdate(
        { _id: notificationId, recipient: socket.userId },
        { isRead: true, readAt: new Date() }
      );
      socket.emit('notification_read', notificationId);
    } catch (error) {
      console.error('Error marking notification as read:', error);
    }
  });
});

// Connect to database
connectDB();

// Middleware
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(cors());
app.use(morgan('dev'));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// Serve static files from uploads directory
app.use('/uploads', express.static('./uploads'));

// API Routes
app.use('/api/auth', authRoutes);
app.use('/api/employees', employeeRoutes);
app.use('/api/recruitment', recruitmentRoutes);
app.use('/api/attendance', attendanceRoutes);
app.use('/api/leaves', leaveRoutes);
app.use('/api/leave-types', leaveTypeRoutes);
app.use('/api/payroll', payrollRoutes);
app.use('/api/performance', performanceRoutes);
app.use('/api/training', trainingRoutes);
app.use('/api/assets', assetRoutes);
app.use('/api/documents', documentRoutes);
app.use('/api/compliance', complianceRoutes);
app.use('/api/holidays', holidayRoutes);
app.use('/api/notifications', notificationRoutes);
app.use('/api/organization', organizationRoutes);
app.use('/api/salary', salaryRoutes);
app.use('/api/onboarding', onboardingRoutes);
app.use('/api/audit', auditRoutes);
app.use('/api/projects', projectRoutes);


// Health check route
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'HR Management API is running' });
});

// 404 handler
app.use((req, res) => {
  res.status(404).json({ message: 'Route not found' });
});

// Error handling middleware
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(err.status || 500).json({
    message: err.message || 'Internal Server Error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack })
  });
});

// Start server
const PORT = process.env.PORT || 5000;
httpServer.listen(PORT, () => {
  console.log(`🚀 Server running on port ${PORT}`);
  console.log(`🔌 Socket.IO ready for real-time notifications`);
});

export { io };
export default app;
