-- ======================================================
-- مخطط قاعدة بيانات GradTrack
-- ======================================================
-- هذا الملف يحتوي على جميع جداول قاعدة البيانات مع كود SQL
-- لإنشاء الجداول والعلاقات والقيود وسياسات الأمان
-- ======================================================

-- ======================================================
-- 1. إنشاء الامتدادات المطلوبة
-- ======================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- ======================================================
-- 2. إنشاء الجداول الأساسية
-- ======================================================

-- جدول المستخدمين (يتم إنشاؤه تلقائيًا بواسطة Supabase Auth)
-- نضيف فقط الحقول الإضافية التي نحتاجها
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS bio TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS university TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS department TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS last_active TIMESTAMP WITH TIME ZONE DEFAULT now();

COMMENT ON TABLE auth.users IS 'جدول المستخدمين الأساسي (يتم إنشاؤه تلقائيًا بواسطة Supabase Auth)';
COMMENT ON COLUMN auth.users.role IS 'دور المستخدم (student, supervisor, admin)';
COMMENT ON COLUMN auth.users.full_name IS 'الاسم الكامل للمستخدم';
COMMENT ON COLUMN auth.users.avatar_url IS 'رابط صورة المستخدم';
COMMENT ON COLUMN auth.users.bio IS 'نبذة تعريفية عن المستخدم';
COMMENT ON COLUMN auth.users.university IS 'الجامعة التي ينتمي إليها المستخدم';
COMMENT ON COLUMN auth.users.department IS 'القسم الذي ينتمي إليه المستخدم';
COMMENT ON COLUMN auth.users.last_active IS 'آخر نشاط للمستخدم';

-- جدول المشاريع
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT DEFAULT 'active' CHECK (status IN ('active', 'completed', 'archived')),
  start_date DATE DEFAULT CURRENT_DATE,
  end_date DATE,
  thumbnail_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE projects IS 'جدول المشاريع الأكاديمية';
COMMENT ON COLUMN projects.id IS 'المعرف الفريد للمشروع';
COMMENT ON COLUMN projects.name IS 'اسم المشروع';
COMMENT ON COLUMN projects.description IS 'وصف المشروع';
COMMENT ON COLUMN projects.owner_id IS 'معرف مالك المشروع';
COMMENT ON COLUMN projects.status IS 'حالة المشروع (active, completed, archived)';
COMMENT ON COLUMN projects.start_date IS 'تاريخ بدء المشروع';
COMMENT ON COLUMN projects.end_date IS 'تاريخ انتهاء المشروع';
COMMENT ON COLUMN projects.thumbnail_url IS 'رابط الصورة المصغرة للمشروع';
COMMENT ON COLUMN projects.created_at IS 'تاريخ إنشاء المشروع';
COMMENT ON COLUMN projects.updated_at IS 'تاريخ آخر تحديث للمشروع';

-- جدول أعضاء المشروع
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'supervisor', 'member')),
  joined_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (project_id, user_id)
);

COMMENT ON TABLE project_members IS 'جدول أعضاء المشروع';
COMMENT ON COLUMN project_members.id IS 'المعرف الفريد للعضوية';
COMMENT ON COLUMN project_members.project_id IS 'معرف المشروع';
COMMENT ON COLUMN project_members.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN project_members.role IS 'دور المستخدم في المشروع (owner, supervisor, member)';
COMMENT ON COLUMN project_members.joined_at IS 'تاريخ انضمام المستخدم للمشروع';
COMMENT ON COLUMN project_members.created_at IS 'تاريخ إنشاء العضوية';

-- جدول المنشورات
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT,
  content TEXT NOT NULL,
  code_snippet TEXT,
  image_url TEXT,
  attachment_url TEXT,
  attachment_type TEXT,
  is_pinned BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE posts IS 'جدول منشورات المشاريع';
