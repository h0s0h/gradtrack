import { test, expect } from '@playwright/test';

// اختبار وظائف المصادقة
test.describe('اختبار نظام المصادقة', () => {
  test('يجب أن تعمل صفحة تسجيل الدخول بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة تسجيل الدخول
    await page.goto('/auth/login');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByRole('heading', { name: 'تسجيل الدخول' })).toBeVisible();
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
    await expect(page.getByLabel('كلمة المرور')).toBeVisible();
    await expect(page.getByRole('button', { name: 'تسجيل الدخول' })).toBeVisible();
    
    // اختبار التحقق من صحة المدخلات
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await expect(page.getByText('البريد الإلكتروني مطلوب')).toBeVisible();
    
    // إدخال بريد إلكتروني غير صالح
    await page.getByLabel('البريد الإلكتروني').fill('invalid-email');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    await expect(page.getByText('البريد الإلكتروني غير صالح')).toBeVisible();
  });
  
  test('يجب أن تعمل صفحة التسجيل بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة التسجيل
    await page.goto('/auth/signup');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByRole('heading', { name: 'إنشاء حساب جديد' })).toBeVisible();
    await expect(page.getByLabel('الاسم الكامل')).toBeVisible();
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
    await expect(page.getByLabel('كلمة المرور')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إنشاء حساب' })).toBeVisible();
    
    // اختبار التحقق من صحة المدخلات
    await page.getByRole('button', { name: 'إنشاء حساب' }).click();
    await expect(page.getByText('الاسم الكامل مطلوب')).toBeVisible();
    await expect(page.getByText('البريد الإلكتروني مطلوب')).toBeVisible();
    await expect(page.getByText('كلمة المرور مطلوبة')).toBeVisible();
    
    // إدخال كلمة مرور قصيرة
    await page.getByLabel('كلمة المرور').fill('123');
    await page.getByRole('button', { name: 'إنشاء حساب' }).click();
    await expect(page.getByText('كلمة المرور يجب أن تكون 6 أحرف على الأقل')).toBeVisible();
  });
  
  test('يجب أن تعمل صفحة نسيت كلمة المرور بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة نسيت كلمة المرور
    await page.goto('/auth/forgot-password');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByRole('heading', { name: 'استعادة كلمة المرور' })).toBeVisible();
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' })).toBeVisible();
    
    // اختبار التحقق من صحة المدخلات
    await page.getByRole('button', { name: 'إرسال رابط إعادة التعيين' }).click();
    await expect(page.getByText('البريد الإلكتروني مطلوب')).toBeVisible();
  });
});

// اختبار وظائف المشاريع
test.describe('اختبار وظائف المشاريع', () => {
  // قبل كل اختبار، قم بتسجيل الدخول
  test.beforeEach(async ({ page }) => {
    // تسجيل الدخول (يجب تعديل هذا ليناسب بيئة الاختبار)
    await page.goto('/auth/login');
    await page.getByLabel('البريد الإلكتروني').fill('test@example.com');
    await page.getByLabel('كلمة المرور').fill('password123');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    // التأكد من نجاح تسجيل الدخول
    await expect(page).toHaveURL('/dashboard');
  });
  
  test('يجب أن تعمل صفحة إنشاء مشروع جديد بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة إنشاء مشروع جديد
    await page.goto('/project/new');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByRole('heading', { name: 'إنشاء مشروع جديد' })).toBeVisible();
    await expect(page.getByLabel('اسم المشروع *')).toBeVisible();
    await expect(page.getByLabel('وصف المشروع (اختياري)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إنشاء المشروع' })).toBeVisible();
    
    // اختبار التحقق من صحة المدخلات
    await page.getByRole('button', { name: 'إنشاء المشروع' }).click();
    await expect(page.getByText('اسم المشروع يجب أن يكون 3 أحرف على الأقل')).toBeVisible();
    
    // إدخال بيانات صحيحة
    await page.getByLabel('اسم المشروع *').fill('مشروع اختبار');
    await page.getByLabel('وصف المشروع (اختياري)').fill('هذا وصف لمشروع اختبار');
    // لا نقوم بالنقر على زر الإنشاء لتجنب إنشاء مشروع فعلي في قاعدة البيانات
  });
  
  test('يجب أن تعمل صفحة لوحة التحكم بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة لوحة التحكم
    await page.goto('/dashboard');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
    await expect(page.getByText('هنا يمكنك إدارة مشاريعك ومتابعة تقدمك')).toBeVisible();
    await expect(page.getByRole('link', { name: 'إنشاء مشروع جديد' })).toBeVisible();
  });
});

