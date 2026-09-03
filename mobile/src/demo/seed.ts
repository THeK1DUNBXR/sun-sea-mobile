/**
 * Demo mode — seeds the on-device database with realistic sample data so the
 * prototype can be explored end-to-end without a backend. Everything here is
 * local; nothing is ever sent to a server while in demo mode.
 */
import { database, tables } from '../db';
import { addDays, todayYmd } from '../utils/format';

export const DEMO_AGENT = {
  userId: 'demo-agent',
  fullName: 'Arun Kumar',
  email: 'arun.kumar@sunsea.in',
  isSuperAdmin: false,
};

const id = (n: number, prefix = 'd0000000-0000-4000-8000-') => `${prefix}${String(n).padStart(12, '0')}`;
const CID = (n: number) => id(n, 'c0000000-0000-4000-8000-');
const IID = (n: number) => id(n, '10000000-0000-4000-8000-');
const PID = (n: number) => String(n);
const VID = (n: number) => id(n, 'e0000000-0000-4000-8000-');
const RID = id(1, 'f0000000-0000-4000-8000-');
const COLID = (n: number) => id(n, 'a0000000-0000-4000-8000-');
const OID = (n: number) => id(n, 'b0000000-0000-4000-8000-');

const grades = JSON.stringify({ 'Grade A': null, 'Grade B': null });

