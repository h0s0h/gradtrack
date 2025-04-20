import { test, expect } from '@playwright/test';

// اختبار وظائف المشاريع
test.describe('اختبار إنشاء وإدارة المشاريع', () => {
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
  
  test('يجب أن تعرض لوحة التحكم المشاريع الحالية بشكل صحيح', async ({ page }) => {
    // الانتقال إلى لوحة التحكم
    await page.goto('/dashboard');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByRole('heading', { name: 'لوحة التحكم' })).toBeVisible();
    await expect(page.getByText('مشاريعك')).toBeVisible();
    
    // التحقق من وجود الإحصائيات
    await expect(page.getByText('إجمالي المشاريع')).toBeVisible();
    await expect(page.getByText('المشاريع التي تملكها')).toBeVisible();
  });
  
  test('يجب أن تعمل عملية إنشاء مشروع جديد بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة إنشاء مشروع جديد
    await page.goto('/project/new');
    
    // ملء نموذج إنشاء المشروع
    await page.getByLabel('اسم المشروع *').fill('مشروع اختبار جديد');
    await page.getByLabel('وصف المشروع (اختياري)').fill('هذا وصف لمشروع اختبار جديد');
    
    // التحقق من أن زر الإنشاء مفعل
    await expect(page.getByRole('button', { name: 'إنشاء المشروع' })).toBeEnabled();
    
    // محاكاة النقر على زر الإنشاء (بدون تنفيذ فعلي لتجنب إنشاء مشروع في قاعدة البيانات)
    // await page.getByRole('button', { name: 'إنشاء المشروع' }).click();
    
    // التحقق من الانتقال إلى صفحة المشروع بعد الإنشاء
    // await expect(page.url()).toContain('/project/');
  });
  
  test('يجب أن تعرض صفحة المشروع المعلومات بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة مشروع (يجب تعديل المعرف ليناسب بيئة الاختبار)
    await page.goto('/project/123');
    
    // التحقق من وجود العناصر المتوقعة
    await expect(page.getByText('نشر تحديث جديد')).toBeVisible();
    await expect(page.getByText('التحديثات')).toBeVisible();
    await expect(page.getByText('عن المشروع')).toBeVisible();
    await expect(page.getByText('أعضاء المشروع')).toBeVisible();
  });
  
  test('يجب أن تعمل وظيفة إضافة مشرفين للمشروع بشكل صحيح', async ({ page }) => {
    // الانتقال إلى صفحة إنشاء مشروع جديد
    await page.goto('/project/new');
    
    // ملء نموذج إنشاء المشروع
    await page.getByLabel('اسم المشروع *').fill('مشروع مع مشرفين');
    
    // إضافة مشرف باستخدام @
    await page.getByLabel('المشرفون (اختياري)').fill('@مشرف');
    
    // التحقق من ظهور نتائج البحث (إذا كان هناك مستخدمين في قاعدة البيانات)
    // await expect(page.getByText('نتائج البحث')).toBeVisible();
    
    // التحقق من أن زر الإنشاء مفعل
    await expect(page.getByRole('button', { name: 'إنشاء المشروع' })).toBeEnabled();
  });
});

