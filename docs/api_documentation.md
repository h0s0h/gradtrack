# توثيق واجهة برمجة التطبيقات (API) لمشروع GradTrack

## مقدمة

هذا المستند يوثق واجهات برمجة التطبيقات (APIs) المستخدمة في مشروع GradTrack. يتضمن التوثيق تفاصيل حول الجداول في قاعدة البيانات، والوظائف المتاحة، وكيفية استخدامها.

## قاعدة البيانات

### جداول قاعدة البيانات

#### جدول `users`
يخزن معلومات المستخدمين.

| العمود | النوع | الوصف |
|--------|------|---------|
| id | uuid | المعرف الفريد للمستخدم (المفتاح الأساسي) |
| email | varchar | البريد الإلكتروني للمستخدم (فريد) |
| full_name | varchar | الاسم الكامل للمستخدم |
| avatar_url | varchar | رابط صورة المستخدم |
| created_at | timestamp | تاريخ إنشاء الحساب |
| updated_at | timestamp | تاريخ آخر تحديث للحساب |

#### جدول `projects`
يخزن معلومات المشاريع.

| العمود | النوع | الوصف |
|--------|------|---------|
| id | uuid | المعرف الفريد للمشروع (المفتاح الأساسي) |
| name | varchar | اسم المشروع |
| description | text | وصف المشروع |
| owner_id | uuid | معرف مالك المشروع (مفتاح خارجي لجدول users) |
| created_at | timestamp | تاريخ إنشاء المشروع |
| updated_at | timestamp | تاريخ آخر تحديث للمشروع |

#### جدول `project_members`
يخزن العلاقة بين المستخدمين والمشاريع.

| العمود | النوع | الوصف |
|--------|------|---------|
| id | uuid | المعرف الفريد للعضوية (المفتاح الأساسي) |
| project_id | uuid | معرف المشروع (مفتاح خارجي لجدول projects) |
| user_id | uuid | معرف المستخدم (مفتاح خارجي لجدول users) |
| role | varchar | دور المستخدم في المشروع (owner, supervisor, member) |
| created_at | timestamp | تاريخ إضافة العضو |

#### جدول `posts`
يخزن منشورات المشاريع.

| العمود | النوع | الوصف |
|--------|------|---------|
| id | uuid | المعرف الفريد للمنشور (المفتاح الأساسي) |
| project_id | uuid | معرف المشروع (مفتاح خارجي لجدول projects) |
| user_id | uuid | معرف المستخدم (مفتاح خارجي لجدول users) |
| content | text | محتوى المنشور |
| code_snippet | text | مقتطف الكود (اختياري) |
| created_at | timestamp | تاريخ إنشاء المنشور |
| updated_at | timestamp | تاريخ آخر تحديث للمنشور |

#### جدول `comments`
يخزن التعليقات على المنشورات.

| العمود | النوع | الوصف |
|--------|------|---------|
| id | uuid | المعرف الفريد للتعليق (المفتاح الأساسي) |
| post_id | uuid | معرف المنشور (مفتاح خارجي لجدول posts) |
| user_id | uuid | معرف المستخدم (مفتاح خارجي لجدول users) |
| content | text | محتوى التعليق |
| created_at | timestamp | تاريخ إنشاء التعليق |
| updated_at | timestamp | تاريخ آخر تحديث للتعليق |

#### جدول `post_views`
يخزن مشاهدات المنشورات.

| العمود | النوع | الوصف |
|--------|------|---------|
| id | uuid | المعرف الفريد للمشاهدة (المفتاح الأساسي) |
| post_id | uuid | معرف المنشور (مفتاح خارجي لجدول posts) |
| user_id | uuid | معرف المستخدم (مفتاح خارجي لجدول users) |
| created_at | timestamp | تاريخ المشاهدة |

#### جدول `notifications`
يخزن إشعارات المستخدمين.

| العمود | النوع | الوصف |
|--------|------|---------|
| id | uuid | المعرف الفريد للإشعار (المفتاح الأساسي) |
| user_id | uuid | معرف المستخدم المستلم (مفتاح خارجي لجدول users) |
| title | varchar | عنوان الإشعار |
| content | text | محتوى الإشعار |
| type | varchar | نوع الإشعار (post_created, comment_added, project_invitation, inactivity_alert) |
| related_id | uuid | معرف العنصر المرتبط (مشروع، منشور، إلخ) |
| is_read | boolean | حالة قراءة الإشعار |
| created_at | timestamp | تاريخ إنشاء الإشعار |

## واجهات برمجة التطبيقات (APIs)

### خدمات المصادقة

#### `signUp(email, password, fullName)`
تسجيل مستخدم جديد.