export async function seedDemoData() {
  const now = Date.now();
  const today = todayYmd();
  const at = (ymd: string, hh: number, mm = 0) => {
    const [y, m, d] = ymd.split('-').map(Number);
    return new Date(y, m - 1, d, hh, mm).getTime();
  };

  const customers = [
    { n: 1, code: 'CUST001', firm: 'Sri Balaji Stores', mobile: '9840012345', addr: '123, Anna Salai', city: 'Chennai', pin: '600002', grade: 'Grade A', credit: 50000, days: 30, outstanding: 18750 },
    { n: 2, code: 'CUST002', firm: 'Kumar Trading', mobile: '9840123456', addr: '45, Mount Road', city: 'Chennai', pin: '600006', grade: 'Grade B', credit: 75000, days: 45, outstanding: 32400 },
    { n: 3, code: 'CUST003', firm: 'Modern Super Market', mobile: '9884001122', addr: '23, Bazaar Road, Mylapore', city: 'Chennai', pin: '600004', grade: 'Grade A', credit: 100000, days: 30, outstanding: 9600 },
    { n: 4, code: 'CUST004', firm: 'Green Land Stores', mobile: '9884556677', addr: '78, Velachery Main Road', city: 'Chennai', pin: '600042', grade: 'Grade B', credit: 40000, days: 30, outstanding: 0 },
    { n: 5, code: 'CUST005', firm: 'Lakshmi Provisions', mobile: '9900112233', addr: '12, GST Road, Tambaram', city: 'Chennai', pin: '600045', grade: 'Grade B', credit: 30000, days: 15, outstanding: 5200 },
    { n: 6, code: 'CUST006', firm: 'Annai Departmental', mobile: '9944556677', addr: '7, OMR, Sholinganallur', city: 'Chennai', pin: '600119', grade: 'Grade A', credit: 60000, days: 30, outstanding: 24300 },
    { n: 7, code: 'CUST007', firm: 'Chola Traders', mobile: '9791234567', addr: '55, Poonamallee High Road', city: 'Chennai', pin: '600084', grade: 'Grade B', credit: 25000, days: 30, outstanding: 1800 },
    { n: 8, code: 'CUST008', firm: 'Vel Murugan Stores', mobile: '9787654321', addr: '9, Kamarajar Salai, Madipakkam', city: 'Chennai', pin: '600091', grade: 'Grade A', credit: 35000, days: 30, outstanding: 7350 },
  ];

  // invoiceNo, customer, daysAgo, total, paid
  const invoices: [string, number, number, number, number][] = [
    ['INV-10045', 1, 25, 7850, 0],
    ['INV-10046', 1, 40, 6450, 0],
    ['INV-10047', 1, 70, 4450, 0],
    ['INV-10031', 1, 95, 6200, 6200],
    ['INV-10050', 2, 12, 15400, 0],
    ['INV-10038', 2, 48, 17000, 0],
    ['INV-10052', 3, 8, 9600, 0],
    ['INV-10040', 3, 60, 12000, 12000],
    ['INV-10036', 4, 55, 8300, 8300],
    ['INV-10049', 5, 20, 5200, 0],
    ['INV-10044', 6, 33, 14300, 0],
    ['INV-10048', 6, 15, 10000, 0],
    ['INV-10042', 7, 105, 1800, 0],
    ['INV-10051', 8, 10, 11350, 4000],
  ];

  const products: [number, string, string, string, number, string][] = [
    [41, 'SSR-25', 'Sun Sea Rice 25kg', 'Bag', 1250, 'Rice'],
    [42, 'SSR-10', 'Sun Sea Rice 10kg', 'Bag', 520, 'Rice'],
    [43, 'SSR-05', 'Sun Sea Rice 5kg', 'Bag', 270, 'Rice'],
    [57, 'SSO-1L', 'Sun Sea Oil 1L', 'Pouch', 180, 'Edible Oil'],
    [58, 'SSO-5L', 'Sun Sea Oil 5L', 'Can', 860, 'Edible Oil'],
    [61, 'SSS-1K', 'Sun Sea Sugar 1kg', 'Pack', 45, 'Sugar'],
    [62, 'SSS-5K', 'Sun Sea Sugar 5kg', 'Pack', 215, 'Sugar'],
    [71, 'SSA-500', 'Sun Sea Atta 500g', 'Pack', 32, 'Flour'],
    [72, 'SSA-5K', 'Sun Sea Atta 5kg', 'Bag', 260, 'Flour'],
    [81, 'SST-250', 'Sun Sea Tea 250g', 'Pack', 140, 'Beverages'],
  ];

  // customer, plannedTime, sequence, status, checkIn hour
  const todaysVisits: [number, string, number, 'PLANNED' | 'IN_PROGRESS' | 'COMPLETED', number | null][] = [
    [8, '09:00', 1, 'COMPLETED', 9],
    [3, '09:45', 2, 'COMPLETED', 10],
    [1, '11:00', 3, 'IN_PROGRESS', 11],
    [2, '12:30', 4, 'PLANNED', null],
    [6, '14:00', 5, 'PLANNED', null],
    [4, '15:30', 6, 'PLANNED', null],
  ];
  const tomorrowsVisits: [number, string, number][] = [
    [5, '09:30', 1],
    [7, '11:00', 2],
    [2, '13:30', 3],
    [8, '15:00', 4],
  ];

  await database.write(async () => {
    await database.unsafeResetDatabase();

    const batch = [
      ...customers.map((c) =>
        tables.customers().prepareCreate((r) => {
          r._raw.id = CID(c.n);
          r.customerCode = c.code;
          r.firmName = c.firm;
          r.displayName = null;
          r.mobile = c.mobile;
          r.email = null;
          r.gstin = `33AA${c.code}1Z5`;
          r.addressLine = c.addr;
          r.city = c.city;
          r.state = 'Tamil Nadu';
          r.pincode = c.pin;
          r.creditLimit = c.credit;
          r.creditDays = c.days;
          r.outstanding = c.outstanding;
          r.gradeName = c.grade;
          r.typeName = 'Retailer';
          r.status = 'Active';
          r.updatedAt = now;
        })
      ),
      ...invoices.map(([no, cust, daysAgo, total, paid], i) =>
        tables.invoices().prepareCreate((r) => {
          r._raw.id = IID(i + 1);
          r.invoiceNo = no;
          r.customerId = CID(cust);
          r.invoiceDate = addDays(today, -daysAgo);
          r.dueDate = addDays(today, -daysAgo + (customers[cust - 1].days || 30));
          r.grandTotal = total;
          r.paidAmount = paid;
          r.balance = total - paid;
          r.status = paid >= total ? 'PAID' : paid > 0 ? 'PARTIAL' : 'UNPAID';
          r.updatedAt = now;
        })
      ),
      ...products.map(([pid, code, name, uom, rate, cat]) =>
        tables.products().prepareCreate((r) => {
          r._raw.id = PID(pid);
          r.productCode = code;
          r.productName = name;
          r.uom = uom;
          r.rate = rate;
          r.gradeRates = grades.replace('null', String(Math.round(rate * 0.96))).replace('null', String(rate));
          r.category = cat;
          r.isActive = true;
          r.updatedAt = now;
        })
      ),
      tables.routes().prepareCreate((r) => {
        r._raw.id = RID;
        r.routeCode = 'RT-CHN-01';
        r.routeName = 'Chennai South – Anna Salai / OMR';
      }),
      ...customers.map((c, i) =>
        tables.routeCustomers().prepareCreate((r) => {
          r._raw.id = id(i + 1, 'f1000000-0000-4000-8000-');
          r.routeId = RID;
          r.customerId = CID(c.n);
          r.sequence = i + 1;
          r.plannedTime = null;
        })
      ),
      ...todaysVisits.map(([cust, time, seq, status, checkIn], i) =>
        tables.visits().prepareCreate((r) => {
          r._raw.id = VID(i + 1);
          r.customerId = CID(cust);
          r.routeId = RID;
          r.plannedDate = today;
          r.plannedTime = time;
          r.sequence = seq;
          r.status = status;
          r.outcome = status === 'COMPLETED' ? (i === 0 ? 'COLLECTION' : 'BOTH') : null;
          r.checkInAt = checkIn ? at(today, checkIn, 5) : null;
          r.checkOutAt = status === 'COMPLETED' && checkIn ? at(today, checkIn, 40) : null;
          r.latitude = status === 'PLANNED' ? null : 13.0604;
          r.longitude = status === 'PLANNED' ? null : 80.2496;
          r.notes = null;
          r.updatedAt = now;
        })
      ),
      ...tomorrowsVisits.map(([cust, time, seq], i) =>
        tables.visits().prepareCreate((r) => {
          r._raw.id = VID(20 + i);
          r.customerId = CID(cust);
          r.routeId = RID;
          r.plannedDate = addDays(today, 1);
          r.plannedTime = time;
          r.sequence = seq;
          r.status = 'PLANNED';
          r.outcome = null;
          r.checkInAt = null;
          r.checkOutAt = null;
          r.latitude = null;
          r.longitude = null;
          r.notes = null;
          r.updatedAt = now;
        })
      ),
      // Earlier collections (already posted to the ERP)
      tables.collections().prepareCreate((r) => {
        r._raw.id = COLID(1);
        r.receiptNo = 'MC-2026-00118';
        r.customerId = CID(1);
        r.visitId = null;
        r.amount = 6200;
        r.paymentMode = 'UPI';
        r.referenceNo = '412233998877';
        r.bankName = null;
        r.chequeDate = null;
        r.drawerName = null;
        r.collectedAt = at(addDays(today, -4), 10, 45);
        r.notes = null;
        r.allocations = [{ invoiceId: IID(4), invoiceNo: 'INV-10031', amount: 6200 }];
        r.attachments = [];
        r.status = 'POSTED';
        r.syncError = null;
        r.updatedAt = now;
      }),
      tables.collections().prepareCreate((r) => {
        r._raw.id = COLID(2);
        r.receiptNo = 'MC-2026-00124';
        r.customerId = CID(8);
        r.visitId = VID(1);
        r.amount = 4000;
        r.paymentMode = 'Cash';
        r.referenceNo = null;
        r.bankName = null;
        r.chequeDate = null;
        r.drawerName = null;
        r.collectedAt = at(today, 9, 20);
        r.notes = 'Part payment, balance next week';
        r.allocations = [{ invoiceId: IID(14), invoiceNo: 'INV-10051', amount: 4000 }];
        r.attachments = [];
        r.status = 'POSTED';
        r.syncError = null;
        r.updatedAt = now;
      }),
      tables.collections().prepareCreate((r) => {
        r._raw.id = COLID(3);
        r.receiptNo = 'MC-2026-00125';
        r.customerId = CID(3);
        r.visitId = VID(2);
        r.amount = 12000;
        r.paymentMode = 'Cheque';
        r.referenceNo = '004512';
        r.bankName = 'Indian Bank';
        r.chequeDate = today;
        r.drawerName = 'Modern Super Market';
        r.collectedAt = at(today, 10, 10);
        r.notes = null;
        r.allocations = [{ invoiceId: IID(8), invoiceNo: 'INV-10040', amount: 12000 }];
        r.attachments = [];
        r.status = 'POSTED';
        r.syncError = null;
        r.updatedAt = now;
      }),
      tables.orders().prepareCreate((r) => {
        r._raw.id = OID(1);
        r.orderNo = 'SO-2026-031';
        r.salesOrderId = '31';
        r.customerId = CID(3);
        r.visitId = VID(2);
        r.orderDate = today;
        r.items = [
          { productId: '41', productName: 'Sun Sea Rice 25kg', quantity: 4, uom: 'Bag' },
          { productId: '57', productName: 'Sun Sea Oil 1L', quantity: 12, uom: 'Pouch' },
        ];
        r.totalAmount = 4 * 1200 + 12 * 172.8;
        r.remarks = 'Deliver Thursday morning';
        r.status = 'DRAFT';
        r.syncError = null;
        r.updatedAt = now;
      }),
    ];
    await database.batch(...batch);
  });

  // Reflect the two settled invoices / part payment in the customer figures used above:
  // CUST008 outstanding 7350 = 11350 billed - 4000 collected today (already applied in the data).
}