COMMENT ON COLUMN posts.id IS 'المعرف الفريد للمنشور';
COMMENT ON COLUMN posts.project_id IS 'معرف المشروع';
COMMENT ON COLUMN posts.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN posts.title IS 'عنوان المنشور';
COMMENT ON COLUMN posts.content IS 'محتوى المنشور';
COMMENT ON COLUMN posts.code_snippet IS 'مقتطف الكود (اختياري)';
COMMENT ON COLUMN posts.image_url IS 'رابط الصورة (اختياري)';
COMMENT ON COLUMN posts.attachment_url IS 'رابط المرفق (اختياري)';
COMMENT ON COLUMN posts.attachment_type IS 'نوع المرفق (pdf, doc, etc.)';
COMMENT ON COLUMN posts.is_pinned IS 'هل المنشور مثبت؟';
COMMENT ON COLUMN posts.created_at IS 'تاريخ إنشاء المنشور';
COMMENT ON COLUMN posts.updated_at IS 'تاريخ آخر تحديث للمنشور';

-- جدول مشاهدات المنشورات
CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (post_id, user_id)
);

COMMENT ON TABLE post_views IS 'جدول مشاهدات المنشورات';
COMMENT ON COLUMN post_views.id IS 'المعرف الفريد للمشاهدة';
COMMENT ON COLUMN post_views.post_id IS 'معرف المنشور';
COMMENT ON COLUMN post_views.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN post_views.viewed_at IS 'تاريخ المشاهدة';

-- جدول التعليقات
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  code_snippet TEXT,
  image_url TEXT,
  parent_id UUID REFERENCES comments(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE comments IS 'جدول التعليقات على المنشورات';
COMMENT ON COLUMN comments.id IS 'المعرف الفريد للتعليق';
COMMENT ON COLUMN comments.post_id IS 'معرف المنشور';
COMMENT ON COLUMN comments.user_id IS 'معرف المستخدم';
COMMENT ON COLUMN comments.content IS 'محتوى التعليق';
COMMENT ON COLUMN comments.code_snippet IS 'مقتطف الكود (اختياري)';
COMMENT ON COLUMN comments.image_url IS 'رابط الصورة (اختياري)';
COMMENT ON COLUMN comments.parent_id IS 'معرف التعليق الأب (للردود على التعليقات)';
COMMENT ON COLUMN comments.created_at IS 'تاريخ إنشاء التعليق';
COMMENT ON COLUMN comments.updated_at IS 'تاريخ آخر تحديث للتعليق';

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post_created', 'comment_added', 'project_invitation', 'inactivity_alert', 'deadline_reminder')),
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE notifications IS 'جدول الإشعارات';
COMMENT ON COLUMN notifications.id IS 'المعرف الفريد للإشعار';
COMMENT ON COLUMN notifications.user_id IS 'معرف المستخدم المستلم';
COMMENT ON COLUMN notifications.title IS 'عنوان الإشعار';
COMMENT ON COLUMN notifications.content IS 'محتوى الإشعار';
COMMENT ON COLUMN notifications.type IS 'نوع الإشعار';
COMMENT ON COLUMN notifications.related_id IS 'معرف العنصر المرتبط (مشروع، منشور، إلخ)';
COMMENT ON COLUMN notifications.is_read IS 'هل تمت قراءة الإشعار؟';
COMMENT ON COLUMN notifications.created_at IS 'تاريخ إنشاء الإشعار';

-- جدول المهام
CREATE TABLE IF NOT EXISTS tasks (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'in_progress', 'completed', 'cancelled')),
  priority TEXT DEFAULT 'medium' CHECK (priority IN ('low', 'medium', 'high')),
  assigned_to UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  due_date DATE,
  created_by UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE tasks IS 'جدول المهام في المشاريع';
COMMENT ON COLUMN tasks.id IS 'المعرف الفريد للمهمة';
COMMENT ON COLUMN tasks.project_id IS 'معرف المشروع';
COMMENT ON COLUMN tasks.title IS 'عنوان المهمة';
COMMENT ON COLUMN tasks.description IS 'وصف المهمة';
COMMENT ON COLUMN tasks.status IS 'حالة المهمة';
COMMENT ON COLUMN tasks.priority IS 'أولوية المهمة';
COMMENT ON COLUMN tasks.assigned_to IS 'معرف المستخدم المكلف بالمهمة';
COMMENT ON COLUMN tasks.due_date IS 'تاريخ استحقاق المهمة';
COMMENT ON COLUMN tasks.created_by IS 'معرف المستخدم الذي أنشأ المهمة';
COMMENT ON COLUMN tasks.created_at IS 'تاريخ إنشاء المهمة';
COMMENT ON COLUMN tasks.updated_at IS 'تاريخ آخر تحديث للمهمة';

