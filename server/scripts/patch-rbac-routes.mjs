import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const dir = path.join(path.dirname(fileURLToPath(import.meta.url)), '../src/routes');

function ensureImport(src, importLine) {
  if (src.includes("from '../middleware/rbac.js'")) return src;
  const lines = src.split('\n');
  let lastImport = 0;
  for (let i = 0; i < lines.length; i++) {
    if (lines[i].startsWith('import ')) lastImport = i;
  }
  lines.splice(lastImport + 1, 0, importLine);
  return lines.join('\n');
}

function patch(file, replacements) {
  const full = path.join(dir, file);
  let s = fs.readFileSync(full, 'utf8');
  s = ensureImport(s, "import { requirePermission } from '../middleware/rbac.js';");
  for (const [from, to] of replacements) {
    if (!s.includes(to.split(',')[0] + ',') || from === to) {
      // always try replace once
    }
    if (!s.includes(from)) {
      console.warn('missing pattern in', file, from);
      continue;
    }
    s = s.replace(from, to);
  }
  fs.writeFileSync(full, s);
  console.log('ok', file);
}

patch('students.routes.js', [
  ["router.delete('/:id', async", "router.delete('/:id', requirePermission('students:delete'), async"],
]);

patch('teachers.routes.js', [
  [
    "router.post('/import', uploadExcel.single('file'), async",
    "router.post('/import', requirePermission('teachers:write'), uploadExcel.single('file'), async",
  ],
  ["router.post('/', async", "router.post('/', requirePermission('teachers:write'), async"],
  ["router.put('/:id', async", "router.put('/:id', requirePermission('teachers:write'), async"],
  ["router.delete('/:id', async", "router.delete('/:id', requirePermission('teachers:write'), async"],
]);

patch('grades.routes.js', [
  ["router.post('/', async", "router.post('/', requirePermission('grades:write'), async"],
  ["router.put('/:id', async", "router.put('/:id', requirePermission('grades:write'), async"],
  ["router.delete('/:id', async", "router.delete('/:id', requirePermission('grades:write'), async"],
]);

patch('inventory.routes.js', [
  ["router.put('/items/:id', async", "router.put('/items/:id', requirePermission('inventory:write'), async"],
  [
    "router.delete('/items/:id', async",
    "router.delete('/items/:id', requirePermission('inventory:write'), async",
  ],
  ["router.post('/movements', async", "router.post('/movements', requirePermission('inventory:write'), async"],
]);

patch('exams.routes.js', [
  ["router.post('/', async", "router.post('/', requirePermission('exams:admin'), async"],
  [
    "router.delete('/:examId', requireExamContext, async",
    "router.delete('/:examId', requireExamContext, requirePermission('exams:admin'), async",
  ],
  [
    "router.post('/:examId/delete', requireExamContext, async",
    "router.post('/:examId/delete', requireExamContext, requirePermission('exams:admin'), async",
  ],
  [
    "router.post('/:examId/unlock', requireExamContext, async",
    "router.post('/:examId/unlock', requireExamContext, requirePermission('exams:admin'), async",
  ],
  [
    "router.post('/:examId/process-results', requireExamContext, async",
    "router.post('/:examId/process-results', requireExamContext, requirePermission('exams:admin'), async",
  ],
  [
    "router.post('/:examId/publish', requireExamContext, async",
    "router.post('/:examId/publish', requireExamContext, requirePermission('exams:admin'), async",
  ],
  [
    "router.post('/:examId/marks/unlock', requireExamContext, async",
    "router.post('/:examId/marks/unlock', requireExamContext, requirePermission('exams:admin'), async",
  ],
]);

console.log('done');