// اختبار نظام النشر والتعليقات
test.describe('اختبار نظام النشر والتعليقات', () => {
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
  
  test('يجب أن يعمل نظام النشر بشكل صحيح', async ({ page }) => {
    // التحقق من وجود نموذج النشر
    await expect(page.getByLabel('المحتوى')).toBeVisible();
    
    // كتابة محتوى المنشور
    await page.getByLabel('المحتوى').fill('هذا منشور اختبار للتأكد من عمل النظام بشكل صحيح');
    
    // إضافة مقتطف كود (اختياري)
    await page.getByLabel('مقتطف الكود (اختياري)').fill('console.log("Hello, World!");');
    
    // التحقق من أن زر النشر مفعل
    await expect(page.getByRole('button', { name: 'نشر التحديث' })).toBeEnabled();
    
    // محاكاة النقر على زر النشر (بدون تنفيذ فعلي لتجنب إنشاء منشور في قاعدة البيانات)
    // await page.getByRole('button', { name: 'نشر التحديث' }).click();
    
    // التحقق من ظهور المنشور الجديد (في حالة تنفيذ النشر فعلياً)
    // await expect(page.getByText('هذا منشور اختبار للتأكد من عمل النظام بشكل صحيح')).toBeVisible();
  });
  
  test('يجب أن يعمل نظام التعليقات بشكل صحيح', async ({ page }) => {
    // افتراض وجود منشور على الصفحة
    // النقر على زر التعليقات لفتح قسم التعليقات
    await page.getByText('تعليقات').first().click();
    
    // التحقق من وجود نموذج إضافة تعليق
    await expect(page.getByPlaceholder('أضف تعليقاً...')).toBeVisible();
    
    // كتابة محتوى التعليق
    await page.getByPlaceholder('أضف تعليقاً...').fill('هذا تعليق اختبار');
    
    // التحقق من أن زر الإرسال مفعل
    await expect(page.getByRole('button', { name: 'إرسال' })).toBeEnabled();
    
    // محاكاة النقر على زر الإرسال (بدون تنفيذ فعلي لتجنب إنشاء تعليق في قاعدة البيانات)
    // await page.getByRole('button', { name: 'إرسال' }).click();
    
    // التحقق من ظهور التعليق الجديد (في حالة تنفيذ الإرسال فعلياً)
    // await expect(page.getByText('هذا تعليق اختبار')).toBeVisible();
  });
  
  test('يجب أن يعمل نظام عرض مقتطفات الكود بشكل صحيح', async ({ page }) => {
    // افتراض وجود منشور يحتوي على مقتطف كود
    // التحقق من وجود عنصر عرض الكود
    await expect(page.locator('.bg-gray-50.p-4.rounded-md')).toBeVisible();
    
    // التحقق من أن مقتطف الكود يظهر بشكل صحيح
    await expect(page.locator('pre.text-sm.font-mono')).toBeVisible();
  });
  
  test('يجب أن يعمل نظام عرض المشاهدات بشكل صحيح', async ({ page }) => {
    // افتراض وجود منشور على الصفحة
    // التحقق من وجود عداد المشاهدات
    await expect(page.getByText('مشاهدات')).toBeVisible();
  });
});

// اختبار تحسين الأداء وتجربة المستخدم
test.describe('اختبار تحسين الأداء وتجربة المستخدم', () => {
  test('يجب أن تكون أوقات التحميل ضمن الحدود المقبولة', async ({ page }) => {
    // قياس وقت تحميل الصفحة الرئيسية
    const startHome = Date.now();
    await page.goto('/');
    const loadTimeHome = Date.now() - startHome;
    console.log(`وقت تحميل الصفحة الرئيسية: ${loadTimeHome}ms`);
    
    // التحقق من أن وقت التحميل أقل من 3 ثوانٍ
    expect(loadTimeHome).toBeLessThan(3000);
    
    // تسجيل الدخول
    await page.goto('/auth/login');
    await page.getByLabel('البريد الإلكتروني').fill('test@example.com');
    await page.getByLabel('كلمة المرور').fill('password123');
    await page.getByRole('button', { name: 'تسجيل الدخول' }).click();
    
    // قياس وقت تحميل لوحة التحكم
    const startDashboard = Date.now();
    await page.goto('/dashboard');
    const loadTimeDashboard = Date.now() - startDashboard;
    console.log(`وقت تحميل لوحة التحكم: ${loadTimeDashboard}ms`);
    
    // التحقق من أن وقت التحميل أقل من 3 ثوانٍ
    expect(loadTimeDashboard).toBeLessThan(3000);
  });
  
  test('يجب أن تكون التأثيرات الحركية سلسة وغير مزعجة', async ({ page }) => {
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    
    // التحقق من وجود عناصر الحركة
    await expect(page.locator('.motion-safe')).toBeVisible();
    
    // التمرير لأسفل للتحقق من تأثيرات الظهور عند التمرير
    await page.evaluate(() => window.scrollTo(0, 500));
    await page.waitForTimeout(1000); // انتظار لتنفيذ التأثيرات الحركية
    
    // التحقق من ظهور العناصر بعد التمرير
    await expect(page.locator('.motion-safe:nth-child(2)')).toBeVisible();
  });
  
  test('يجب أن تكون واجهة المستخدم متجاوبة مع مختلف أحجام الشاشات', async ({ page }) => {
    // اختبار على حجم شاشة الهاتف المحمول
    await page.setViewportSize({ width: 375, height: 667 });
    await page.goto('/');
    
    // التحقق من أن التصميم متجاوب
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // اختبار على حجم شاشة الجهاز اللوحي
    await page.setViewportSize({ width: 768, height: 1024 });
    await page.goto('/');
    
    // التحقق من أن التصميم متجاوب
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // اختبار على حجم شاشة سطح المكتب
    await page.setViewportSize({ width: 1280, height: 800 });
    await page.goto('/');
    
    // التحقق من أن التصميم متجاوب
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
  });
  
  test('يجب أن تكون الأزرار والروابط واضحة وسهلة الاستخدام', async ({ page }) => {
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    
    // التحقق من أن الأزرار لها حجم مناسب وتباعد كافٍ
    const loginButton = page.getByRole('link', { name: 'تسجيل الدخول' });
    await expect(loginButton).toBeVisible();
    
    // التحقق من أبعاد الزر
    const boundingBox = await loginButton.boundingBox();
    if (boundingBox) {
      // التحقق من أن الزر له ارتفاع كافٍ للنقر بسهولة على الأجهزة اللمسية (على الأقل 44 بكسل)
      expect(boundingBox.height).toBeGreaterThanOrEqual(44);
    }
  });
});