-- جدول الملفات
CREATE TABLE IF NOT EXISTS files (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  description TEXT,
  file_url TEXT NOT NULL,
  file_type TEXT NOT NULL,
  file_size INTEGER NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

COMMENT ON TABLE files IS 'جدول ملفات المشاريع';
COMMENT ON COLUMN files.id IS 'المعرف الفريد للملف';
COMMENT ON COLUMN files.project_id IS 'معرف المشروع';
COMMENT ON COLUMN files.user_id IS 'معرف المستخدم الذي رفع الملف';
COMMENT ON COLUMN files.name IS 'اسم الملف';
COMMENT ON COLUMN files.description IS 'وصف الملف';
COMMENT ON COLUMN files.file_url IS 'رابط الملف';
COMMENT ON COLUMN files.file_type IS 'نوع الملف';
COMMENT ON COLUMN files.file_size IS 'حجم الملف بالبايت';
COMMENT ON COLUMN files.created_at IS 'تاريخ رفع الملف';
COMMENT ON COLUMN files.updated_at IS 'تاريخ آخر تحديث للملف';

-- ======================================================
-- 3. إنشاء الفهارس لتحسين الأداء
-- ======================================================

-- فهارس جدول المشاريع
CREATE INDEX IF NOT EXISTS idx_projects_owner_id ON projects(owner_id);
CREATE INDEX IF NOT EXISTS idx_projects_status ON projects(status);
CREATE INDEX IF NOT EXISTS idx_projects_created_at ON projects(created_at);

-- فهارس جدول أعضاء المشروع
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_project_members_role ON project_members(role);

-- فهارس جدول المنشورات
CREATE INDEX IF NOT EXISTS idx_posts_project_id ON posts(project_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_created_at ON posts(created_at);
CREATE INDEX IF NOT EXISTS idx_posts_is_pinned ON posts(is_pinned);

-- فهارس جدول مشاهدات المنشورات
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);

-- فهارس جدول التعليقات
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_parent_id ON comments(parent_id);
CREATE INDEX IF NOT EXISTS idx_comments_created_at ON comments(created_at);

-- فهارس جدول الإشعارات
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_type ON notifications(type);
CREATE INDEX IF NOT EXISTS idx_notifications_is_read ON notifications(is_read);
CREATE INDEX IF NOT EXISTS idx_notifications_created_at ON notifications(created_at);

-- فهارس جدول المهام
CREATE INDEX IF NOT EXISTS idx_tasks_project_id ON tasks(project_id);
CREATE INDEX IF NOT EXISTS idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX IF NOT EXISTS idx_tasks_status ON tasks(status);
CREATE INDEX IF NOT EXISTS idx_tasks_priority ON tasks(priority);
CREATE INDEX IF NOT EXISTS idx_tasks_due_date ON tasks(due_date);

-- فهارس جدول الملفات
CREATE INDEX IF NOT EXISTS idx_files_project_id ON files(project_id);
CREATE INDEX IF NOT EXISTS idx_files_user_id ON files(user_id);
CREATE INDEX IF NOT EXISTS idx_files_file_type ON files(file_type);

-- ======================================================
-- 4. إنشاء الدوال المساعدة والمحفزات
-- ======================================================

-- دالة لتحديث حقل updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لتحديث حقل last_active للمستخدم
CREATE OR REPLACE FUNCTION update_user_last_active()
RETURNS TRIGGER AS $$
BEGIN
  UPDATE auth.users SET last_active = now() WHERE id = NEW.user_id;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء إشعار عند إضافة منشور جديد
CREATE OR REPLACE FUNCTION create_post_notification()
RETURNS TRIGGER AS $$
DECLARE
  project_name TEXT;
  user_name TEXT;
  member_record RECORD;
BEGIN
  -- الحصول على اسم المشروع
  SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;
  
  -- الحصول على اسم المستخدم
  SELECT full_name INTO user_name FROM auth.users WHERE id = NEW.user_id;
  
  -- إنشاء إشعارات لجميع أعضاء المشروع (باستثناء المؤلف)
  FOR member_record IN 
    SELECT user_id FROM project_members 
    WHERE project_id = NEW.project_id AND user_id != NEW.user_id
  LOOP
    INSERT INTO notifications (
      user_id, 
      title, 
      content, 
      type, 
      related_id
    ) VALUES (
      member_record.user_id,
      'منشور جديد في المشروع',
      'قام ' || user_name || ' بنشر تحديث جديد في مشروع "' || project_name || '"',
      'post_created',
      NEW.id
    );
  END LOOP;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- دالة لإنشاء إشعار عند إضافة تعليق جديد
CREATE OR REPLACE FUNCTION create_comment_notification()
RETURNS TRIGGER AS $$
DECLARE
  post_author_id UUID;
  post_title TEXT;
  user_name TEXT;
  project_id UUID;
  project_name TEXT;
BEGIN
  -- الحصول على معلومات المنشور
  SELECT user_id, title, project_id INTO post_author_id, post_title, project_id FROM posts WHERE id = NEW.post_id;
  
  -- الحصول على اسم المستخدم
  SELECT full_name INTO user_name FROM auth.users WHERE id = NEW.user_id;
  
  -- الحصول على اسم المشروع
  SELECT name INTO project_name FROM projects WHERE id = project_id;
  
  -- إذا كان مؤلف التعليق ليس هو مؤلف المنشور، أنشئ إشعاراً
  IF NEW.user_id != post_author_id THEN
    INSERT INTO notifications (
      user_id, 
      title, 
      content, 
      type, 
      related_id
    ) VALUES (
      post_author_id,
      'تعليق جديد على منشورك',
      'قام ' || user_name || ' بالتعليق على منشورك "' || COALESCE(post_title, 'بدون عنوان') || '" في مشروع "' || project_name || '"',
      'comment_added',
      NEW.post_id
    );
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء المحفزات (Triggers)

-- محفز لتحديث حقل updated_at في جدول المشاريع
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- محفز لتحديث حقل updated_at في جدول المنشورات
CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- محفز لتحديث حقل updated_at في جدول التعليقات
CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- محفز لتحديث حقل updated_at في جدول المهام
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- محفز لتحديث حقل updated_at في جدول الملفات
CREATE TRIGGER update_files_updated_at
BEFORE UPDATE ON files
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- محفز لتحديث حقل last_active للمستخدم عند إنشاء منشور
CREATE TRIGGER update_user_last_active_on_post
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION update_user_last_active();

-- محفز لتحديث حقل last_active للمستخدم عند إضافة تعليق
CREATE TRIGGER update_user_last_active_on_comment
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION update_user_last_active();

-- محفز لإنشاء إشعار عند إضافة منشور جديد
CREATE TRIGGER create_post_notification_trigger
AFTER INSERT ON posts
FOR EACH ROW
EXECUTE FUNCTION create_post_notification();

-- محفز لإنشاء إشعار عند إضافة تعليق جديد
CREATE TRIGGER create_comment_notification_trigger
AFTER INSERT ON comments
FOR EACH ROW
EXECUTE FUNCTION create_comment_notification();

-- ======================================================
-- 5. إنشاء سياسات الأمان (RLS)
-- ======================================================

-- تفعيل RLS على جميع الجداول
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;
ALTER TABLE files ENABLE ROW LEVEL SECURITY;

-- سياسات جدول المشاريع
CREATE POLICY "المستخدمون يمكنهم قراءة المشاريع التي هم أعضاء فيها"
  ON projects FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = id
    )
  );

