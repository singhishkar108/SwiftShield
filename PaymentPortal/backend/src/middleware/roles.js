export function requireAuth(req, res, next) {
    // You already verify JWT + attach req.user; we just gate disabled users.
    if (!req.user || req.user.isDisabled) return res.status(401).json({ ok:false, msg:'Unauthorized' });
    next();
  }
  
  export function requireStaff(req, res, next) {
    if (!req.user || (req.user.role !== 'staff' && req.user.role !== 'admin') || req.user.isDisabled) {
      return res.status(403).json({ ok:false, msg:'Forbidden' });
    }
    next();
  }
  
  export function requireAdmin(req, res, next) {
    if (!req.user || req.user.role !== 'admin' || req.user.isDisabled) {
      return res.status(403).json({ ok:false, msg:'Forbidden' });
    }
    next();
  }
  