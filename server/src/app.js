import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import { uploadsDir } from './config/upload.js';
import { requireAuth } from './middleware/auth.js';
import { requirePermission } from './middleware/rbac.js';
import { requireUploadAccess } from './middleware/uploadAccess.js';
import { errorHandler } from './middleware/errorHandler.js';

import authRoutes from './routes/auth.routes.js';
import dashboardRoutes from './routes/dashboard.routes.js';
import studentsRoutes from './routes/students.routes.js';
import teachersRoutes from './routes/teachers.routes.js';
import teacherSalariesRoutes from './routes/teacherSalaries.routes.js';
import gradesRoutes from './routes/grades.routes.js';
import attendanceRoutes from './routes/attendance.routes.js';
import feesRoutes from './routes/fees.routes.js';
import financeRoutes from './routes/finance.routes.js';
import inventoryRoutes from './routes/inventory.routes.js';
import settingsRoutes from './routes/settings.routes.js';
import tartibatSessionsRoutes from './routes/tartibat.sessions.routes.js';
import tartibatSubjectsRoutes from './routes/tartibat.subjects.routes.js';
import tartibatDarajatRoutes from './routes/tartibat.darajat.routes.js';
import tartibatBooksRoutes from './routes/tartibat.books.routes.js';
import timetableRoutes from './routes/timetable.routes.js';
import geoRoutes from './routes/geo.routes.js';
import searchRoutes from './routes/search.routes.js';
import examsRoutes from './routes/exams.routes.js';
import bookReadingRoutes from './routes/bookReading.routes.js';
import libraryRoutes from './routes/library.routes.js';
import speechesRoutes from './routes/speeches.routes.js';
import idCardsRoutes from './routes/idCards.routes.js';
import publicIdCardsRoutes from './routes/publicIdCards.routes.js';
import studentActivitiesRoutes from './routes/studentActivities.routes.js';
import usersRoutes from './routes/users.routes.js';

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 40,
  standardHeaders: true,
  legacyHeaders: false,
  message: { message: 'Too many auth attempts. Please try again later.' },
});

export function createApp() {
  const app = express();
  const origin = process.env.CLIENT_ORIGIN || 'http://localhost:5173';

  app.use(
    helmet({
      crossOriginResourcePolicy: { policy: 'cross-origin' },
      contentSecurityPolicy: false,
    })
  );
  app.use(cors({ origin, credentials: true }));
  app.use(express.json({ limit: '2mb' }));

  app.use('/uploads', requireUploadAccess, express.static(uploadsDir));

  app.get('/api/health', (_req, res) => res.json({ ok: true }));

  app.use('/api/auth', authLimiter, authRoutes);
  app.use('/api/public/id-cards', publicIdCardsRoutes);

  app.use('/api/dashboard', requireAuth, dashboardRoutes);
  app.use('/api/students', requireAuth, studentsRoutes);
  app.use('/api/teachers', requireAuth, teachersRoutes);
  app.use(
    '/api/teacher-salaries',
    requireAuth,
    requirePermission('finance:write'),
    teacherSalariesRoutes
  );
  app.use('/api/grades', requireAuth, gradesRoutes);
  app.use('/api/attendance', requireAuth, attendanceRoutes);
  app.use('/api/fees', requireAuth, requirePermission('fees:write'), feesRoutes);
  app.use('/api/finance', requireAuth, requirePermission('finance:write'), financeRoutes);
  app.use('/api/inventory', requireAuth, inventoryRoutes);
  app.use('/api/settings', requireAuth, settingsRoutes);
  app.use('/api/users', requireAuth, usersRoutes);
  app.use('/api/tartibat/sessions', requireAuth, tartibatSessionsRoutes);
  app.use('/api/tartibat/subjects', requireAuth, tartibatSubjectsRoutes);
  app.use('/api/tartibat/darajat', requireAuth, tartibatDarajatRoutes);
  app.use('/api/tartibat/books', requireAuth, tartibatBooksRoutes);
  app.use('/api/timetable', requireAuth, timetableRoutes);
  app.use('/api/geo', requireAuth, geoRoutes);
  app.use('/api/search', requireAuth, searchRoutes);
  app.use('/api/exams', requireAuth, examsRoutes);
  app.use('/api/book-reading', requireAuth, bookReadingRoutes);
  app.use('/api/library', requireAuth, libraryRoutes);
  app.use('/api/speeches', requireAuth, speechesRoutes);
  app.use('/api/id-cards', requireAuth, idCardsRoutes);
  app.use('/api/student-activities', requireAuth, studentActivitiesRoutes);

  app.use(errorHandler);
  return app;
}