CREATE POLICY "المستخدمون يمكنهم إنشاء مشاريع جديدة"
  ON projects FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

CREATE POLICY "المالكون يمكنهم تحديث مشاريعهم"
  ON projects FOR UPDATE
  USING (auth.uid() = owner_id);

CREATE POLICY "المالكون يمكنهم حذف مشاريعهم"
  ON projects FOR DELETE
  USING (auth.uid() = owner_id);

-- سياسات جدول أعضاء المشروع
CREATE POLICY "المستخدمون يمكنهم قراءة أعضاء المشاريع التي هم أعضاء فيها"
  ON project_members FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_id
    )
  );

CREATE POLICY "المالكون والمشرفون يمكنهم إضافة أعضاء للمشروع"
  ON project_members FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = NEW.project_id AND role IN ('owner', 'supervisor')
    )
  );

CREATE POLICY "المالكون والمشرفون يمكنهم حذف أعضاء من المشروع"
  ON project_members FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_id AND role IN ('owner', 'supervisor')
    )
  );

-- سياسات جدول المنشورات
CREATE POLICY "المستخدمون يمكنهم قراءة منشورات المشاريع التي هم أعضاء فيها"
  ON posts FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_id
    )
  );

CREATE POLICY "المستخدمون يمكنهم إنشاء منشورات في المشاريع التي هم أعضاء فيها"
  ON posts FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = NEW.project_id
    )
  );