// اختبار وظائف المنشورات والتعليقات
test.describe('اختبار وظائف المنشورات والتعليقات', () => {
  // قبل كل اختبار، قم بتسجيل الدخول والانتقال إلى صفحة مشروع
  test.beforeEach(async ({ page }) => {
    // تسجيل الدخول (يجب تعديل هذا ليناسب بيئة الاختبار)
    await page.goto('/auth/login');
    await page.getByLabel('البريد الإلكتروني').fill('test@example.com');
    await page.getByLabel('كلمة المرور').fill('password123');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    // الانتقال إلى صفحة مشروع (يجب تعديل المعرف ليناسب بيئة الاختبار)
    await page.goto('/project/123');
  });
  
  test('يجب أن تعمل وظيفة إنشاء منشور جديد بشكل صحيح', async ({ page }) => {
    // التحقق من وجود نموذج إنشاء منشور
    await expect(page.getByRole('heading', { name: 'نشر تحديث جديد' })).toBeVisible();
    await expect(page.getByLabel('المحتوى')).toBeVisible();
    await expect(page.getByLabel('مقتطف الكود (اختياري)')).toBeVisible();
    await expect(page.getByRole('button', { name: 'نشر التحديث' })).toBeVisible();
    
    // اختبار التحقق من صحة المدخلات
    await page.getByRole('button', { name: 'نشر التحديث' }).click();
    // زر النشر يجب أن يكون معطلاً إذا كان المحتوى فارغاً
    await expect(page.getByRole('button', { name: 'نشر التحديث' })).toBeDisabled();
    
    // إدخال محتوى
    await page.getByLabel('المحتوى').fill('هذا منشور اختبار');
    await expect(page.getByRole('button', { name: 'نشر التحديث' })).toBeEnabled();
    // لا نقوم بالنقر على زر النشر لتجنب إنشاء منشور فعلي في قاعدة البيانات
  });
  
  test('يجب أن تعمل وظيفة إضافة تعليق بشكل صحيح', async ({ page }) => {
    // افتراض وجود منشور على الصفحة
    await page.getByText('تعليقات').first().click();
    
    // التحقق من وجود نموذج إضافة تعليق
    await expect(page.getByPlaceholder('أضف تعليقاً...')).toBeVisible();
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeVisible();
    
    // اختبار التحقق من صحة المدخلات
    await page.getByRole('button', { name: 'إرسال' }).click();
    // زر الإرسال يجب أن يكون معطلاً إذا كان التعليق فارغاً
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeDisabled();
    
    // إدخال تعليق
    await page.getByPlaceholder('أضف تعليقاً...').fill('هذا تعليق اختبار');
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeEnabled();
    // لا نقوم بالنقر على زر الإرسال لتجنب إنشاء تعليق فعلي في قاعدة البيانات
  });
});

