function isLoggedIn(req, res, next) {
  if (req.session && req.session.user) return next();
  return res.redirect('/login');
}

function hasPermission(permissionKey) {
  return (req, res, next) => {
    const user = req.session.user;

    if (!user || !user.role?.permissions) {
      console.log('⛔️ No user or permissions in session');
      return res.status(403).render('unauthorized');
    }

    const userPermissions = user.role.permissions;

    console.log('🟡 Checking permission:', permissionKey);
    console.log('🟢 User Permissions:', userPermissions);

    if (userPermissions.includes(permissionKey)) {
      return next();
    }

    return res.status(403).render('unauthorized');
  };
}

module.exports = { isLoggedIn, hasPermission };
