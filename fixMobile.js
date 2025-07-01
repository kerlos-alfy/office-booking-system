const fs = require('fs');

// حمّل البيانات من الملف الأصلي
const data = require('./clients_cleaned_ready.json');

const fixedData = data.map(item => {
  if (item.ejari_no) {
    // شيل رموز أو حروف زي "AED"
    const cleaned = item.ejari_no.toString().replace(/[^\d.]/g, '');
    const numberVal = parseFloat(cleaned);
    item.ejari_no = isNaN(numberVal) ? 0 : numberVal;
  } else {
    // لو مفيش ejari_no خالص
    item.ejari_no = 0;
  }
  return item;
});

// احفظ النتيجة في ملف جديد
fs.writeFileSync('./clients_fixed_ejari_default.json', JSON.stringify(fixedData, null, 2));

console.log('✅ Done! Saved as clients_fixed_ejari_default.json');
