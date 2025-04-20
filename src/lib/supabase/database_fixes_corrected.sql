-- GradTrack Database Schema

-- Create extensions
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'supervisor', 'admin');
CREATE TYPE member_role AS ENUM ('owner', 'supervisor', 'member');
CREATE TYPE notification_type AS ENUM ('post_created', 'comment_added', 'project_invitation', 'inactivity_alert');

-- Create Users table
CREATE TABLE users (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    email TEXT UNIQUE NOT NULL,
    full_name TEXT NOT NULL,
    avatar_url TEXT,
    role user_role NOT NULL DEFAULT 'student',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Projects table
CREATE TABLE projects (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    name TEXT NOT NULL,
    description TEXT,
    owner_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Project Members table (many-to-many relationship)
CREATE TABLE project_members (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    role member_role NOT NULL DEFAULT 'member',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(project_id, user_id)
);

-- Create Posts table
CREATE TABLE posts (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    code_snippet TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Post Views table
CREATE TABLE post_views (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    viewed_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    UNIQUE(post_id, user_id)
);

-- Create Comments table
CREATE TABLE comments (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    content TEXT NOT NULL,
    code_snippet TEXT,
    image_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create Notifications table
CREATE TABLE notifications (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    type notification_type NOT NULL,
    related_id UUID,
    is_read BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Create indexes for better performance
CREATE INDEX idx_projects_owner_id ON projects(owner_id);
CREATE INDEX idx_project_members_project_id ON project_members(project_id);
CREATE INDEX idx_project_members_user_id ON project_members(user_id);
CREATE INDEX idx_posts_project_id ON posts(project_id);
CREATE INDEX idx_posts_user_id ON posts(user_id);
CREATE INDEX idx_post_views_post_id ON post_views(post_id);
CREATE INDEX idx_post_views_user_id ON post_views(user_id);
CREATE INDEX idx_comments_post_id ON comments(post_id);
CREATE INDEX idx_comments_user_id ON comments(user_id);
CREATE INDEX idx_notifications_user_id ON notifications(user_id);
CREATE INDEX idx_notifications_type ON notifications(type);

-- Create a function to automatically update 'updated_at' fields
CREATE OR REPLACE FUNCTION update_modified_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Apply the trigger to tables with updated_at column
CREATE TRIGGER update_projects_updated_at
BEFORE UPDATE ON projects
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_posts_updated_at
BEFORE UPDATE ON posts
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

CREATE TRIGGER update_comments_updated_at
BEFORE UPDATE ON comments
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Create a function to get the current user ID (to be implemented based on auth system)
-- THIS NEEDS TO BE DEFINED BEFORE IT'S USED IN RLS POLICIES
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
BEGIN
    -- This would be replaced with actual logic to get the current authenticated user ID
    -- For example, when using Supabase Auth:
    -- RETURN auth.uid();
    
    -- Placeholder for now:
    RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Create helper functions for permissions
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID, user_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = project_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION can_manage_project(project_uuid UUID, user_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = project_uuid 
        AND user_id = user_uuid 
        AND role IN ('owner', 'supervisor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable Row Level Security (RLS) on all tables

-- Projects table RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

CREATE POLICY projects_visibility ON projects
    FOR SELECT
    USING (
        owner_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = id AND user_id = current_user_id()
        )
    );

CREATE POLICY projects_insert ON projects
    FOR INSERT
    WITH CHECK (owner_id = current_user_id());

CREATE POLICY projects_update ON projects
    FOR UPDATE
    USING (owner_id = current_user_id() OR can_manage_project(id, current_user_id()));

CREATE POLICY projects_delete ON projects
    FOR DELETE
    USING (owner_id = current_user_id());

-- Project Members table RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

CREATE POLICY project_members_visibility ON project_members
    FOR SELECT
    USING (
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM project_members pm
            WHERE pm.project_id = project_id AND pm.user_id = current_user_id()
        )
    );

CREATE POLICY project_members_insert ON project_members
    FOR INSERT
    WITH CHECK (
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_members_update ON project_members
    FOR UPDATE
    USING (
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_members_delete ON project_members
    FOR DELETE
    USING (
        can_manage_project(project_id, current_user_id())
    );

-- Posts table RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY posts_visibility ON posts
    FOR SELECT
    USING (
        user_id = current_user_id() OR 
        is_project_member(project_id, current_user_id())
    );

CREATE POLICY posts_insert ON posts
    FOR INSERT
    WITH CHECK (
        user_id = current_user_id() AND
        is_project_member(project_id, current_user_id())
    );

CREATE POLICY posts_update ON posts
    FOR UPDATE
    USING (
        user_id = current_user_id() OR 
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY posts_delete ON posts
    FOR DELETE
    USING (
        user_id = current_user_id() OR 
        can_manage_project(project_id, current_user_id())
    );

-- Post Views table RLS
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

CREATE POLICY post_views_visibility ON post_views
    FOR SELECT
    USING (
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        )
    );

CREATE POLICY post_views_insert ON post_views
    FOR INSERT
    WITH CHECK (
        user_id = current_user_id() AND
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        )
    );

-- Comments table RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

CREATE POLICY comments_visibility ON comments
    FOR SELECT
    USING (
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        )
    );

CREATE POLICY comments_insert ON comments
    FOR INSERT
    WITH CHECK (
        user_id = current_user_id() AND
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        )
    );

CREATE POLICY comments_update ON comments
    FOR UPDATE
    USING (
        user_id = current_user_id()
    );

CREATE POLICY comments_delete ON comments
    FOR DELETE
    USING (
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND can_manage_project(p.project_id, current_user_id())
        )
    );

-- Notifications table RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

CREATE POLICY notifications_visibility ON notifications
    FOR SELECT
    USING (
        user_id = current_user_id()
    );

CREATE POLICY notifications_update ON notifications
    FOR UPDATE
    USING (
        user_id = current_user_id()
    );

-- Add triggers for automation

-- Add project owner as a member automatically
CREATE OR REPLACE FUNCTION add_owner_as_project_member()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (NEW.id, NEW.owner_id, 'owner');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_add_owner_as_project_member
AFTER INSERT ON projects
FOR EACH ROW EXECUTE FUNCTION add_owner_as_project_member();

-- Create notification when a post is created
CREATE OR REPLACE FUNCTION notify_on_post_creation()
RETURNS TRIGGER AS $$
DECLARE
    project_name TEXT;
    member_id UUID;
BEGIN
    -- Get project name
    SELECT name INTO project_name FROM projects WHERE id = NEW.project_id;
    
    -- Create notification for each project member
    FOR member_id IN (SELECT user_id FROM project_members WHERE project_id = NEW.project_id AND user_id != NEW.user_id)
    LOOP
        INSERT INTO notifications (user_id, title, content, type, related_id)
        VALUES (
            member_id, 
            'New post in ' || project_name,
            'A new post has been added to project ' || project_name,
            'post_created',
            NEW.id
        );
    END LOOP;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_post_creation
AFTER INSERT ON posts
FOR EACH ROW EXECUTE FUNCTION notify_on_post_creation();

-- Create notification when a comment is added
CREATE OR REPLACE FUNCTION notify_on_comment_creation()
RETURNS TRIGGER AS $$
DECLARE
    post_creator_id UUID;
    post_title TEXT;
BEGIN
    -- Get post creator
    SELECT user_id, SUBSTRING(content FROM 1 FOR 50) INTO post_creator_id, post_title 
    FROM posts WHERE id = NEW.post_id;
    
    -- Notify post creator if they didn't make the comment
    IF post_creator_id != NEW.user_id THEN
        INSERT INTO notifications (user_id, title, content, type, related_id)
        VALUES (
            post_creator_id,
            'New comment on your post',
            'Someone commented on your post: "' || post_title || '..."',
            'comment_added',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_comment_creation
AFTER INSERT ON comments
FOR EACH ROW EXECUTE FUNCTION notify_on_comment_creation();



-- إضافة جدول دعوات المشاريع
CREATE TABLE project_invitations (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    email TEXT NOT NULL,
    role member_role NOT NULL DEFAULT 'member',
    invite_code TEXT NOT NULL,
    invited_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    accepted BOOLEAN DEFAULT FALSE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    expires_at TIMESTAMP WITH TIME ZONE DEFAULT (NOW() + INTERVAL '7 days') NOT NULL,
    UNIQUE(project_id, email)
);

-- إنشاء فهرس لتحسين الأداء
CREATE INDEX idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX idx_project_invitations_email ON project_invitations(email);
CREATE INDEX idx_project_invitations_invite_code ON project_invitations(invite_code);

-- تمكين أمان مستوى الصف (RLS) على جدول الدعوات
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- إنشاء سياسات الوصول للدعوات
CREATE POLICY project_invitations_visibility ON project_invitations
    FOR SELECT
    USING (
        invited_by = current_user_id() OR 
        email = (SELECT email FROM users WHERE id = current_user_id()) OR
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_invitations_insert ON project_invitations
    FOR INSERT
    WITH CHECK (
        invited_by = current_user_id() AND
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_invitations_update ON project_invitations
    FOR UPDATE
    USING (
        invited_by = current_user_id() OR
        email = (SELECT email FROM users WHERE id = current_user_id()) OR
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_invitations_delete ON project_invitations
    FOR DELETE
    USING (
        invited_by = current_user_id() OR
        can_manage_project(project_id, current_user_id())
    );

-- إنشاء دالة للتعامل مع قبول الدعوات
CREATE OR REPLACE FUNCTION accept_project_invitation(invitation_code TEXT)
RETURNS UUID AS $$
DECLARE
    invitation_record project_invitations;
    user_id UUID;
    project_id UUID;
BEGIN
    -- الحصول على معلومات الدعوة
    SELECT * INTO invitation_record 
    FROM project_invitations 
    WHERE invite_code = invitation_code 
      AND accepted = FALSE 
      AND expires_at > NOW();
    
    IF invitation_record IS NULL THEN
        RAISE EXCEPTION 'الدعوة غير صالحة أو منتهية الصلاحية';
    END IF;
    
    -- الحصول على معرف المستخدم بواسطة البريد الإلكتروني
    SELECT id INTO user_id 
    FROM users 
    WHERE email = invitation_record.email;
    
    -- إذا لم يكن المستخدم موجودًا، ارفع استثناءً
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'المستخدم غير موجود بهذا البريد الإلكتروني، يجب إنشاء حساب أولاً';
    END IF;
    
    -- إضافة المستخدم إلى المشروع
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (invitation_record.project_id, user_id, invitation_record.role)
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET role = invitation_record.role;
    
    -- تحديث حالة الدعوة
    UPDATE project_invitations
    SET accepted = TRUE
    WHERE id = invitation_record.id;
    
    -- إرجاع معرف المشروع
    project_id := invitation_record.project_id;
    RETURN project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إضافة نوع إشعار جديد للدعوات
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'invitation_accepted';

-- إنشاء وظيفة لإنشاء إشعار عند قبول دعوة
CREATE OR REPLACE FUNCTION notify_on_invitation_acceptance()
RETURNS TRIGGER AS $$
DECLARE
    project_name TEXT;
    inviter_id UUID;
    user_email TEXT;
    user_name TEXT;
BEGIN
    IF NEW.accepted = TRUE AND OLD.accepted = FALSE THEN
        -- الحصول على اسم المشروع ومعرف المدعو
        SELECT p.name, i.invited_by, u.email, u.full_name 
        INTO project_name, inviter_id, user_email, user_name
        FROM projects p, project_invitations i, users u
        WHERE p.id = NEW.project_id 
          AND i.id = NEW.id
          AND u.email = NEW.email;
        
        -- إنشاء إشعار للمستخدم الذي أرسل الدعوة
        INSERT INTO notifications (user_id, title, content, type, related_id)
        VALUES (
            inviter_id,
            'تم قبول دعوة المشروع',
            user_name || ' (' || user_email || ') قبل دعوتك للانضمام إلى مشروع ' || project_name,
            'invitation_accepted',
            NEW.project_id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء مشغل للإشعار عند قبول الدعوة
CREATE TRIGGER trigger_notify_on_invitation_acceptance
AFTER UPDATE ON project_invitations
FOR EACH ROW EXECUTE FUNCTION notify_on_invitation_acceptance();














-- إصلاح سياسات المشاريع

-- حذف السياسات الحالية
DROP POLICY IF EXISTS projects_visibility ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
DROP POLICY IF EXISTS projects_update ON projects;
DROP POLICY IF EXISTS projects_delete ON projects;

-- إعادة إنشاء السياسات بشكل صحيح
-- سياسة عرض المشاريع: يمكن للمستخدم رؤية المشاريع التي يملكها أو التي هو عضو فيها
CREATE POLICY projects_visibility ON projects
    FOR SELECT
    USING (
        owner_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM project_members 
            WHERE project_id = id AND user_id = current_user_id()
        )
    );

-- سياسة إنشاء المشاريع: يمكن لأي مستخدم إنشاء مشروع طالما أنه المالك
CREATE POLICY projects_insert ON projects
    FOR INSERT
    WITH CHECK (owner_id = current_user_id());

-- سياسة تحديث المشاريع: يمكن للمالك أو المشرف تحديث المشروع
CREATE POLICY projects_update ON projects
    FOR UPDATE
    USING (
        owner_id = current_user_id() OR 
        can_manage_project(id, current_user_id())
    );

-- سياسة حذف المشاريع: يمكن للمالك فقط حذف المشروع
CREATE POLICY projects_delete ON projects
    FOR DELETE
    USING (owner_id = current_user_id());

-- إصلاح سياسات المشاركات (Posts)

-- حذف السياسات الحالية
DROP POLICY IF EXISTS posts_visibility ON posts;
DROP POLICY IF EXISTS posts_insert ON posts;
DROP POLICY IF EXISTS posts_update ON posts;
DROP POLICY IF EXISTS posts_delete ON posts;

-- إعادة إنشاء السياسات بشكل صحيح
-- سياسة عرض المشاركات: يمكن للمستخدم رؤية المشاركات التي هو عضو في مشروعها
CREATE POLICY posts_visibility ON posts
    FOR SELECT
    USING (
        user_id = current_user_id() OR 
        is_project_member(project_id, current_user_id())
    );

-- سياسة إنشاء المشاركات: يمكن لأي عضو في المشروع إنشاء مشاركة
CREATE POLICY posts_insert ON posts
    FOR INSERT
    WITH CHECK (
        is_project_member(project_id, current_user_id()) AND
        user_id = current_user_id()
    );

-- سياسة تحديث المشاركات: يمكن لصاحب المشاركة أو لمدير المشروع تحديثها
CREATE POLICY posts_update ON posts
    FOR UPDATE
    USING (
        user_id = current_user_id() OR 
        can_manage_project(project_id, current_user_id())
    );

-- سياسة حذف المشاركات: يمكن لصاحب المشاركة أو لمدير المشروع حذفها
CREATE POLICY posts_delete ON posts
    FOR DELETE
    USING (
        user_id = current_user_id() OR 
        can_manage_project(project_id, current_user_id())
    );

-- تحسين دالة is_project_member للتأكد من أنها تعمل بشكل صحيح
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID, user_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    RETURN EXISTS (
        SELECT 1 FROM project_members 
        WHERE project_id = project_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحسين دالة current_user_id لضمان أنها تعمل في بيئة الإنتاج
-- هذه الدالة يجب أن تكون متوافقة مع نظام المصادقة الذي تستخدمه
-- إذا كنت تستخدم Supabase، يمكنك تعديلها كالتالي:
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
BEGIN
    -- إذا كنت تستخدم Supabase أو أنظمة مماثلة:
    -- RETURN auth.uid();
    
    -- يمكنك أيضًا استخدام متغير جلسة معرف في نظامك:
    -- RETURN current_setting('my_app.user_id')::UUID;
    
    -- للتطوير والاختبار فقط (يجب تعديلها في الإنتاج):
    RETURN uuid_generate_v4(); -- أو استخدم معرف ثابت للاختبار
END;
$$ LANGUAGE plpgsql;




-- Primero, vamos a verificar y corregir la función current_user_id()
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
BEGIN
    -- En un entorno de producción real, esto debería devolver el ID del usuario autenticado
    -- Para Supabase: RETURN auth.uid();
    
    -- Si estás usando una variable de sesión:
    -- RETURN current_setting('my_app.current_user_id', true)::UUID;
    
    -- Para pruebas o desarrollo, puedes devolver un ID específico que exista en tu tabla users
    -- IMPORTANTE: Reemplaza esto con un UUID válido de un usuario existente en tu base de datos
    RETURN (SELECT id FROM users LIMIT 1);
    
    -- Alternativa: Si simplemente quieres deshabilitar temporalmente RLS para pruebas:
    -- RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- Ajustemos las políticas para la tabla projects
DROP POLICY IF EXISTS projects_insert ON projects;

-- Política ajustada para inserción de proyectos
CREATE POLICY projects_insert ON projects
    FOR INSERT
    WITH CHECK (
        -- Para inserción, solo verificamos que owner_id coincida con el usuario actual
        -- o permitimos la inserción si no hay un usuario actual (para fines de desarrollo/prueba)
        owner_id = current_user_id() OR current_user_id() IS NULL
    );

-- Si necesitas deshabilitar temporalmente RLS para proyectos (sólo para pruebas/desarrollo)
-- COMENTARIO: Descomentar la siguiente línea solo si necesitas deshabilitar completamente RLS
-- ALTER TABLE projects DISABLE ROW LEVEL SECURITY;

-- Alternativa: permitir a los superusuarios omitir RLS
-- COMENTARIO: Descomentar la siguiente línea solo si quieres que los superusuarios omitan RLS
-- ALTER TABLE projects FORCE ROW LEVEL SECURITY;

-- Otra alternativa: crear una política que permita todas las operaciones temporalmente
-- COMENTARIO: Descomentar la siguiente política solo para pruebas
-- CREATE POLICY allow_all_temporary ON projects FOR ALL USING (true);