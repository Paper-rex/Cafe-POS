import express from 'express';
import cors from 'cors';
import cookieParser from 'cookie-parser';
import dotenv from 'dotenv';
import path from 'path';
import { fileURLToPath } from 'url';

dotenv.config();

// Routes
import authRoutes from './routes/auth.js';
import adminRoutes from './routes/admin.js';
import sessionRoutes from './routes/session.js';
import productRoutes from './routes/products.js';
import floorRoutes from './routes/floors.js';
import paymentConfigRoutes from './routes/payment-config.js';
import orderRoutes from './routes/orders.js';
import paymentRoutes from './routes/payments.js';
import reportRoutes from './routes/reports.js';
import eventRoutes from './routes/events.js';
import branchRoutes from './routes/branches.js';
import selfOrderRoutes from './routes/self-order.js';

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use('/uploads', express.static(path.resolve(process.env.UPLOAD_DIR || './uploads')));


app.get('/api/health', (_req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.use('/api/auth', authRoutes);
app.use('/api/admin', adminRoutes);
app.use('/api/session', sessionRoutes);
app.use('/api/categories', productRoutes.categories);
app.use('/api/products', productRoutes.products);
app.use('/api/floors', floorRoutes);
app.use('/api/payment-config', paymentConfigRoutes);
app.use('/api/orders', orderRoutes);
app.use('/api/payments', paymentRoutes);
app.use('/api/reports', reportRoutes);
app.use('/api/events', eventRoutes);
app.use('/api/branches', branchRoutes);
app.use('/api/self-order', selfOrderRoutes);

app.use((_req, res) => {
  res.status(404).json({ error: 'Not found' });
});

app.use((err: any, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error('Unhandled error:', err);
  res.status(err.status || 500).json({
    error: err.message || 'Internal server error',
    ...(process.env.NODE_ENV === 'development' && { stack: err.stack }),
  });
});

const server = app.listen(PORT, () => {
  console.log(`\n Café POS Backend running on http://localhost:${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}\n`);
});

server.on('error', (err: NodeJS.ErrnoException) => {
  if (err.code === 'EADDRINUSE') {
    console.error(
      `\n Port ${PORT} is already in use (another backend or app is listening).\n` +
        `   Fix: stop that process, or set PORT to a free port in backend/.env\n` +
        `   Windows: netstat -ano | findstr :${PORT}   then   taskkill /PID <pid> /F\n`
    );
  } else {
    console.error('Server failed to start:', err);
  }
  process.exit(1);
});

export default app;
