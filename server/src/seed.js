import 'dotenv/config';
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from './config/db.js';
import { Tenant } from './models/Tenant.js';
import { User } from './models/User.js';
import { Teacher } from './models/Teacher.js';
import { Grade } from './models/Grade.js';
import { Student } from './models/Student.js';
import { StudentFeeBalance } from './models/StudentFeeBalance.js';
import { FinanceAccount } from './models/FinanceAccount.js';
import { Transaction } from './models/Transaction.js';
import { InventoryItem } from './models/InventoryItem.js';
import { StudentAttendance } from './models/StudentAttendance.js';
import { TeacherAttendance } from './models/TeacherAttendance.js';
import { FeeItem } from './models/FeeItem.js';
import { FinanceCategory } from './models/FinanceCategory.js';
import { AccountTransfer } from './models/AccountTransfer.js';
import { StockMovement } from './models/StockMovement.js';
import { Book } from './models/Book.js';
import { TenantSettings } from './models/TenantSettings.js';

async function run() {
  await connectDb();
  const slug = process.env.SEED_TENANT_SLUG || 'main';
  const existing = await Tenant.findOne({ slug });
  if (existing) {
    const tid = existing._id;
    await Promise.all([
      User.deleteMany({ tenantId: tid }),
      Teacher.deleteMany({ tenantId: tid }),
      Grade.deleteMany({ tenantId: tid }),
      Student.deleteMany({ tenantId: tid }),
      StudentAttendance.deleteMany({ tenantId: tid }),
      TeacherAttendance.deleteMany({ tenantId: tid }),
      FeeItem.deleteMany({ tenantId: tid }),
      StudentFeeBalance.deleteMany({ tenantId: tid }),
      FinanceAccount.deleteMany({ tenantId: tid }),
      FinanceCategory.deleteMany({ tenantId: tid }),
      Transaction.deleteMany({ tenantId: tid }),
      AccountTransfer.deleteMany({ tenantId: tid }),
      InventoryItem.deleteMany({ tenantId: tid }),
      StockMovement.deleteMany({ tenantId: tid }),
      Book.deleteMany({ tenantId: tid }),
      TenantSettings.deleteMany({ tenantId: tid }),
    ]);
    await Tenant.deleteOne({ _id: tid });
  }
  const tenant = await Tenant.create({
    slug,
    name: { ur: 'دارالعلوم عربیا', en: 'Darul Uloom Arabia' },
  });

  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@123';
  const hash = await bcrypt.hash(password, 10);
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@darooluloom.com').trim().toLowerCase();
  await User.create({
    tenantId: tenant._id,
    username: email,
    email,
    phone: '+920000000000',
    name: { ur: 'منتظم', en: 'Administrator' },
    passwordHash: hash,
    preferredLocale: 'ur',
    role: 'admin',
  });

  const t1 = await Teacher.create({
    tenantId: tenant._id,
    name: { ur: 'استاد ایک', en: 'Teacher One' },
    parentage: { ur: 'ولدِ …', en: 'Son of …' },
    idCard: '35202-1111111-1',
    phone: '03001234567',
    status: 'active',
  });

  const g1 = await Grade.create({
    tenantId: tenant._id,
    year: 2025,
    name: { ur: 'ساتویں جماعت', en: 'Grade 7' },
    section: 'A',
    code: 'G7-A',
    responsibleTeacherId: t1._id,
  });

  const st = await Student.create({
    tenantId: tenant._id,
    studentId: 'STU-001',
    name: { ur: 'طالب علم نمونہ', en: 'Sample Student' },
    gradeId: g1._id,
    currentGradeId: g1._id,
    fatherName: { ur: 'والد کا نام', en: 'Father Name' },
    phone: '03009998877',
    city: 'Karachi',
    enrollmentDate: new Date(),
  });

  await StudentFeeBalance.create({
    tenantId: tenant._id,
    studentId: st._id,
    balance: 5000,
    advance: 1000,
    due: 4000,
  });

  const acc = await FinanceAccount.create({
    tenantId: tenant._id,
    name: { ur: 'مرکزی کھاتہ', en: 'Main account' },
    currentAmount: 47850,
  });

  await Transaction.create({
    tenantId: tenant._id,
    title: { ur: 'عطیہ', en: 'Donation' },
    amount: 349900,
    date: new Date(),
    type: 'income',
    accountId: acc._id,
    fundType: 'donations',
    status: 'posted',
  });

  await Transaction.create({
    tenantId: tenant._id,
    title: { ur: 'اخراجات', en: 'Expenses batch' },
    amount: 397750,
    date: new Date(),
    type: 'expense',
    accountId: acc._id,
    expenseCategory: 'other',
    fundSource: 'general',
    status: 'posted',
  });

  await InventoryItem.create({
    tenantId: tenant._id,
    name: { ur: 'نمونہ اشیاء', en: 'Sample item' },
    quantity: 100,
    received: 100,
    purchased: 100,
    category: 'books',
    unit: 'piece',
    unitPrice: 50,
    minStockLevel: 10,
    purchaseDate: new Date(),
  });

  // eslint-disable-next-line no-console
  console.log('Seed OK. Tenant:', slug, 'User:', username, 'Password:', password);
  await mongoose.disconnect();
}

run().catch((e) => {
  // eslint-disable-next-line no-console
  console.error(e);
  process.exit(1);
});