CREATE POLICY "المستخدمون يمكنهم تحديث منشوراتهم"
  ON posts FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم حذف منشوراتهم"
  ON posts FOR DELETE
  USING (auth.uid() = user_id);

-- سياسات جدول مشاهدات المنشورات
CREATE POLICY "المستخدمون يمكنهم تسجيل مشاهداتهم للمنشورات"
  ON post_views FOR INSERT
  WITH CHECK (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم قراءة مشاهدات المنشورات في المشاريع التي هم أعضاء فيها"
  ON post_views FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.id = post_id AND pm.user_id = auth.uid()
    )
  );

-- سياسات جدول التعليقات
CREATE POLICY "المستخدمون يمكنهم قراءة التعليقات على المنشورات في المشاريع التي هم أعضاء فيها"
  ON comments FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.id = post_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "المستخدمون يمكنهم إضافة تعليقات على المنشورات في المشاريع التي هم أعضاء فيها"
  ON comments FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.id = NEW.post_id AND pm.user_id = auth.uid()
    )
  );

CREATE POLICY "المستخدمون يمكنهم تحديث تعليقاتهم"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم حذف تعليقاتهم"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- سياسات جدول الإشعارات
CREATE POLICY "المستخدمون يمكنهم قراءة إشعاراتهم فقط"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم تحديث حالة قراءة إشعاراتهم"
  ON notifications FOR UPDATE
  USING (auth.uid() = user_id)
  WITH CHECK (
    auth.uid() = user_id AND
    (OLD.is_read IS DISTINCT FROM NEW.is_read)
  );

-- سياسات جدول المهام
CREATE POLICY "المستخدمون يمكنهم قراءة المهام في المشاريع التي هم أعضاء فيها"
  ON tasks FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_id
    )
  );

CREATE POLICY "المستخدمون يمكنهم إنشاء مهام في المشاريع التي هم أعضاء فيها"
  ON tasks FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = NEW.project_id
    )
  );

CREATE POLICY "المستخدمون يمكنهم تحديث المهام المكلفين بها أو التي أنشأوها"
  ON tasks FOR UPDATE
  USING (
    auth.uid() = assigned_to OR
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_id AND role IN ('owner', 'supervisor')
    )
  );

CREATE POLICY "المستخدمون يمكنهم حذف المهام التي أنشأوها"
  ON tasks FOR DELETE
  USING (
    auth.uid() = created_by OR
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_id AND role IN ('owner', 'supervisor')
    )
  );

-- سياسات جدول الملفات
CREATE POLICY "المستخدمون يمكنهم قراءة الملفات في المشاريع التي هم أعضاء فيها"
  ON files FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = project_id
    )
  );

CREATE POLICY "المستخدمون يمكنهم رفع ملفات في المشاريع التي هم أعضاء فيها"
  ON files FOR INSERT
  WITH CHECK (
    auth.uid() IN (
      SELECT user_id FROM project_members WHERE project_id = NEW.project_id
    )
  );

CREATE POLICY "المستخدمون يمكنهم تحديث الملفات التي رفعوها"
  ON files FOR UPDATE
  USING (auth.uid() = user_id);

CREATE POLICY "المستخدمون يمكنهم حذف الملفات التي رفعوها"
  ON files FOR DELETE
  USING (
    auth.uid() = user_id OR
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_id AND role IN ('owner', 'supervisor')
    )
  );

-- ======================================================
-- 6. إنشاء المشاهدات (Views) للاستعلامات الشائعة
-- ======================================================

-- مشاهدة لعرض المشاريع مع عدد الأعضاء والمنشورات
CREATE OR REPLACE VIEW project_stats AS
SELECT 
  p.id,
  p.name,
  p.description,
  p.status,
  p.created_at,
  p.updated_at,
  u.full_name AS owner_name,
  (SELECT COUNT(*) FROM project_members pm WHERE pm.project_id = p.id) AS member_count,
  (SELECT COUNT(*) FROM posts po WHERE po.project_id = p.id) AS post_count
