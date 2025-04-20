# GradTrack - منصة إدارة المشاريع الأكاديمية

![GradTrack Logo](public/logo.png)

## نظرة عامة

GradTrack هي منصة متكاملة للطلاب والمشرفين لإدارة المشاريع الأكاديمية والتفاعل حولها بطريقة سلسة وفعالة. تم تصميم المنصة لتسهيل عملية متابعة تقدم المشاريع، والتواصل بين الطلاب والمشرفين، وتوثيق مراحل العمل المختلفة.

### المميزات الرئيسية

- **إدارة المشاريع**: إنشاء وإدارة المشاريع الأكاديمية بسهولة
- **نظام النشر والتعليقات**: مشاركة التحديثات والتقدم في المشروع وتلقي التعليقات
- **نظام الإشعارات**: تنبيهات فورية عند وجود تحديثات أو تعليقات جديدة
- **تتبع المشاهدات**: متابعة تفاعل المشرفين والأعضاء مع المنشورات
- **واجهة مستخدم سهلة الاستخدام**: تصميم نظيف وحديث يعمل على جميع الأجهزة

## التقنيات المستخدمة

- **Next.js 14+**: إطار عمل React مع App Router للتوجيه
- **TypeScript**: لضمان أمان النوع وتقليل الأخطاء
- **Tailwind CSS**: لتصميم واجهة مستخدم متجاوبة وحديثة
- **Supabase**: لقاعدة البيانات والمصادقة وتخزين الملفات
- **React Hook Form**: لإدارة النماذج والتحقق من البيانات
- **Zod**: للتحقق من صحة البيانات
- **Framer Motion**: لإضافة حركات انتقالية سلسة
- **Swiper.js**: لعرض الشرائح والمحتوى المتحرك

## متطلبات النظام

- Node.js 18.0.0 أو أحدث
- npm 9.0.0 أو أحدث
- حساب Supabase (مجاني للبدء)

## التثبيت

1. استنساخ المستودع:

```bash
git clone https://github.com/yourusername/gradtrack.git
cd gradtrack
```

2. تثبيت التبعيات:

```bash
npm install
```

3. إعداد متغيرات البيئة:

قم بإنشاء ملف `.env.local` في المجلد الرئيسي وأضف المتغيرات التالية:

```
NEXT_PUBLIC_SUPABASE_URL=your-supabase-url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your-supabase-anon-key
```

4. إعداد قاعدة البيانات:

قم بتشغيل الأوامر SQL الموجودة في ملف `src/lib/supabase/database.sql` في لوحة تحكم Supabase.

5. تشغيل التطبيق في بيئة التطوير:

```bash
npm run dev
```

6. الوصول إلى التطبيق:

افتح المتصفح وانتقل إلى `http://localhost:3000`

## البناء للإنتاج

لبناء التطبيق للإنتاج، قم بتنفيذ الأمر التالي:

```bash
npm run build
```

لتشغيل نسخة الإنتاج محلياً:

```bash
npm start
```

## النشر

يمكن نشر التطبيق على منصات مثل Vercel أو Netlify:

### النشر على Vercel

