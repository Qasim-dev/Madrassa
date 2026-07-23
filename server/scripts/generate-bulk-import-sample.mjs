/**
 * Generates client/public/import-templates/bulk-import-sample.xlsx
 * One workbook for both flows: Students sheet → POST /api/students/import
 * Teachers + Assignments sheets → POST /api/teachers/import
 */
import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import XLSX from 'xlsx';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const outDir = path.resolve(__dirname, '../../client/public/import-templates');
const outFile = path.join(outDir, 'bulk-import-sample.xlsx');

const studentHeaders = [
  'sessionId',
  'studentId',
  'name.ur',
  'name.en',
  'fatherName.ur',
  'fatherName.en',
  'gender',
  'idCard',
  'phone',
  'city',
  'country.ur',
  'country.en',
  'state.ur',
  'state.en',
  'cityLoc.ur',
  'cityLoc.en',
  'districtCurrent.ur',
  'districtCurrent.en',
  'districtPermanent.ur',
  'districtPermanent.en',
  'addressCurrent.ur',
  'addressCurrent.en',
  'addressPermanent.ur',
  'addressPermanent.en',
  'exitReason.ur',
  'exitReason.en',
  'classTypeLabel',
  'photoUrl',
  'dateOfBirth',
  'enrollmentDate',
  'exitDate',
  'gradeId',
  'currentGradeId',
  'previousGradeId',
  'darjahId',
  'subjectId',
  'bookId',
  'teacherId',
];

const studentSample = {
  sessionId: '<paste Session _id from app>',
  studentId: '',
  'name.ur': 'نمونہ طالب علم',
  'name.en': 'Sample Student',
  'fatherName.ur': 'والد کا نام',
  'fatherName.en': 'Father Name',
  gender: 'male',
  idCard: '',
  phone: '03001234567',
  city: 'Lahore',
  'country.ur': '',
  'country.en': '',
  'state.ur': '',
  'state.en': '',
  'cityLoc.ur': '',
  'cityLoc.en': '',
  'districtCurrent.ur': '',
  'districtCurrent.en': '',
  'districtPermanent.ur': '',
  'districtPermanent.en': '',
  'addressCurrent.ur': '',
  'addressCurrent.en': '',
  'addressPermanent.ur': '',
  'addressPermanent.en': '',
  'exitReason.ur': '',
  'exitReason.en': '',
  classTypeLabel: '',
  photoUrl: '',
  dateOfBirth: '2010-06-01',
  enrollmentDate: '2025-04-01',
  exitDate: '',
  gradeId: '',
  currentGradeId: '<paste Grade _id>',
  previousGradeId: '',
  darjahId: '',
  subjectId: '',
  bookId: '',
  teacherId: '',
};

const teacherHeaders = [
  'teacherKey',
  'name.ur',
  'name.en',
  'parentage.ur',
  'parentage.en',
  'idCard',
  'phone',
  'maritalStatus',
  'dateOfBirth',
  'country.ur',
  'country.en',
  'state.ur',
  'state.en',
  'cityLoc.ur',
  'cityLoc.en',
  'districtCurrent.ur',
  'districtCurrent.en',
  'districtPermanent.ur',
  'districtPermanent.en',
  'addressCurrent.ur',
  'addressCurrent.en',
  'addressPermanent.ur',
  'addressPermanent.en',
  'deeniTaleem',
  'asriTaleem',
  'extraSkills',
  'jobStartDate',
  'jobEndDate',
  'status',
];

const teacherSample = {
  teacherKey: 'T1',
  'name.ur': 'نمونہ استاد',
  'name.en': 'Sample Teacher',
  'parentage.ur': 'ولدِ فلاں',
  'parentage.en': 'Son of …',
  idCard: '',
  phone: '03007654321',
  maritalStatus: '',
  dateOfBirth: '1985-01-01',
  'country.ur': '',
  'country.en': '',
  'state.ur': '',
  'state.en': '',
  'cityLoc.ur': '',
  'cityLoc.en': '',
  'districtCurrent.ur': '',
  'districtCurrent.en': '',
  'districtPermanent.ur': '',
  'districtPermanent.en': '',
  'addressCurrent.ur': '',
  'addressCurrent.en': '',
  'addressPermanent.ur': '',
  'addressPermanent.en': '',
  deeniTaleem: '',
  asriTaleem: '',
  extraSkills: '',
  jobStartDate: '',
  jobEndDate: '',
  status: 'active',
};

const assignmentHeaders = ['teacherKey', 'sessionId', 'darjahId', 'subjectId', 'bookId'];
const assignmentSample = {
  teacherKey: 'T1',
  sessionId: '<paste Session _id>',
  darjahId: '',
  subjectId: '',
  bookId: '',
};

function rowFromHeaders(headers, obj) {
  return headers.map((h) => (obj[h] != null ? obj[h] : ''));
}

function instructionsRows() {
  return [
    ['E-Jamia Pro — bulk import (one file for students & teachers)'],
    [''],
    ['Sheets:'],
    ['  • Students     — use Students page → Excel Import (reads this sheet only).'],
    ['  • Teachers     — use Teachers page → Excel Import (reads Teachers + Assignments).'],
    ['  • Assignments  — optional rows linking teacherKey to session/darjah/subject/book IDs.'],
    [''],
    ['Replace placeholder IDs with real MongoDB ObjectIds from your organisation.'],
    ['Dates: use YYYY-MM-DD. Gender: male | female. Teacher status: active | inactive | leave.'],
    ['If studentId is empty, sessionId is required for auto-generated student IDs.'],
  ];
}

fs.mkdirSync(outDir, { recursive: true });

const wb = XLSX.utils.book_new();

const wsInstr = XLSX.utils.aoa_to_sheet(instructionsRows());
XLSX.utils.book_append_sheet(wb, wsInstr, 'Instructions');

const wsStu = XLSX.utils.aoa_to_sheet([
  studentHeaders,
  rowFromHeaders(studentHeaders, studentSample),
]);
XLSX.utils.book_append_sheet(wb, wsStu, 'Students');

const wsTeach = XLSX.utils.aoa_to_sheet([
  teacherHeaders,
  rowFromHeaders(teacherHeaders, teacherSample),
]);
XLSX.utils.book_append_sheet(wb, wsTeach, 'Teachers');

const wsAsg = XLSX.utils.aoa_to_sheet([
  assignmentHeaders,
  rowFromHeaders(assignmentHeaders, assignmentSample),
]);
XLSX.utils.book_append_sheet(wb, wsAsg, 'Assignments');

XLSX.writeFile(wb, outFile);
console.log('Wrote', outFile);