**المعاملات:**
- `email`: البريد الإلكتروني للمستخدم
- `password`: كلمة المرور
- `fullName`: الاسم الكامل للمستخدم

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `user`: بيانات المستخدم (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `signIn(email, password)`
تسجيل دخول مستخدم.

**المعاملات:**
- `email`: البريد الإلكتروني للمستخدم
- `password`: كلمة المرور

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `user`: بيانات المستخدم (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `signOut()`
تسجيل خروج المستخدم الحالي.

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `resetPassword(email)`
إرسال رابط إعادة تعيين كلمة المرور.

**المعاملات:**
- `email`: البريد الإلكتروني للمستخدم

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `updateUserProfile(userId, data)`
تحديث بيانات الملف الشخصي للمستخدم.

**المعاملات:**
- `userId`: معرف المستخدم
- `data`: البيانات المراد تحديثها (full_name, avatar_url)

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

### خدمات المشاريع

#### `createProject(name, description, ownerId)`
إنشاء مشروع جديد.

**المعاملات:**
- `name`: اسم المشروع
- `description`: وصف المشروع (اختياري)
- `ownerId`: معرف مالك المشروع

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `project`: بيانات المشروع (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `getProjects(userId)`
الحصول على قائمة المشاريع للمستخدم.

**المعاملات:**
- `userId`: معرف المستخدم

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `projects`: قائمة المشاريع (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `getProjectById(projectId)`
الحصول على بيانات مشروع محدد.

**المعاملات:**
- `projectId`: معرف المشروع

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `project`: بيانات المشروع (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `addProjectMember(projectId, userId, role)`
إضافة عضو إلى مشروع.

**المعاملات:**
- `projectId`: معرف المشروع
- `userId`: معرف المستخدم
- `role`: دور المستخدم في المشروع (supervisor, member)

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `member`: بيانات العضوية (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `getProjectMembers(projectId)`
الحصول على قائمة أعضاء المشروع.

**المعاملات:**
- `projectId`: معرف المشروع

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `members`: قائمة الأعضاء (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

### خدمات المنشورات والتعليقات

#### `createPost(projectId, userId, content, codeSnippet)`
إنشاء منشور جديد.

**المعاملات:**
- `projectId`: معرف المشروع
- `userId`: معرف المستخدم
- `content`: محتوى المنشور
- `codeSnippet`: مقتطف الكود (اختياري)

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `post`: بيانات المنشور (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `getProjectPosts(projectId)`
الحصول على قائمة منشورات المشروع.

**المعاملات:**
- `projectId`: معرف المشروع

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `posts`: قائمة المنشورات (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `createComment(postId, userId, content)`
إضافة تعليق على منشور.

**المعاملات:**
- `postId`: معرف المنشور
- `userId`: معرف المستخدم
- `content`: محتوى التعليق

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `comment`: بيانات التعليق (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `getPostComments(postId)`
الحصول على قائمة تعليقات المنشور.

**المعاملات:**
- `postId`: معرف المنشور

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `comments`: قائمة التعليقات (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `recordPostView(postId, userId)`
تسجيل مشاهدة منشور.

**المعاملات:**
- `postId`: معرف المنشور
- `userId`: معرف المستخدم

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `getPostViewsCount(postId)`
الحصول على عدد مشاهدات المنشور.

**المعاملات:**
- `postId`: معرف المنشور

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `count`: عدد المشاهدات (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

### خدمات الإشعارات

#### `createNotification(userId, title, content, type, relatedId)`
إنشاء إشعار جديد.

**المعاملات:**
- `userId`: معرف المستخدم المستلم
- `title`: عنوان الإشعار
- `content`: محتوى الإشعار
- `type`: نوع الإشعار (post_created, comment_added, project_invitation, inactivity_alert)
- `relatedId`: معرف العنصر المرتبط (اختياري)

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `notification`: بيانات الإشعار (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `getUserNotifications(userId)`
الحصول على قائمة إشعارات المستخدم.

**المعاملات:**
- `userId`: معرف المستخدم

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `notifications`: قائمة الإشعارات (في حالة النجاح)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `markNotificationAsRead(notificationId)`
تعيين إشعار كمقروء.

**المعاملات:**
- `notificationId`: معرف الإشعار

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `markAllNotificationsAsRead(userId)`
تعيين جميع إشعارات المستخدم كمقروءة.

**المعاملات:**
- `userId`: معرف المستخدم

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

### خدمات البريد الإلكتروني

#### `sendEmail(to, subject, html)`
إرسال بريد إلكتروني.

**المعاملات:**
- `to`: البريد الإلكتروني للمستلم
- `subject`: عنوان البريد
- `html`: محتوى البريد بتنسيق HTML

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

#### `sendNotificationEmail(to, notification, appUrl)`
إرسال إشعار بريدي.

**المعاملات:**
- `to`: البريد الإلكتروني للمستلم
- `notification`: بيانات الإشعار
- `appUrl`: رابط التطبيق

**الإرجاع:**
- `success`: حالة العملية (true/false)
- `error`: رسالة الخطأ (في حالة الفشل)

## سياسات الأمان (RLS)

تم تكوين سياسات الأمان (Row Level Security) في Supabase لضمان أن المستخدمين يمكنهم فقط الوصول إلى البيانات التي لديهم صلاحية الوصول إليها:

### جدول `projects`
- يمكن للمستخدمين قراءة المشاريع التي هم أعضاء فيها فقط
- يمكن للمستخدمين إنشاء مشاريع جديدة
- يمكن لمالك المشروع فقط تعديل أو حذف المشروع

### جدول `project_members`
- يمكن للمستخدمين قراءة أعضاء المشاريع التي هم أعضاء فيها فقط
- يمكن لمالك المشروع فقط إضافة أو إزالة أعضاء

### جدول `posts`
- يمكن للمستخدمين قراءة المنشورات في المشاريع التي هم أعضاء فيها فقط
- يمكن للمستخدمين إنشاء منشورات في المشاريع التي هم أعضاء فيها فقط
- يمكن لمؤلف المنشور فقط تعديل أو حذف المنشور

### جدول `comments`
- يمكن للمستخدمين قراءة التعليقات على المنشورات في المشاريع التي هم أعضاء فيها فقط
- يمكن للمستخدمين إضافة تعليقات على المنشورات في المشاريع التي هم أعضاء فيها فقط
- يمكن لمؤلف التعليق فقط تعديل أو حذف التعليق

### جدول `notifications`
- يمكن للمستخدمين قراءة الإشعارات الخاصة بهم فقط
- يمكن للمستخدمين تعديل حالة قراءة الإشعارات الخاصة بهم فقط

## استخدام واجهات برمجة التطبيقات

### مثال: إنشاء مشروع جديد

```typescript
import { supabase } from '@/lib/supabase/client';

async function createNewProject(name: string, description: string) {
  try {
    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('يجب تسجيل الدخول لإنشاء مشروع');
    
    // إنشاء المشروع
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .insert({
        name,
        description,
        owner_id: user.id,
      })
      .select()
      .single();
    
    if (projectError) throw projectError;
    
    // إضافة المالك كعضو في المشروع
    const { error: memberError } = await supabase
      .from('project_members')
      .insert({
        project_id: project.id,
        user_id: user.id,
        role: 'owner',
      });
    
    if (memberError) throw memberError;
    
    return { success: true, project };
  } catch (error) {
    console.error('Error creating project:', error);
    return { success: false, error: 'حدث خطأ أثناء إنشاء المشروع' };
  }
}
```

### مثال: إنشاء منشور جديد

```typescript
import { supabase } from '@/lib/supabase/client';
import { notifyNewPost } from '@/lib/notifications/notificationService';

async function createNewPost(projectId: string, content: string, codeSnippet?: string) {
  try {
    // الحصول على المستخدم الحالي
    const { data: { user } } = await supabase.auth.getUser();
    
    if (!user) throw new Error('يجب تسجيل الدخول لإنشاء منشور');
    
    // التحقق من أن المستخدم عضو في المشروع
    const { data: member, error: memberError } = await supabase
      .from('project_members')
      .select('role')
      .eq('project_id', projectId)
      .eq('user_id', user.id)
      .single();
    
    if (memberError || !member) throw new Error('ليس لديك صلاحية إنشاء منشور في هذا المشروع');
    
    // إنشاء المنشور
    const { data: post, error: postError } = await supabase
      .from('posts')
      .insert({
        project_id: projectId,
        user_id: user.id,
        content,
        code_snippet: codeSnippet || null,
      })
      .select()
      .single();
    
    if (postError) throw postError;
    
    // الحصول على معلومات المشروع
    const { data: project, error: projectError } = await supabase
      .from('projects')
      .select('name')
      .eq('id', projectId)
      .single();
    
    if (projectError) throw projectError;
    
    // الحصول على معلومات المستخدم
    const { data: userData, error: userError } = await supabase
      .from('users')
      .select('full_name')
      .eq('id', user.id)
      .single();
    
    if (userError) throw userError;
    
    // إرسال إشعارات للأعضاء الآخرين
    await notifyNewPost(
      post.id,
      projectId,
      user.id,
      userData.full_name || user.email,
      project.name
    );
    
    return { success: true, post };
  } catch (error) {
    console.error('Error creating post:', error);
    return { success: false, error: 'حدث خطأ أثناء إنشاء المنشور' };
  }
}
```

## ملاحظات هامة

- يجب استخدام واجهات برمجة التطبيقات المذكورة أعلاه من خلال مكتبة Supabase.js
- يجب التحقق دائماً من صلاحيات المستخدم قبل تنفيذ أي عملية
- يجب التعامل مع الأخطاء بشكل مناسب وعرض رسائل خطأ واضحة للمستخدم
- يجب استخدام سياسات الأمان (RLS) لحماية البيانات على مستوى قاعدة البيانات
