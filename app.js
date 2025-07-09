const express = require("express");
const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config();
const methodOverride = require("method-override");
const morgan = require("morgan");
const cookieParser = require('cookie-parser');

const app = express();

// ✅ Middlewares أساسية
app.use(cookieParser());
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(methodOverride("_method"));
app.use(morgan("dev"));

// ✅ View Engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "src", "views"));
// ✅ Static Files بعد الـ JWT Middleware
app.use(express.static(path.join(__dirname, "public")));
app.use("/uploads", express.static(path.join(__dirname, "src", "public", "uploads")));

// ✅ MongoDB Connection
mongoose
  .connect(process.env.MONGO_URI)
  .then(() => console.log("✅ MongoDB connected"))
  .catch((err) => console.error("❌ MongoDB error:", err));

// ✅ Debug: اطبع كل request
app.use((req, res, next) => {
  console.log('🔥 Incoming Path:', req.path);
  next();
});

// ✅ Middleware عام لحماية كل المسارات ماعدا المسموحة
app.use((req, res, next) => {
  if (
    req.path === '/' ||                  // ✅ استثني الروت نفسه
    req.path.startsWith('/login') ||
    req.path.startsWith('/logout') ||
    req.path.startsWith('/client')
  ) {
    console.log('✅ Allowed path:', req.path);
    return next();
  }

  const token = req.cookies.token;

  console.log('🍪 Global Middleware Cookies:', req.cookies);

  if (!token) {
    console.log('⛔️ No JWT token found - redirecting to /login');
    return res.redirect('/login');
  }

  next();
});


// ✅ Import Routes
const authRoutes = require("./src/routes/auth");
const adminRoutes = require("./src/routes/admin");
const adminRolesRouter = require("./src/routes/adminRoles");
const adminPermissionsRouter = require("./src/routes/adminPermissions");
const adminLogsRouter = require("./src/routes/adminLogs");

const branchesRoutes = require("./src/routes/Branch");
const officesRoutes = require("./src/routes/Offices");
const clientsRoutes = require("./src/routes/Clients");
const bookingsRoutes = require("./src/routes/Bookings");
const paymentsRoutes = require("./src/routes/Payments");
const reportsRoutes = require("./src/routes/Reports");
const inspectionRoutes = require("./src/routes/Inspections");
const exploreRoutes = require("./src/routes/explore");
const generalRoutes = require("./src/routes/general");
const invoiceRoutes = require("./src/routes/invoice");
const adminBranchRoutes = require('./src/routes/adminBranch');
const reportsRouter = require('./src/routes/reportsnew');


// ✅ Route: /
app.get("/", (req, res) => {
  console.log('➡️ Redirecting / → /client');
  res.redirect("/client");
});

// ✅ Register Routes
app.use(authRoutes);
app.use("/admin", adminRoutes);
app.use("/admin", adminRolesRouter);
app.use("/admin", adminPermissionsRouter);
app.use("/admin/logs", adminLogsRouter);

app.use("/branches", branchesRoutes);
app.use("/offices", officesRoutes);
app.use("/clients", clientsRoutes);
app.use("/bookings", bookingsRoutes);
app.use("/payments", paymentsRoutes);
app.use("/reports", reportsRoutes);
app.use("/inspections", inspectionRoutes);
app.use("/client", exploreRoutes);
app.use(generalRoutes);
app.use("/", invoiceRoutes);
app.use(adminBranchRoutes);

app.use('/reports', reportsRouter);
// ✅ Start Server
const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
