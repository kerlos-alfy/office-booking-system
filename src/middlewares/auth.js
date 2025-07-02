const jwt = require('jsonwebtoken');

// ✅ التحقق من التوكن
function authenticateJWT(req, res, next) {
  const token = req.cookies.token;

  console.log('🍪 Cookies:', req.cookies);

  if (!token) {
    console.log('⛔️ No JWT token found - redirecting to /login');
    return res.redirect('/login');
  }

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    console.log('🔑 JWT Decoded:', decoded);
    req.user = decoded;
    next();
  } catch (err) {
    console.error('❌ JWT verification failed:', err);
    return res.redirect('/login');
  }
}

// ✅ التحقق من الصلاحية
function hasPermission(permissionKey) {
  return (req, res, next) => {
    const userPermissions = req.user?.permissions;

    console.log('🟢 User permissions:', userPermissions);

    if (!userPermissions) {
      console.log('⛔️ No permissions in JWT');
      return res.status(403).render('unauthorized');
    }

    if (userPermissions.includes(permissionKey)) {
      console.log(`✅ Permission ${permissionKey} granted`);
      return next();
    }

    console.log(`⛔️ Permission ${permissionKey} denied`);
    return res.status(403).render('unauthorized');
  };
}

// ✅ أهم سطر!
module.exports = { authenticateJWT, hasPermission };
