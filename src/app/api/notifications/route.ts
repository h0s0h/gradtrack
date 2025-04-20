// عند إنشاء إشعار جديد، تأكد من استخدام التنسيق الميلادي للتاريخ
const notification = {
  // ... other notification fields
  created_at: new Date().toISOString(), // استخدام ISO string للتوافق مع التنسيق الميلادي
}; 