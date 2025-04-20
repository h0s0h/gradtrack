-- تحديث جدول المستخدمين لإضافة حقل معرف صورة كلاودينيري
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS cloudinary_avatar_id TEXT;
COMMENT ON COLUMN auth.users.cloudinary_avatar_id IS 'معرف صورة المستخدم في Cloudinary';

-- تأكد من تطبيق التغييرات على جدول users المخصص إذا كنت تستخدم جدولاً مخصصاً
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cloudinary_avatar_id TEXT;
COMMENT ON COLUMN public.users.cloudinary_avatar_id IS 'معرف صورة المستخدم في Cloudinary';

-- تحديث المشاريع أيضاً لدعم cloudinary_image_id
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cloudinary_image_id TEXT;
COMMENT ON COLUMN projects.cloudinary_image_id IS 'معرف صورة المشروع في Cloudinary'; 