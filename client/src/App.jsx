import { Routes, Route, Navigate } from 'react-router-dom'
import RequireAuth from './components/RequireAuth'
import MainLayout from './layouts/MainLayout'
import LoginPage from './pages/LoginPage'
import SignupPage from './pages/SignupPage'
import DashboardPage from './pages/DashboardPage'
import StudentsPage from './pages/StudentsPage'
import StudentFormPage from './pages/StudentFormPage'
import StudentPrintPage from './pages/StudentPrintPage'
import StudentsBulkPrintPage from './pages/StudentsBulkPrintPage'
import TeachersPage from './pages/TeachersPage'
import TeacherFormPage from './pages/TeacherFormPage'
import GradesPage from './pages/GradesPage'
import AttendancePage from './pages/AttendancePage'
import FeesPage from './pages/FeesPage'
import FinancePage from './pages/FinancePage'
import InventoryPage from './pages/InventoryPage'
import LibraryPage from './pages/LibraryPage'
import SpeechesPage from './pages/SpeechesPage'
import ProfilePage from './pages/ProfilePage'
import IdCardsPage from './pages/IdCardsPage'
import IdCardsPrintPage from './pages/IdCardsPrintPage'
import IdCardsTemplatesPage from './pages/IdCardsTemplatesPage'
import IdCardsHistoryPage from './pages/IdCardsHistoryPage'
import IdCardVerifyPage from './pages/IdCardVerifyPage'
import TartibatSessionsPage from './pages/TartibatSessionsPage'
import TartibatSubjectsPage from './pages/TartibatSubjectsPage'
import TartibatDarajatPage from './pages/TartibatDarajatPage'
import TartibatBooksPage from './pages/TartibatBooksPage'
import TartibatTimetablePage from './pages/TartibatTimetablePage'
import BookReadingPage from './pages/BookReadingPage'
import BookReadingDetailPage from './pages/BookReadingDetailPage'
import ExamsPage from './pages/ExamsPage'
import ExamResultPrintPage from './pages/ExamResultPrintPage'
import StudentCharacterPage from './pages/StudentCharacterPage'

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<LoginPage />} />
      <Route path="/signup" element={<SignupPage />} />
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
        <Route path="teachers/new" element={<TeacherFormPage />} />
        <Route path="teachers/:id/edit" element={<TeacherFormPage />} />
        <Route path="grades" element={<GradesPage />} />
        <Route path="attendance" element={<AttendancePage />} />
        <Route path="student-character" element={<StudentCharacterPage />} />
        <Route path="exams" element={<ExamsPage />} />
        <Route path="exams/print" element={<ExamResultPrintPage />} />
        <Route path="fees" element={<FeesPage />} />
        <Route path="finance" element={<FinancePage />} />
        <Route path="inventory" element={<InventoryPage />} />
        <Route path="library" element={<LibraryPage />} />
        <Route path="speeches" element={<SpeechesPage />} />
        <Route path="settings" element={<Navigate to="/profile" replace />} />
        <Route path="profile" element={<ProfilePage />} />
        <Route path="tartibat/sessions" element={<TartibatSessionsPage />} />
        <Route path="tartibat/subjects" element={<TartibatSubjectsPage />} />
        <Route path="tartibat/darajat" element={<TartibatDarajatPage />} />
        <Route path="tartibat/books" element={<TartibatBooksPage />} />
        <Route path="book-reading" element={<BookReadingPage />} />
        <Route path="book-reading/:bookId" element={<BookReadingDetailPage />} />
        <Route path="tartibat/timetable" element={<TartibatTimetablePage />} />
      </Route>
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
