import { Router } from 'express';
import mongoose from 'mongoose';
import XLSX from 'xlsx';
import { InventoryItem } from '../models/InventoryItem.js';
import { StockMovement } from '../models/StockMovement.js';
import { Transaction } from '../models/Transaction.js';
import { FinanceAccount } from '../models/FinanceAccount.js';
import { uploadFinanceReceipt } from '../config/upload.js';
import { INV_CATEGORIES, INV_UNITS } from '../constants/inventoryEnums.js';
import { EXPENSE_CATEGORIES, FUND_SOURCES } from '../constants/financeEnums.js';
import { sanitizeUpdateBody } from '../utils/sanitizeUpdateBody.js';

const router = Router();

const LOW_STOCK_DEFAULT = 5;

const MOVEMENT_FLOWS = ['purchase', 'usage', 'transfer', 'damage', 'expiry', 'return', 'other', ''];

function escapeRegex(s) {
  return String(s).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function inEnum(val, list, fallback) {
  return val && list.includes(val) ? val : fallback;
}

function buildItemFilter(tenantId, query) {
  const { sessionId, category, stockStatus, search, dateFrom, dateTo } = query || {};
  const filter = { tenantId };
  if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
  if (category && INV_CATEGORIES.includes(category)) filter.category = category;
  if (dateFrom) {
    const d = new Date(dateFrom);
    if (!Number.isNaN(d.getTime())) filter.purchaseDate = { ...(filter.purchaseDate || {}), $gte: d };
  }
  if (dateTo) {
    const d = new Date(dateTo);
    if (!Number.isNaN(d.getTime())) {
      d.setHours(23, 59, 59, 999);
      filter.purchaseDate = { ...(filter.purchaseDate || {}), $lte: d };
    }
  }

  const q = search && String(search).trim();
  const searchPart = q
    ? {
        $or: [
          { 'name.ur': new RegExp(escapeRegex(q), 'i') },
          { 'name.en': new RegExp(escapeRegex(q), 'i') },
          { barcode: new RegExp(escapeRegex(q), 'i') },
          { location: new RegExp(escapeRegex(q), 'i') },
          { notes: new RegExp(escapeRegex(q), 'i') },
        ],
      }
    : null;

  const stockParts = [];
  if (stockStatus === 'out') {
    filter.quantity = { $lte: 0 };
  } else if (stockStatus === 'low') {
    stockParts.push({
      $expr: {
        $and: [
          { $gt: ['$quantity', 0] },
          { $lte: ['$quantity', { $ifNull: ['$minStockLevel', LOW_STOCK_DEFAULT] }] },
        ],
      },
    });
  } else if (stockStatus === 'available') {
    stockParts.push({
      $expr: {
        $gt: ['$quantity', { $ifNull: ['$minStockLevel', LOW_STOCK_DEFAULT] }],
      },
    });
  }

  const andParts = [];
  if (searchPart) andParts.push(searchPart);
  stockParts.forEach((p) => andParts.push(p));
  if (andParts.length === 1) Object.assign(filter, andParts[0]);
  else if (andParts.length > 1) filter.$and = andParts;

  return filter;
}

function stockStatusOf(item) {
  const qty = Number(item.quantity) || 0;
  const minL = Number(item.minStockLevel) || LOW_STOCK_DEFAULT;
  if (qty <= 0) return 'out';
  if (qty <= minL) return 'low';
  return 'available';
}

async function computeDashboard(tenantId, sessionId) {
  const filter = { tenantId };
  if (sessionId && mongoose.isValidObjectId(sessionId)) filter.sessionId = sessionId;
  const items = await InventoryItem.find(filter).lean();

  const totalItems = items.length;
  const availableStock = items.reduce((s, i) => s + (Number(i.quantity) || 0), 0);
  let lowStockCount = 0;
  let outOfStockCount = 0;
  const categoryQty = {};
  INV_CATEGORIES.forEach((c) => {
    categoryQty[c] = 0;
  });

  items.forEach((it) => {
    const st = stockStatusOf(it);
    if (st === 'low') lowStockCount += 1;
    if (st === 'out') outOfStockCount += 1;
    const cat = inEnum(it.category, INV_CATEGORIES, 'other');
    categoryQty[cat] = (categoryQty[cat] || 0) + (Number(it.quantity) || 0);
  });

  const itemIds = items.map((i) => i._id);
  const movFilter = { tenantId, itemId: { $in: itemIds } };
  const now = new Date();
  const startMonth = new Date(now.getFullYear(), now.getMonth(), 1);
  const movements = await StockMovement.find(movFilter).lean();

  const itemPrice = {};
  items.forEach((i) => {
    itemPrice[String(i._id)] = Number(i.unitPrice) || 0;
  });

  let monthlyUsageCost = 0;
  movements.forEach((m) => {
    const d = m.date ? new Date(m.date) : null;
    if (!d || d < startMonth) return;
    if (m.kind !== 'exit' && m.kind !== 'registration') return;
    monthlyUsageCost += (Number(m.quantity) || 0) * (itemPrice[String(m.itemId)] || 0);
  });
  monthlyUsageCost = Math.round(monthlyUsageCost * 100) / 100;

  const months = [];
  for (let i = 11; i >= 0; i -= 1) {
    months.push(new Date(now.getFullYear(), now.getMonth() - i, 1));
  }
  const monthKey = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
  const usageByMonth = {};
  months.forEach((d) => {
    usageByMonth[monthKey(d)] = 0;
  });
  movements.forEach((m) => {
    if (m.kind !== 'exit' && m.kind !== 'registration') return;
    const d = m.date ? new Date(m.date) : null;
    if (!d) return;
    const mk = monthKey(d);
    if (usageByMonth[mk] != null) {
      usageByMonth[mk] += (Number(m.quantity) || 0) * (itemPrice[String(m.itemId)] || 0);
    }
  });
  const monthlyUsageCostSeries = months.map((d) => ({
    month: monthKey(d),
    cost: Math.round((usageByMonth[monthKey(d)] || 0) * 100) / 100,
  }));

  const categoryDistribution = INV_CATEGORIES.filter((c) => categoryQty[c] > 0).map((c) => ({
    category: c,
    value: categoryQty[c],
  }));

  const soon = new Date(now.getTime() + 30 * 86400000);
  const alerts = [];
  items.forEach((it) => {
    const st = stockStatusOf(it);
    if (st === 'low') {
      alerts.push({
        type: 'low_stock',
        itemId: it._id,
        name: it.name,
        quantity: it.quantity,
        minStockLevel: it.minStockLevel ?? LOW_STOCK_DEFAULT,
      });
    }
    if (it.expiryDate) {
      const ex = new Date(it.expiryDate);
      if (!Number.isNaN(ex.getTime()) && ex <= soon && ex >= now) {
        alerts.push({ type: 'expiring', itemId: it._id, name: it.name, expiryDate: it.expiryDate });
      }
    }
  });

  const usedRank = items
    .map((it) => ({
      id: it._id,
      name: it.name,
      used: Number(it.used) || 0,
      quantity: Number(it.quantity) || 0,
    }))
    .sort((a, b) => b.used - a.used)
    .slice(0, 5);
  usedRank.forEach((u) => {
    if (u.used > 0 && u.quantity > 0 && u.used / u.quantity > 0.5) {
      alerts.push({
        type: 'high_usage',
        itemId: u.id,
        name: u.name,
        ratio: Math.round((100 * u.used) / u.quantity),
      });
    }
  });

  items.forEach((it) => {
    const st = stockStatusOf(it);
    if (st === 'low' || st === 'out') {
      alerts.push({ type: 'reorder', itemId: it._id, name: it.name, quantity: it.quantity });
    }
  });

  const dedup = [];
  const seen = new Set();
  alerts.forEach((a) => {
    const k = `${a.type}:${String(a.itemId)}`;
    if (seen.has(k)) return;
    seen.add(k);
    dedup.push(a);
  });

  return {
    totalItems,
    availableStock,
    lowStockCount,
    outOfStockCount,
    monthlyUsageCost,
    totalDamaged: items.reduce((s, i) => s + (i.damaged || 0), 0),
    totalUsed: items.reduce((s, i) => s + (i.used || 0), 0),
    totalReceived: items.reduce((s, i) => s + (i.received || 0), 0),
    totalPurchased: items.reduce((s, i) => s + (i.purchased || 0), 0),
    totalQuantity: availableStock,
    categoryQty,
    categoryDistribution,
    monthlyUsageCostSeries,
    alerts: dedup.slice(0, 25),
  };
}

router.get('/stats', async (req, res, next) => {
  try {
    const { sessionId } = req.query;
    const dash = await computeDashboard(req.tenantId, sessionId);
    res.json(dash);
  } catch (e) {
    next(e);
  }
});

router.get('/items', async (req, res, next) => {
  try {
    const filter = buildItemFilter(req.tenantId, req.query);
    const page = Math.max(1, parseInt(req.query.page, 10) || 1);
    const limit = Math.min(100, Math.max(1, parseInt(req.query.limit, 10) || 20));
    const skip = (page - 1) * limit;

    const [rows, total] = await Promise.all([
      InventoryItem.find(filter).populate('sessionId').sort({ updatedAt: -1 }).skip(skip).limit(limit).lean(),
      InventoryItem.countDocuments(filter),
    ]);

    res.json({ items: rows, total, page, limit });
  } catch (e) {
    next(e);
  }
});

router.get('/items/export', async (req, res, next) => {
  try {
    const filter = buildItemFilter(req.tenantId, req.query);
    const list = await InventoryItem.find(filter).sort({ createdAt: -1 }).limit(5000).lean();
    const rows = list.map((it) => ({
      NameUr: it.name?.ur || '',
      NameEn: it.name?.en || '',
      Category: it.category,
      Quantity: it.quantity,
      Unit: it.unit,
      UnitPrice: it.unitPrice,
      LineValue: it.lineValue,
      MinStock: it.minStockLevel,
      SupplierUr: it.supplier?.ur || '',
      SupplierEn: it.supplier?.en || '',
      PurchaseDate: it.purchaseDate ? new Date(it.purchaseDate).toISOString().slice(0, 10) : '',
      ExpiryDate: it.expiryDate ? new Date(it.expiryDate).toISOString().slice(0, 10) : '',
      Location: it.location || '',
      Barcode: it.barcode || '',
      Notes: it.notes || '',
    }));
    const wb = XLSX.utils.book_new();
    const ws = XLSX.utils.json_to_sheet(rows.length ? rows : [{ NameUr: '' }]);
    XLSX.utils.book_append_sheet(wb, ws, 'Inventory');
    const buf = XLSX.write(wb, { type: 'buffer', bookType: 'xlsx' });
    res.setHeader('Content-Type', 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet');
    res.setHeader('Content-Disposition', 'attachment; filename="inventory-items.xlsx"');
    res.send(buf);
  } catch (e) {
    next(e);
  }
});

router.post(
  '/items',
  (req, res, next) => {
    const ct = req.headers['content-type'] || '';
    if (ct.includes('multipart/form-data')) {
      return uploadFinanceReceipt.single('receipt')(req, res, (err) => (err ? next(err) : next()));
    }
    next();
  },
  async (req, res, next) => {
    try {
      const file = req.file || null;
      const b = req.body || {};
      const name =
        b.name && typeof b.name === 'object'
          ? { ur: String(b.name.ur || ''), en: String(b.name.en || '') }
          : { ur: String(b.nameUr || ''), en: String(b.nameEn || '') };
      if (!name.ur && !name.en) return res.status(400).json({ message: 'Name is required' });
      const quantity = Number(b.quantity) || 0;
      const body = {
        name,
        quantity,
        category: inEnum(b.category, INV_CATEGORIES, 'other'),
        unit: inEnum(b.unit, INV_UNITS, 'piece'),
        unitPrice: Math.max(0, Number(b.unitPrice) || 0),
        minStockLevel: Math.max(0, Number(b.minStockLevel) || LOW_STOCK_DEFAULT),
        supplier: {
          ur: String(b.supplierUr || b.supplier?.ur || ''),
          en: String(b.supplierEn || b.supplier?.en || ''),
        },
        purchaseDate: b.purchaseDate ? new Date(b.purchaseDate) : null,
        expiryDate: b.expiryDate ? new Date(b.expiryDate) : null,
        location: String(b.location || '').slice(0, 200),
        barcode: String(b.barcode || '').slice(0, 120),
        notes: String(b.notes || '').slice(0, 4000),
        receiptUrl: file ? `/uploads/${file.filename}` : String(b.receiptUrl || '').slice(0, 500),
        sessionId:
          b.sessionId && mongoose.isValidObjectId(String(b.sessionId)) ? String(b.sessionId) : undefined,
      };
      if (body.purchaseDate && Number.isNaN(body.purchaseDate.getTime())) body.purchaseDate = null;
      if (body.expiryDate && Number.isNaN(body.expiryDate.getTime())) body.expiryDate = null;

      const doc = await InventoryItem.create({ ...body, tenantId: req.tenantId });
      res.status(201).json(doc);
    } catch (e) {
      next(e);
    }
  }
);

router.put('/items/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const doc = await InventoryItem.findOneAndUpdate(
      { _id: req.params.id, tenantId: req.tenantId },
      { $set: sanitizeUpdateBody(req.body) },
      { new: true, runValidators: true }
    );
    if (!doc) return res.status(404).json({ message: 'Not found' });
    res.json(doc);
  } catch (e) {
    next(e);
  }
});