// اختبار نظام الإشعارات
test.describe('اختبار نظام الإشعارات', () => {
  // قبل كل اختبار، قم بتسجيل الدخول
  test.beforeEach(async ({ page }) => {
    // تسجيل الدخول (يجب تعديل هذا ليناسب بيئة الاختبار)
    await page.goto('/auth/login');
    await page.getByLabel('البريد الإلكتروني').fill('test@example.com');
    await page.getByLabel('كلمة المرور').fill('password123');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  });
  
  test('يجب أن يظهر زر الإشعارات في الشريط العلوي', async ({ page }) => {
    // الانتقال إلى لوحة التحكم
    await page.goto('/dashboard');
    
    // التحقق من وجود زر الإشعارات
    await expect(page.locator('button[aria-label="الإشعارات"]')).toBeVisible();
  });
  
  test('يجب أن تظهر قائمة الإشعارات عند النقر على زر الإشعارات', async ({ page }) => {
    // الانتقال إلى لوحة التحكم
    await page.goto('/dashboard');
    
    // النقر على زر الإشعارات
    await page.locator('button[aria-label="الإشعارات"]').click();
    
    // التحقق من ظهور قائمة الإشعارات
    await expect(page.getByRole('heading', { name: 'الإشعارات' })).toBeVisible();
  });
});

// اختبار الملف الشخصي
test.describe('اختبار صفحة الملف الشخصي', () => {
  // قبل كل اختبار، قم بتسجيل الدخول
  test.beforeEach(async ({ page }) => {
    // تسجيل الدخول (يجب تعديل هذا ليناسب بيئة الاختبار)
    await page.goto('/auth/login');
    await page.getByLabel('البريد الإلكتروني').fill('test@example.com');
    await page.getByLabel('كلمة المرور').fill('password123');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
  });
  
  test('يجب أن تعمل صفحة الملف الشخصي بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة الملف الشخصي
    await page.goto('/profile');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByRole('heading', { name: 'الملف الشخصي' })).toBeVisible();
    await expect(page.getByRole('heading', { name: 'تعديل الملف الشخصي' })).toBeVisible();
    await expect(page.getByLabel('الاسم الكامل')).toBeVisible();
    await expect(page.getByLabel('البريد الإلكتروني')).toBeVisible();
    await expect(page.getByRole('button', { name: 'تغيير الصورة' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'حفظ التغييرات' })).toBeVisible();
    
    // اختبار التحقق من صحة المدخلات
    await page.getByLabel('الاسم الكامل').fill('');
    await page.getByRole('button', { name: 'حفظ التغييرات' }).click();
    await expect(page.getByText('الاسم الكامل يجب أن يكون 3 أحرف على الأقل')).toBeVisible();
    
    // إدخال اسم صحيح
    await page.getByLabel('الاسم الكامل').fill('مستخدم اختبار');
    // لا نقوم بالنقر على زر الحفظ لتجنب تحديث بيانات فعلية في قاعدة البيانات
  });
  
  test('يجب أن تعمل وظيفة تسجيل الخروج بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة الملف الشخصي
    await page.goto('/profile');
    
    // النقر على زر تسجيل الخروج
    await page.getByRole('button', { name: 'تسجيل الخروج' }).click();
    
    // التحقق من الانتقال إلى الصفحة الرئيسية
    await expect(page).toHaveURL('/');
  });
});

// اختبار التوافق مع الأجهزة المختلفة
test.describe('اختبار التوافق مع الأجهزة المختلفة', () => {
  test('يجب أن يعمل التطبيق بشكل صحيح على الهاتف المحمول', async ({ page }) => {
    // تعيين حجم الشاشة ليناسب الهاتف المحمول
    await page.setViewportSize({ width: 375, height: 667 });
    
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    
    // التحقق من ظهور زر القائمة للأجهزة المحمولة
    await expect(page.locator('button[aria-label="القائمة"]')).toBeVisible();
    
    // النقر على زر القائمة
    await page.locator('button[aria-label="القائمة"]').click();
    
    // التحقق من ظهور القائمة الجانبية
    await expect(page.getByRole('navigation')).toBeVisible();
  });
  
  test('يجب أن يعمل التطبيق بشكل صحيح على الجهاز اللوحي', async ({ page }) => {
    // تعيين حجم الشاشة ليناسب الجهاز اللوحي
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    
    // التحقق من عدم ظهور زر القائمة للأجهزة المحمولة
    await expect(page.locator('button[aria-label="القائمة"]')).not.toBeVisible();
    
    // التحقق من ظهور روابط التنقل في الشريط العلوي
    await expect(page.getByRole('navigation')).toBeVisible();
  });
});
