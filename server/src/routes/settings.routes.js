import { Router } from 'express';
import { TenantSettings } from '../models/TenantSettings.js';
import { Book } from '../models/Book.js';
import { uploadLogo } from '../config/upload.js';

const router = Router();

const PATCHABLE_SETTINGS = new Set([
  'address',
  'collegeAffiliation',
  'attendanceTimes',
  'examNames',
  'lessonNames',
  'taughtStories',
  'countries',
  'registeredAddresses',
  'districts',
  'previousMadarisNames',
  'withdrawalReasons',
  'logoUrl',
]);

router.get('/', async (req, res, next) => {
  try {
    let doc = await TenantSettings.findOne({ tenantId: req.tenantId });
    if (!doc) {
      doc = await TenantSettings.create({
        tenantId: req.tenantId,
      });
    }
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.patch('/', async (req, res, next) => {
  try {
    const $set = {};
    for (const key of PATCHABLE_SETTINGS) {
      if (req.body[key] !== undefined) {
        $set[key] = req.body[key];
      }
    }
    if (Object.keys($set).length === 0) {
      const doc = await TenantSettings.findOne({ tenantId: req.tenantId });
      if (!doc) {
        return res.status(404).json({ message: 'Settings not found' });
      }
      return res.json(doc);
    }
    const doc = await TenantSettings.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set },
      { new: true, upsert: true, runValidators: true }
    );
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.post('/logo', uploadLogo.single('logo'), async (req, res, next) => {
  try {
    if (!req.file) return res.status(400).json({ message: 'No file' });
    const logoUrl = `/uploads/${req.file.filename}`;
    const doc = await TenantSettings.findOneAndUpdate(
      { tenantId: req.tenantId },
      { $set: { logoUrl } },
      { new: true, upsert: true, runValidators: true }
    );
    res.json({ logoUrl, settings: doc });
  } catch (e) {
    next(e);
  }
});

router.get('/books', async (req, res, next) => {
  try {
    const list = await Book.find({ tenantId: req.tenantId }).sort({ createdAt: -1 });
    res.json(list);
  } catch (e) {
    next(e);
  }
});

router.post('/books', async (req, res, next) => {
  try {
    const doc = await Book.create({ ...req.body, tenantId: req.tenantId });
    res.status(201).json(doc);
  } catch (e) {
    next(e);
  }
});

router.put('/books/:id', async (req, res, next) => {
  try {
    const doc = await Book.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      {
        $set: {
          title: req.body.title,
          ...(req.body.author !== undefined ? { author: req.body.author } : {}),
        },
      },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/books/:id', async (req, res, next) => {
  try {
    await Book.findOneAndDelete({ _id: req.params.id, tenantId: req.tenantId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

export default router;
