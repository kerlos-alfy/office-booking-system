const fs = require('fs');

// 1️⃣ اقرأ الملف الأصلي
const data = require('./data_cleaned_output.json'); // عدّل الاسم لو الملف اسمه مختلف

// 2️⃣ ابدأ التعديل
const cleanedData = data.map((item, index) => {
  // 🟢 نسخ النسخة الأصلية
  const newItem = { ...item };

  // ✅ تأكد إن الـ mobile String أو null
  if (!newItem.mobile || newItem.mobile.trim() === '-' || newItem.mobile.trim().toLowerCase().includes('no contract')) {
    newItem.mobile = null;
  } else {
    newItem.mobile = String(newItem.mobile).trim();
  }

  // ✅ تأكد إن ejari_no String لو موجود
  if (newItem.ejari_no !== undefined && newItem.ejari_no !== null) {
    newItem.ejari_no = String(newItem.ejari_no).trim();
  }

  // ✅ نظف الإيميل لو موجود
  if (newItem.email) {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(newItem.email)) {
      console.log(`Warning: Invalid email at record ${index + 1}: ${newItem.email}`);
      newItem.email = null; // أو احذف السطر لو عايز تمسحه
    }
  }

  // ✅ تأكد إن company_en موجود، لو مش موجود ممكن تمسح الريكورد (هنتعامل معاه بعدين)

  return newItem;
});

// 3️⃣ حذف العناصر اللي ملهاش company_en لو حابب
const finalCleaned = cleanedData.filter(item => item.company_en && item.company_en.trim() !== '');

// 4️⃣ اكتب الملف الجديد
fs.writeFileSync('clients_cleaned_ready.json', JSON.stringify(finalCleaned, null, 2), 'utf-8');

console.log('✅ Done! File saved as clients_cleaned_ready.json');