router.delete('/items/:id', async (req, res, next) => {
  try {
    if (!mongoose.isValidObjectId(req.params.id)) {
      return res.status(400).json({ message: 'Invalid id' });
    }
    const item = await InventoryItem.findOne({ _id: req.params.id, tenantId: req.tenantId });
    if (!item) {
      return res.status(404).json({ message: 'Not found' });
    }
    await StockMovement.deleteMany({ itemId: item._id, tenantId: req.tenantId });
    await InventoryItem.deleteOne({ _id: item._id, tenantId: req.tenantId });
    res.json({ ok: true });
  } catch (e) {
    next(e);
  }
});

router.get('/movements', async (req, res, next) => {
  try {
    const { kind, sessionId, page, limit } = req.query;
    const filter = { tenantId: req.tenantId };
    if (kind) filter.kind = kind;
    if (sessionId && mongoose.isValidObjectId(sessionId)) {
      const itemIds = await InventoryItem.find({ tenantId: req.tenantId, sessionId }).distinct('_id');
      filter.itemId = { $in: itemIds };
    }
    const p = Math.max(1, parseInt(page, 10) || 1);
    const lim = Math.min(100, Math.max(1, parseInt(limit, 10) || 30));
    const skip = (p - 1) * lim;
    const [list, total] = await Promise.all([
      StockMovement.find(filter).populate('itemId').sort({ date: -1, createdAt: -1 }).skip(skip).limit(lim).lean(),
      StockMovement.countDocuments(filter),
    ]);
    res.json({ items: list, total, page: p, limit: lim });
  } catch (e) {
    next(e);
  }
});

