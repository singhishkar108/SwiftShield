// backend/src/routes/admin.routes.js
import express from 'express';
import { requireAdmin } from '../middleware/roles.js';
import { User } from '../models/User.js';
import { Payment } from '../models/Payment.js';
import { reObjectId, reUserQuery, rePage, rePageSize } from '../validation/whitelists.js';

const r = express.Router();
r.use(requireAdmin);

function shapePaymentRow(p) {
  return {
    _id: p._id,
    amount: p.amount,
    currency: p.currency,
    beneficiarySwift: p.beneficiarySwift,
    status: p.status,
  };
}

/** GET /admin/users?q=&page=&pageSize= */
r.get('/users', async (req, res) => {
  const { q='', page='1', pageSize='20' } = req.query;
  if (!rePage.test(page) || !rePageSize.test(pageSize)) return res.status(400).json({ ok:false, msg:'bad paging' });
  if (q && !reUserQuery.test(q)) return res.status(400).json({ ok:false, msg:'bad query' });

  const match = q ? {
    $or: [
      { username: new RegExp(q, 'i') },
      { fullName: new RegExp(q, 'i') }
    ]
  } : {};

  const [items, total] = await Promise.all([
    User.find(match)
      .select('username fullName role isDisabled createdAt')
      .sort({ createdAt:-1 })
      .skip((+page-1)*(+pageSize))
      .limit(+pageSize)
      .lean(),
    User.countDocuments(match)
  ]);

  res.json({ ok:true, items, total });
});

/** GET /admin/users/:id */
r.get('/users/:id', async (req, res) => {
  const { id } = req.params;
  if (!reObjectId.test(id)) return res.status(400).json({ ok:false, msg:'bad id' });
  const u = await User.findById(id).select('username fullName role isDisabled createdAt').lean();
  if (!u) return res.status(404).json({ ok:false, msg:'not found' });
  res.json({ ok:true, item:u });
});

/** GET /admin/users/:id/payments */
r.get('/users/:id/payments', async (req, res) => {
  const { id } = req.params;
  if (!reObjectId.test(id)) return res.status(400).json({ ok:false, msg:'bad id' });

  const items = await Payment.find({ owner: id })
    .sort({ createdAt:-1 })
    .select('amount currency beneficiarySwift status')
    .lean();

  res.json({ ok:true, items: items.map(shapePaymentRow) });
});

/** POST /admin/users/:id/toggle */
r.post('/users/:id/toggle', async (req, res) => {
  const { id } = req.params;
  if (!reObjectId.test(id)) return res.status(400).json({ ok:false, msg:'bad id' });

  const u = await User.findById(id);
  if (!u) return res.status(404).json({ ok:false, msg:'not found' });
  u.isDisabled = !u.isDisabled;
  await u.save();
  res.json({ ok:true, item:{ id:u._id, isDisabled:u.isDisabled } });
});

export default r;