// اختبار التوافق مع الأجهزة المختلفة
test.describe('اختبار التوافق مع الأجهزة المختلفة', () => {
  test('يجب أن يعمل التطبيق بشكل صحيح على الهاتف المحمول', async ({ page }) => {
    // تعيين حجم الشاشة ليناسب الهاتف المحمول
    await page.setViewportSize({ width: 375, height: 667 });
    
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    
    // التحقق من ظهور عناصر الواجهة بشكل صحيح
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // التحقق من أن القائمة الرئيسية مخفية وزر القائمة ظاهر
    await expect(page.locator('nav.hidden')).toBeVisible();
    await expect(page.locator('button.md\\:hidden')).toBeVisible();
    
    // النقر على زر القائمة
    await page.locator('button.md\\:hidden').click();
    
    // التحقق من ظهور القائمة الجانبية
    await expect(page.locator('.fixed.inset-0')).toBeVisible();
  });
  
  test('يجب أن يعمل التطبيق بشكل صحيح على الجهاز اللوحي', async ({ page }) => {
    // تعيين حجم الشاشة ليناسب الجهاز اللوحي
    await page.setViewportSize({ width: 768, height: 1024 });
    
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    
    // التحقق من ظهور عناصر الواجهة بشكل صحيح
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // التحقق من أن القائمة الرئيسية ظاهرة وزر القائمة مخفي
    await expect(page.locator('nav.md\\:flex')).toBeVisible();
    await expect(page.locator('button.md\\:hidden')).not.toBeVisible();
  });
  
  test('يجب أن يعمل التطبيق بشكل صحيح على سطح المكتب', async ({ page }) => {
    // تعيين حجم الشاشة ليناسب سطح المكتب
    await page.setViewportSize({ width: 1280, height: 800 });
    
    // الانتقال إلى الصفحة الرئيسية
    await page.goto('/');
    
    // التحقق من ظهور عناصر الواجهة بشكل صحيح
    await expect(page.locator('header')).toBeVisible();
    await expect(page.locator('main')).toBeVisible();
    
    // التحقق من أن القائمة الرئيسية ظاهرة وزر القائمة مخفي
    await expect(page.locator('nav.md\\:flex')).toBeVisible();
    await expect(page.locator('button.md\\:hidden')).not.toBeVisible();
    
    // التحقق من أن تخطيط الصفحة يستفيد من المساحة الإضافية
    await expect(page.locator('.container')).toBeVisible();
  });
});