router.post('/movements', async (req, res, next) => {
  try {
    const b = req.body || {};
    const kind = inEnum(b.kind, ['entry', 'exit', 'registration'], 'entry');
    const itemId = b.itemId;
    const q = Number(b.quantity);
    const item = await InventoryItem.findOne({ _id: itemId, tenantId: req.tenantId });
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }
    if (!Number.isFinite(q) || q <= 0) {
      return res.status(400).json({ message: 'Invalid quantity' });
    }
    if ((kind === 'exit' || kind === 'registration') && (Number(item.quantity) || 0) < q) {
      return res.status(400).json({ message: 'Insufficient stock' });
    }

    const movementDate = b.date ? new Date(b.date) : new Date();
    const movementFlowVal = inEnum(b.movementFlow, MOVEMENT_FLOWS, '');
    const reason = inEnum(b.reason, ['usage', 'damage', 'loss', 'purchase', 'receive', 'other', ''], '');
    const usageLocation = b.usageLocation && typeof b.usageLocation === 'object' ? b.usageLocation : {};
    const responsiblePerson =
      b.responsiblePerson && typeof b.responsiblePerson === 'object' ? b.responsiblePerson : {};
    const supplier = b.supplier && typeof b.supplier === 'object' ? b.supplier : {};
    const notes = b.notes && typeof b.notes === 'object' ? b.notes : {};

    if (kind === 'entry') {
      item.quantity += q;
      item.received += q;
      item.purchased += q;
    } else if (kind === 'exit') {
      item.quantity -= q;
      item.used += q;
    } else if (kind === 'registration') {
      if (reason === 'damage') item.damaged += q;
      else if (reason === 'usage') item.used += q;
      item.quantity -= q;
    }
    await item.save();

    const mov = await StockMovement.create({
      tenantId: req.tenantId,
      sessionId: item.sessionId || null,
      kind,
      movementFlow: movementFlowVal || undefined,
      itemId: item._id,
      quantity: q,
      date: movementDate,
      reason: kind === 'registration' ? reason || '' : '',
      supplier,
      notes,
      usageLocation,
      responsiblePerson,
      fromLocation: String(b.fromLocation || '').slice(0, 200),
      toLocation: String(b.toLocation || '').slice(0, 200),
      department: String(b.department || '').slice(0, 120),
      referenceNo: String(b.referenceNo || '').slice(0, 120),
      purchaseUnitCost: Math.max(0, Number(b.purchaseUnitCost) || 0),
      status: inEnum(b.status, ['posted', 'pending'], 'posted'),
    });

    const createFinanceExpense = b.createFinanceExpense === true || b.createFinanceExpense === 'true';
    const totalPurchaseCost = Number(b.totalPurchaseCost);
    let financeTx = null;
    if (createFinanceExpense && kind === 'entry' && Number.isFinite(totalPurchaseCost) && totalPurchaseCost > 0) {
      const expCat = inEnum(b.purchaseExpenseCategory, EXPENSE_CATEGORIES, 'ration');
      const fundSrc = inEnum(b.purchaseFundSource, FUND_SOURCES, 'general');
      const accountId =
        b.accountId && mongoose.isValidObjectId(String(b.accountId)) ? String(b.accountId) : null;
      const titleUr = String(b.expenseTitleUr || item.name?.ur || 'اسٹاک خریداری');
      const titleEn = String(b.expenseTitleEn || item.name?.en || 'Stock purchase');
      financeTx = await Transaction.create({
        tenantId: req.tenantId,
        sessionId: item.sessionId || undefined,
        accountId: accountId || undefined,
        title: { ur: titleUr, en: titleEn },
        amount: totalPurchaseCost,
        date: movementDate,
        type: 'expense',
        fundType: 'general',
        expenseCategory: expCat,
        fundSource: fundSrc,
        notes: String(b.purchaseNotes || '').slice(0, 4000),
        usageFor: { ur: '', en: '' },
        status: 'posted',
        inventoryItemId: item._id,
        linkedStockMovementId: mov._id,
      });
      if (financeTx.accountId) {
        const acc = await FinanceAccount.findOne({ _id: financeTx.accountId, tenantId: req.tenantId });
        if (acc) {
          acc.currentAmount -= totalPurchaseCost;
          await acc.save();
        }
      }
      mov.financeTransactionId = financeTx._id;
      await mov.save();
    }

    const freshItem = await InventoryItem.findById(item._id).lean();
    res.status(201).json({ movement: mov, item: freshItem, financeTransaction: financeTx });
  } catch (e) {
    next(e);
  }
});

export default router;