FROM 
  projects p
JOIN 
  auth.users u ON p.owner_id = u.id;

-- مشاهدة لعرض المنشورات مع معلومات المؤلف وعدد التعليقات والمشاهدات
CREATE OR REPLACE VIEW post_details AS
SELECT 
  p.id,
  p.title,
  p.content,
  p.code_snippet,
  p.image_url,
  p.created_at,
  p.updated_at,
  p.project_id,
  pr.name AS project_name,
  u.id AS user_id,
  u.full_name AS user_name,
  u.avatar_url AS user_avatar,
  (SELECT COUNT(*) FROM comments c WHERE c.post_id = p.id) AS comment_count,
  (SELECT COUNT(*) FROM post_views pv WHERE pv.post_id = p.id) AS view_count
FROM 
  posts p
JOIN 
  projects pr ON p.project_id = pr.id
JOIN 
  auth.users u ON p.user_id = u.id;

-- مشاهدة لعرض التعليقات مع معلومات المؤلف
CREATE OR REPLACE VIEW comment_details AS
SELECT 
  c.id,
  c.content,
  c.code_snippet,
  c.image_url,
  c.created_at,
  c.post_id,
  c.parent_id,
  u.id AS user_id,
  u.full_name AS user_name,
  u.avatar_url AS user_avatar
FROM 
  comments c
JOIN 
  auth.users u ON c.user_id = u.id;

-- مشاهدة لعرض المهام مع معلومات المشروع والمستخدم المكلف
CREATE OR REPLACE VIEW task_details AS
SELECT 
  t.id,
  t.title,
  t.description,
  t.status,
  t.priority,
  t.due_date,
  t.created_at,
  t.updated_at,
  t.project_id,
  p.name AS project_name,
  t.assigned_to,
  u.full_name AS assigned_to_name,
  u.avatar_url AS assigned_to_avatar,
  t.created_by,
  u2.full_name AS created_by_name
FROM 
  tasks t
JOIN 
  projects p ON t.project_id = p.id
LEFT JOIN 
  auth.users u ON t.assigned_to = u.id
JOIN 
  auth.users u2 ON t.created_by = u2.id;

-- ======================================================
-- 7. بيانات تجريبية للاختبار
-- ======================================================

-- إدخال بيانات تجريبية للمشاريع
INSERT INTO projects (name, description, owner_id, status)
VALUES 
  ('مشروع تخرج: نظام إدارة المكتبات', 'نظام متكامل لإدارة المكتبات الجامعية مع واجهة مستخدم سهلة الاستخدام', 'USER_ID_1', 'active'),
  ('بحث: تطبيقات الذكاء الاصطناعي في التعليم', 'دراسة حول استخدام تقنيات الذكاء الاصطناعي لتحسين تجربة التعلم', 'USER_ID_2', 'active'),
  ('مشروع هندسي: روبوت ذكي للمساعدة في المنزل', 'تصميم وبناء روبوت ذكي يمكنه مساعدة كبار السن في المهام المنزلية', 'USER_ID_3', 'active');

-- ملاحظة: يجب استبدال USER_ID_X بمعرفات المستخدمين الفعلية عند تنفيذ هذا الكود

-- ======================================================
-- 8. ملاحظات ختامية
-- ======================================================

/*
ملاحظات هامة:

1. يجب تنفيذ هذا الملف في بيئة Supabase أو قاعدة بيانات PostgreSQL.
2. يجب استبدال USER_ID_X بمعرفات المستخدمين الفعلية عند إدخال بيانات تجريبية.
3. تم تصميم قاعدة البيانات لتلبية متطلبات منصة GradTrack لإدارة المشاريع الأكاديمية.
4. تم تنفيذ سياسات الأمان (RLS) لضمان أن المستخدمين يمكنهم فقط الوصول إلى البيانات التي لديهم صلاحية الوصول إليها.
5. تم إنشاء فهارس لتحسين أداء الاستعلامات الشائعة.
6. تم إنشاء محفزات (Triggers) لتحديث الحقول تلقائياً وإنشاء الإشعارات.
7. تم إنشاء مشاهدات (Views) للاستعلامات الشائعة لتسهيل الوصول إلى البيانات.

للمزيد من المعلومات، يرجى الاطلاع على وثائق المشروع.
*/
