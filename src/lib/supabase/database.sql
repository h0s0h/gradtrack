-- إنشاء جداول قاعدة بيانات GradTrack

-- جدول المستخدمين (يتم إنشاؤه تلقائيًا بواسطة Supabase Auth)
-- نضيف فقط الحقول الإضافية التي نحتاجها
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS role TEXT DEFAULT 'student';
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS full_name TEXT;
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS avatar_url TEXT;

-- جدول المشاريع
CREATE TABLE IF NOT EXISTS projects (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  name TEXT NOT NULL,
  description TEXT,
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول أعضاء المشروع
CREATE TABLE IF NOT EXISTS project_members (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL CHECK (role IN ('owner', 'supervisor', 'member')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (project_id, user_id)
);

-- جدول المنشورات
CREATE TABLE IF NOT EXISTS posts (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  code_snippet TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول مشاهدات المنشورات
CREATE TABLE IF NOT EXISTS post_views (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  viewed_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  UNIQUE (post_id, user_id)
);

-- جدول التعليقات
CREATE TABLE IF NOT EXISTS comments (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  content TEXT NOT NULL,
  code_snippet TEXT,
  image_url TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- جدول الإشعارات
CREATE TABLE IF NOT EXISTS notifications (
  id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  type TEXT NOT NULL CHECK (type IN ('post_created', 'comment_added', 'project_invitation', 'inactivity_alert')),
  related_id UUID,
  is_read BOOLEAN DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- إنشاء الدوال المساعدة

-- دالة لتحديث حقل updated_at
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
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

-- إنشاء سياسات الأمان (RLS)

-- تفعيل RLS على جميع الجداول
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

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

-- سياسات جدول الإشعارات
CREATE POLICY "المستخدمون يمكنهم قراءة إشعاراتهم فقط"
  ON notifications FOR SELECT
  USING (auth.uid() = user_id);
