// routes/invoice.js
const express = require("express");
const router = express.Router();
const Booking = require("../models/Booking");
const ejs = require("ejs");
const puppeteer = require("puppeteer");
const path = require("path");
const writtenNumber = require("written-number");

router.get("/invoices/:id/edit", async (req, res) => {
  try {
    const bookingId = req.params.id;
    console.log("🔍 Invoice Edit | Booking ID:", bookingId);

    const booking = await Booking.findById(bookingId)
      .populate("client_id")
      .populate({
        path: "office_id",
        populate: {
          path: "branch_id",
          model: "Branch",
        },
      });

    if (!booking) {
      console.warn("⛔ Booking not found for ID:", bookingId);
      return res.status(404).send("Booking not found");
    }

    res.render("invoices/edit", {
      booking,
      items: [], // ✅ نرسل array فاضية لتجنب الخطأ في EJS
    });
  } catch (err) {
    console.error("❌ Error in GET /invoices/:id/edit:", err);
    res.status(500).send("Server Error");
  }
});


  
router.post("/generate-invoice-preview", async (req, res) => {
  try {
    const {
      bookingId,
      total_price,
      admin_fee,
      commission,
      sec_deposit,
      descriptions = [],
      qtys = [],
      rates = [],
      vat_rates = [],
      invoice_date
    } = req.body;

    const booking = await Booking.findById(bookingId)
      .populate("client_id")
      .populate({
        path: "office_id",
        populate: { path: "branch_id", model: "Branch" }
      });

    if (!booking) return res.status(404).send("Booking not found");

    // ✅ إنشاء صفوف الفاتورة الديناميكية
    const items = descriptions.map((desc, i) => {
      const qty = parseFloat(qtys[i]) || 0;
      const rate = parseFloat(rates[i]) || 0;
      const vatRate = parseFloat(vat_rates[i]) || 0;

      const taxable = qty * rate;
      const vatAmount = (taxable * vatRate) / 100;
      const total = taxable + vatAmount;

      return { desc, qty, rate, vatRate, taxable, vatAmount, total };
    });

    // ✅ حساب الإجمالي وتحويله إلى كلمات بدون "Zero Fils" لو مش موجود
    const totalAmount = items.reduce((sum, item) => sum + item.total, 0);
    const integerPart = Math.floor(totalAmount);
    const fractionalPart = Math.round((totalAmount % 1) * 100);

    const integerWords = writtenNumber(integerPart, { lang: "en" }).replace(/\b\w/g, l => l.toUpperCase());
    let totalInWords = integerWords;

    if (fractionalPart > 0) {
      const filsWords = writtenNumber(fractionalPart, { lang: "en" }).replace(/\b\w/g, l => l.toUpperCase());
      totalInWords += ` And ${filsWords} Fils`;
    }

    totalInWords += " Only";

    // ✅ تنسيق تاريخ الفاتورة
    const invoiceDateFormatted = new Date(invoice_date).toLocaleDateString("en-GB");

    // ✅ توليد الـ HTML من القالب
    const html = await ejs.renderFile(
      path.join(__dirname, "../views/invoice-template.ejs"),
      {
        booking,
        items,
        invoice_date: invoiceDateFormatted,
        amountInWords: totalInWords,
        totalAmount: totalAmount.toFixed(2)
      }
    );

    // ✅ توليد PDF باستخدام Puppeteer
    const browser = await puppeteer.launch({ headless: "new" });
    const page = await browser.newPage();
    await page.setContent(html, { waitUntil: "networkidle0" });

    const pdfBuffer = await page.pdf({
      format: "A4",
      printBackground: true,
      margin: { top: "20mm", bottom: "20mm", left: "10mm", right: "10mm" }
    });

    await browser.close();

    // ✅ إرسال الملف للعرض في المتصفح
    res.setHeader("Content-Type", "application/pdf");
    res.setHeader("Content-Disposition", "inline; filename=invoice.pdf");
    res.send(pdfBuffer);
  } catch (err) {
    console.error("❌ PDF generation error:", err);
    res.status(500).send("Something went wrong generating the invoice.");
  }
});


module.exports = router;
