import { Suspense, lazy } from 'react'
import { Outlet, createBrowserRouter, createRoutesFromElements, Route } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import RequirePermission from './components/RequirePermission'
import MainLayout from './layouts/MainLayout'
import ErrorBoundary from './components/ErrorBoundary'

const LoginPage = lazy(() => import('./pages/LoginPage'))
const SignupPage = lazy(() => import('./pages/SignupPage'))
const ForgotPasswordPage = lazy(() => import('./pages/ForgotPasswordPage'))
const ResetPasswordPage = lazy(() => import('./pages/ResetPasswordPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const StudentsPage = lazy(() => import('./pages/StudentsPage'))
const StudentFormPage = lazy(() => import('./pages/StudentFormPage'))
const StudentPrintPage = lazy(() => import('./pages/StudentPrintPage'))
const StudentsBulkPrintPage = lazy(() => import('./pages/StudentsBulkPrintPage'))
const TeachersPage = lazy(() => import('./pages/TeachersPage'))
const TeacherFormPage = lazy(() => import('./pages/TeacherFormPage'))
const GradesPage = lazy(() => import('./pages/GradesPage'))
const AttendancePage = lazy(() => import('./pages/AttendancePage'))
const FeesPage = lazy(() => import('./pages/FeesPage'))
const FinancePage = lazy(() => import('./pages/FinancePage'))
const InventoryPage = lazy(() => import('./pages/InventoryPage'))
const LibraryPage = lazy(() => import('./pages/LibraryPage'))
const SpeechesPage = lazy(() => import('./pages/SpeechesPage'))
const ProfilePage = lazy(() => import('./pages/ProfilePage'))
const SettingsPage = lazy(() => import('./pages/SettingsPage'))
const UsersPage = lazy(() => import('./pages/UsersPage'))
const IdCardsPage = lazy(() => import('./pages/IdCardsPage'))
const IdCardsPrintPage = lazy(() => import('./pages/IdCardsPrintPage'))
const IdCardsTemplatesPage = lazy(() => import('./pages/IdCardsTemplatesPage'))
const IdCardsHistoryPage = lazy(() => import('./pages/IdCardsHistoryPage'))
const IdCardVerifyPage = lazy(() => import('./pages/IdCardVerifyPage'))
const TartibatSessionsPage = lazy(() => import('./pages/TartibatSessionsPage'))
const TartibatSubjectsPage = lazy(() => import('./pages/TartibatSubjectsPage'))
const TartibatDarajatPage = lazy(() => import('./pages/TartibatDarajatPage'))
const TartibatBooksPage = lazy(() => import('./pages/TartibatBooksPage'))
const TartibatTimetablePage = lazy(() => import('./pages/TartibatTimetablePage'))
const BookReadingPage = lazy(() => import('./pages/BookReadingPage'))
const BookReadingDetailPage = lazy(() => import('./pages/BookReadingDetailPage'))
const ExamsPage = lazy(() => import('./pages/ExamsPage'))
const ExamResultPrintPage = lazy(() => import('./pages/ExamResultPrintPage'))
const StudentCharacterPage = lazy(() => import('./pages/StudentCharacterPage'))
const NotFoundPage = lazy(() => import('./pages/NotFoundPage'))
const RecycleBinPage = lazy(() => import('./pages/RecycleBinPage'))

function RouteFallback() {
  return (
    <div className="p-4 text-muted" role="status" aria-live="polite">
      …
    </div>
  )
}

function Guard({ permission, children }) {
  return (
    <RequirePermission permission={permission} fallback="redirect">
      {children}
    </RequirePermission>
  )
}

/** Data-router shell so hooks like useBlocker work on form pages. */
function AppShell() {
  return (
    <ErrorBoundary>
      <Suspense fallback={<RouteFallback />}>
        <Outlet />
      </Suspense>
    </ErrorBoundary>
  )
}

export const router = createBrowserRouter(
  createRoutesFromElements(
    <Route element={<AppShell />}>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
      <Route path="/forgot-password" element={<ForgotPasswordPage />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/id-cards/verify/:token" element={<IdCardVerifyPage />} />
      <Route
        path="/"
        element={
          <RequireAuth>
            <MainLayout />
          </RequireAuth>
        }
      >
        <Route index element={<DashboardPage />} />
        <Route path="students/new" element={<StudentFormPage />} />
        <Route path="students/print-cards" element={<StudentsBulkPrintPage />} />
        <Route path="students/:id/print" element={<StudentPrintPage />} />
        <Route path="students/:id/edit" element={<StudentFormPage />} />
        <Route path="students" element={<StudentsPage />} />
        <Route path="id-cards" element={<IdCardsPage />} />
        <Route path="id-cards/print" element={<IdCardsPrintPage />} />
        <Route path="id-cards/templates" element={<IdCardsTemplatesPage />} />
        <Route path="id-cards/history" element={<IdCardsHistoryPage />} />
        <Route path="teachers" element={<TeachersPage />} />
        <Route
          path="teachers/new"
          element={
            <Guard permission="teachers:write">
              <TeacherFormPage />
            </Guard>
          }
        />
        <Route
          path="teachers/:id/edit"
          element={
            <Guard permission="teachers:write">
              <TeacherFormPage />
            </Guard>
          }
        />
        <Route
          path="grades"
          element={
            <Guard permission="grades:write">
              <GradesPage />
            </Guard>
          }
        />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="student-character" element={<StudentCharacterPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="exams/print" element={<ExamResultPrintPage />} />
        <Route
          path="fees"
          element={
            <Guard permission="fees:read">
              <FeesPage />
            </Guard>
          }
        />
        <Route
          path="finance"
          element={
            <Guard permission="finance:read">
              <FinancePage />
            </Guard>
          }
        />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="speeches" element={<SpeechesPage />} />
        <Route
          path="settings"
          element={
            <Guard permission="settings:write">
              <SettingsPage />
            </Guard>
          }
        />
        <Route
          path="users"
          element={
            <Guard permission="users:manage">
              <UsersPage />
            </Guard>
          }
        />
        <Route
          path="recycle-bin"
          element={
            <Guard permission="recycle:read">
              <RecycleBinPage />
            </Guard>
          }
        />
        <Route path="profile" element={<ProfilePage />} />
        <Route
          path="tartibat/sessions"
          element={
            <Guard permission="tartibat:write">
              <TartibatSessionsPage />
            </Guard>
          }
        />
        <Route
          path="tartibat/subjects"
          element={
            <Guard permission="tartibat:write">
              <TartibatSubjectsPage />
            </Guard>
          }
        />
        <Route
          path="tartibat/darajat"
          element={
            <Guard permission="tartibat:write">
              <TartibatDarajatPage />
            </Guard>
          }
        />
        <Route
          path="tartibat/books"
          element={
            <Guard permission="tartibat:write">
              <TartibatBooksPage />
            </Guard>
          }
        />
        <Route path="book-reading" element={<BookReadingPage />} />
        <Route path="book-reading/:bookId" element={<BookReadingDetailPage />} />
        <Route
          path="tartibat/timetable"
          element={
            <Guard permission="tartibat:write">
              <TartibatTimetablePage />
            </Guard>
          }
        />
      </Route>
      <Route path="*" element={<NotFoundPage />} />
    </Route>
  )
)