1. قم بإنشاء حساب على [Vercel](https://vercel.com)
2. قم بربط مستودع GitHub الخاص بك
3. قم بتكوين متغيرات البيئة
4. انقر على زر "Deploy"

### النشر على Netlify

1. قم بإنشاء حساب على [Netlify](https://netlify.com)
2. قم بربط مستودع GitHub الخاص بك
3. قم بتكوين متغيرات البيئة
4. قم بتعيين أمر البناء إلى `npm run build`
5. قم بتعيين مجلد النشر إلى `.next`

## هيكل المشروع

```
gradtrack/
├── src/
│   ├── app/                    # مسارات التطبيق
│   │   ├── auth/               # صفحات المصادقة
│   │   ├── dashboard/          # صفحة لوحة التحكم
│   │   ├── project/            # صفحات المشاريع
|   |   |   |──page.tsx         #صفحة عرض المشاريع
│   │   │   ├── [id]/          # صفحة تفاصيل المشروع
│   │   │   │   ├── page.tsx   # عرض تفاصيل المشروع
│   │   │   ├── new/           # صفحة إنشاء مشروع جديد
│   │   │   │   └── page.tsx   # نموذج إنشاء مشروع
│   │   ├── profile/            # صفحة الملف الشخصي
|   |   |──tasks/                #صفحة المهام
│   │   │   ├── page.tsx       # صفحة عرض المهام
│   │   │   ├── [id]/          # صفحة تفاصيل المهمة
│   │   │   │   └── page.tsx   # عرض تفاصيل المهمة
│   │   │   └── new/           # صفحة إنشاء مهمة جديدة
│   │   │       └── page.tsx   # نموذج إنشاء مهمة
│   │   ├── layout.tsx          # التخطيط العام للتطبيق
│   │   └── page.tsx            # الصفحة الرئيسية
│   ├── components/             # مكونات قابلة لإعادة الاستخدام
|   |   |
|   |   |── ui/
|   |   |   |── NotificationSystem.txt
│   │   ├── auth/               # مكونات المصادقة
│   │   ├── forms/              # مكونات النماذج
│   │   ├── layout/             # مكونات التخطيط
│   │   └── ui/                 # مكونات واجهة المستخدم
│   └── lib/                    # مكتبات ووظائف مساعدة
│       ├── email/              # خدمات البريد الإلكتروني
│       ├── notifications/      # خدمات الإشعارات
│       └── supabase/           # تكوين وخدمات Supabase
├── tests/                      # اختبارات التطبيق
├── docs/                       # وثائق المشروع
└── public/                     # الملفات العامة
```

## الوثائق

- [دليل المستخدم](docs/user_guide.md): دليل شامل لاستخدام المنصة
- [توثيق واجهة برمجة التطبيقات](docs/api_documentation.md): توثيق الجداول والوظائف المتاحة
- [مراجعة الكود](docs/code_review.md): مراجعة الكود والتحسينات النهائية

## الاختبارات

لتشغيل الاختبارات:

```bash
npm test
```

## المساهمة

نرحب بالمساهمات! يرجى اتباع الخطوات التالية:

1. قم بعمل fork للمستودع
2. قم بإنشاء فرع جديد (`git checkout -b feature/amazing-feature`)
3. قم بإجراء التغييرات
4. قم بعمل commit للتغييرات (`git commit -m 'Add amazing feature'`)
5. قم بدفع التغييرات إلى الفرع (`git push origin feature/amazing-feature`)
6. قم بفتح طلب سحب (Pull Request)

## الترخيص

هذا المشروع مرخص تحت رخصة MIT - انظر ملف [LICENSE](LICENSE) للتفاصيل.

## الاتصال

إذا كان لديك أي أسئلة أو استفسارات، يرجى التواصل معنا عبر:

- البريد الإلكتروني: support@gradtrack.com
- Twitter: [@GradTrackApp](https://twitter.com/GradTrackApp)
- GitHub: [github.com/yourusername/gradtrack](https://github.com/yourusername/gradtrack)

## شكر وتقدير

- شكر خاص لفريق Supabase لتوفير منصة قوية وسهلة الاستخدام
- شكر لجميع المساهمين والمختبرين الذين ساعدوا في تحسين المشروع

## Database Migration

To fix the "Could not find the 'image_url' column of 'projects' in the schema cache" error:

1. We've updated the code to use `thumbnail_url` (which exists in the schema) instead of `image_url`
2. We need to add the `cloudinary_image_id` column to the `projects` table.

You can run this SQL in the Supabase SQL Editor:

```sql
-- Add cloudinary_image_id column to the projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cloudinary_image_id TEXT;

-- Add comment for the new column
COMMENT ON COLUMN projects.cloudinary_image_id IS 'معرف Cloudinary للصورة الخاصة بالمشروع';
```

Alternatively, you can also use the Supabase Dashboard:

1. Go to your Supabase project
2. Navigate to the SQL Editor
3. Create a new query with the above SQL
4. Run the query

After applying this migration, the application will work correctly.
