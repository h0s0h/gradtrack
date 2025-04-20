-- GradTrack Database Schema - Fixed Version with Recursion Issue Resolved

-- Create extensions if not already created
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Create custom types
CREATE TYPE user_role AS ENUM ('student', 'supervisor', 'admin');
CREATE TYPE member_role AS ENUM ('owner', 'supervisor', 'member');
CREATE TYPE notification_type AS ENUM ('post_created', 'comment_added', 'project_invitation', 'inactivity_alert', 'invitation_accepted');

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
    cloudinary_image_id TEXT,
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

-- Create Project Invitations table
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
CREATE INDEX idx_project_invitations_project_id ON project_invitations(project_id);
CREATE INDEX idx_project_invitations_email ON project_invitations(email);
CREATE INDEX idx_project_invitations_invite_code ON project_invitations(invite_code);

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

-- FIXED: current_user_id() function to correctly get current user
CREATE OR REPLACE FUNCTION current_user_id() 
RETURNS UUID AS $$
BEGIN
    -- In production with Supabase Auth:
    RETURN (auth.uid());
    
    -- If not using Supabase, replace with your authentication system's method
    -- Example with a session variable:
    -- RETURN current_setting('app.current_user_id')::UUID;
    
    -- IMPORTANT: For development/testing only (uncomment only one):
    -- RETURN NULL; -- Disable RLS checks
    -- RETURN '00000000-0000-0000-0000-000000000000'::UUID; -- Test with specific ID
EXCEPTION
    WHEN OTHERS THEN
        -- Fallback for development/test environments
        RETURN NULL;
END;
$$ LANGUAGE plpgsql;

-- FIXED: Function to check if user is admin
CREATE OR REPLACE FUNCTION is_admin(user_uuid UUID)
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user_uuid is NULL (system access)
    IF user_uuid IS NULL THEN
        RETURN TRUE;
    END IF;
    
    RETURN EXISTS (
        SELECT 1 FROM users
        WHERE id = user_uuid AND role = 'admin'
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: Helper functions for permissions with recursion issue resolved
-- Create a view to avoid RLS recursion when checking project membership
CREATE OR REPLACE VIEW project_members_direct AS
SELECT * FROM project_members;

-- FIXED: is_project_member function that uses the view instead of the table
CREATE OR REPLACE FUNCTION is_project_member(project_uuid UUID, user_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user_uuid is NULL (which means system or admin access)
    IF user_uuid IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if the user is an admin
    IF EXISTS (SELECT 1 FROM users WHERE id = user_uuid AND role = 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Use the view instead of the table to avoid RLS recursion
    RETURN EXISTS (
        SELECT 1 FROM project_members_direct 
        WHERE project_id = project_uuid AND user_id = user_uuid
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: can_manage_project function that uses the view instead of the table
CREATE OR REPLACE FUNCTION can_manage_project(project_uuid UUID, user_uuid UUID) 
RETURNS BOOLEAN AS $$
BEGIN
    -- Check if user_uuid is NULL (which means system or admin access)
    IF user_uuid IS NULL THEN
        RETURN TRUE;
    END IF;

    -- Check if the user is an admin
    IF EXISTS (SELECT 1 FROM users WHERE id = user_uuid AND role = 'admin') THEN
        RETURN TRUE;
    END IF;

    -- Check if the user is the project owner
    IF EXISTS (SELECT 1 FROM projects WHERE id = project_uuid AND owner_id = user_uuid) THEN
        RETURN TRUE;
    END IF;

    -- Use the view instead of the table to avoid RLS recursion
    RETURN EXISTS (
        SELECT 1 FROM project_members_direct 
        WHERE project_id = project_uuid 
        AND user_id = user_uuid 
        AND role IN ('owner', 'supervisor')
    );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- FIXED: Enable Row Level Security (RLS) on all tables with improved policies

-- Projects table RLS
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;

-- FIXED: Projects policies
DROP POLICY IF EXISTS projects_visibility ON projects;
DROP POLICY IF EXISTS projects_insert ON projects;
DROP POLICY IF EXISTS projects_update ON projects;
DROP POLICY IF EXISTS projects_delete ON projects;

CREATE POLICY projects_visibility ON projects
    FOR SELECT
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        owner_id = current_user_id() OR 
        is_project_member(id, current_user_id())
    );

CREATE POLICY projects_insert ON projects
    FOR INSERT
    WITH CHECK (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        owner_id = current_user_id()
    );

CREATE POLICY projects_update ON projects
    FOR UPDATE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        owner_id = current_user_id() OR 
        can_manage_project(id, current_user_id())
    );

CREATE POLICY projects_delete ON projects
    FOR DELETE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        owner_id = current_user_id()
    );

-- Project Members table RLS
ALTER TABLE project_members ENABLE ROW LEVEL SECURITY;

-- FIXED: Project Members policies with recursion issue resolved
DROP POLICY IF EXISTS project_members_visibility ON project_members;
DROP POLICY IF EXISTS project_members_insert ON project_members;
DROP POLICY IF EXISTS project_members_update ON project_members;
DROP POLICY IF EXISTS project_members_delete ON project_members;

-- FIXED: This policy now avoids the recursive reference to project_members
CREATE POLICY project_members_visibility ON project_members
    FOR SELECT
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM projects p
            WHERE p.id = project_id AND (
                p.owner_id = current_user_id() OR
                EXISTS (
                    SELECT 1 FROM project_members_direct pm
                    WHERE pm.project_id = p.id AND pm.user_id = current_user_id()
                )
            )
        )
    );

CREATE POLICY project_members_insert ON project_members
    FOR INSERT
    WITH CHECK (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_members_update ON project_members
    FOR UPDATE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_members_delete ON project_members
    FOR DELETE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        can_manage_project(project_id, current_user_id())
    );

-- Posts table RLS
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;

-- FIXED: Posts policies
DROP POLICY IF EXISTS posts_visibility ON posts;
DROP POLICY IF EXISTS posts_insert ON posts;
DROP POLICY IF EXISTS posts_update ON posts;
DROP POLICY IF EXISTS posts_delete ON posts;

CREATE POLICY posts_visibility ON posts
    FOR SELECT
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id() OR 
        is_project_member(project_id, current_user_id())
    );

CREATE POLICY posts_insert ON posts
    FOR INSERT
    WITH CHECK (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        (user_id = current_user_id() AND
        is_project_member(project_id, current_user_id()))
    );

CREATE POLICY posts_update ON posts
    FOR UPDATE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id() OR 
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY posts_delete ON posts
    FOR DELETE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id() OR 
        can_manage_project(project_id, current_user_id())
    );

-- Post Views table RLS
ALTER TABLE post_views ENABLE ROW LEVEL SECURITY;

-- FIXED: Post Views policies
DROP POLICY IF EXISTS post_views_visibility ON post_views;
DROP POLICY IF EXISTS post_views_insert ON post_views;

CREATE POLICY post_views_visibility ON post_views
    FOR SELECT
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        )
    );

CREATE POLICY post_views_insert ON post_views
    FOR INSERT
    WITH CHECK (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        (user_id = current_user_id() AND
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        ))
    );

-- Comments table RLS
ALTER TABLE comments ENABLE ROW LEVEL SECURITY;

-- FIXED: Comments policies
DROP POLICY IF EXISTS comments_visibility ON comments;
DROP POLICY IF EXISTS comments_insert ON comments;
DROP POLICY IF EXISTS comments_update ON comments;
DROP POLICY IF EXISTS comments_delete ON comments;

CREATE POLICY comments_visibility ON comments
    FOR SELECT
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        )
    );

CREATE POLICY comments_insert ON comments
    FOR INSERT
    WITH CHECK (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        (user_id = current_user_id() AND
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND is_project_member(p.project_id, current_user_id())
        ))
    );

CREATE POLICY comments_update ON comments
    FOR UPDATE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id()
    );

CREATE POLICY comments_delete ON comments
    FOR DELETE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id() OR 
        EXISTS (
            SELECT 1 FROM posts p
            WHERE p.id = post_id AND can_manage_project(p.project_id, current_user_id())
        )
    );

-- Notifications table RLS
ALTER TABLE notifications ENABLE ROW LEVEL SECURITY;

-- FIXED: Notifications policies
DROP POLICY IF EXISTS notifications_visibility ON notifications;
DROP POLICY IF EXISTS notifications_update ON notifications;

CREATE POLICY notifications_visibility ON notifications
    FOR SELECT
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id()
    );

CREATE POLICY notifications_update ON notifications
    FOR UPDATE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        user_id = current_user_id()
    );

-- Project Invitations table RLS
ALTER TABLE project_invitations ENABLE ROW LEVEL SECURITY;

-- FIXED: Project Invitations policies
DROP POLICY IF EXISTS project_invitations_visibility ON project_invitations;
DROP POLICY IF EXISTS project_invitations_insert ON project_invitations;
DROP POLICY IF EXISTS project_invitations_update ON project_invitations;
DROP POLICY IF EXISTS project_invitations_delete ON project_invitations;

CREATE POLICY project_invitations_visibility ON project_invitations
    FOR SELECT
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        invited_by = current_user_id() OR 
        email = (SELECT email FROM users WHERE id = current_user_id()) OR
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_invitations_insert ON project_invitations
    FOR INSERT
    WITH CHECK (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        (invited_by = current_user_id() AND
        can_manage_project(project_id, current_user_id()))
    );

CREATE POLICY project_invitations_update ON project_invitations
    FOR UPDATE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        invited_by = current_user_id() OR
        email = (SELECT email FROM users WHERE id = current_user_id()) OR
        can_manage_project(project_id, current_user_id())
    );

CREATE POLICY project_invitations_delete ON project_invitations
    FOR DELETE
    USING (
        current_user_id() IS NULL OR
        is_admin(current_user_id()) OR
        invited_by = current_user_id() OR
        can_manage_project(project_id, current_user_id())
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
    FOR member_id IN (SELECT user_id FROM project_members_direct WHERE project_id = NEW.project_id AND user_id != NEW.user_id)
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

-- FIXED: Function to accept project invitation
CREATE OR REPLACE FUNCTION accept_project_invitation(invitation_code TEXT)
RETURNS UUID AS $$
DECLARE
    invitation_record project_invitations;
    user_id UUID;
    project_id UUID;
BEGIN
    -- Get invitation details
    SELECT * INTO invitation_record 
    FROM project_invitations 
    WHERE invite_code = invitation_code 
      AND accepted = FALSE 
      AND expires_at > NOW();
    
    IF invitation_record IS NULL THEN
        RAISE EXCEPTION 'Invalid or expired invitation';
    END IF;
    
    -- Get user ID by email
    SELECT id INTO user_id 
    FROM users 
    WHERE email = invitation_record.email;
    
    -- If user doesn't exist, raise exception
    IF user_id IS NULL THEN
        RAISE EXCEPTION 'User with this email does not exist, please create an account first';
    END IF;
    
    -- Add user to project
    INSERT INTO project_members (project_id, user_id, role)
    VALUES (invitation_record.project_id, user_id, invitation_record.role)
    ON CONFLICT (project_id, user_id) 
    DO UPDATE SET role = invitation_record.role;
    
    -- Update invitation status
    UPDATE project_invitations
    SET accepted = TRUE
    WHERE id = invitation_record.id;
    
    -- Return project ID
    project_id := invitation_record.project_id;
    RETURN project_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Create notification when an invitation is accepted
CREATE OR REPLACE FUNCTION notify_on_invitation_acceptance()
RETURNS TRIGGER AS $$
DECLARE
    project_name TEXT;
    inviter_id UUID;
    user_email TEXT;
    user_name TEXT;
BEGIN
    IF NEW.accepted = TRUE AND OLD.accepted = FALSE THEN
        -- Get project name and inviter ID
        SELECT p.name, i.invited_by, u.email, u.full_name 
        INTO project_name, inviter_id, user_email, user_name
        FROM projects p
        JOIN project_invitations i ON p.id = i.project_id
        LEFT JOIN users u ON u.email = i.email
        WHERE i.id = NEW.id;
        
        -- Notify the person who sent the invitation
        INSERT INTO notifications (user_id, title, content, type, related_id)
        VALUES (
            inviter_id,
            'Invitation accepted',
            COALESCE(user_name, user_email) || ' has accepted your invitation to join ' || project_name,
            'invitation_accepted',
            NEW.id
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_notify_on_invitation_acceptance
AFTER UPDATE ON project_invitations
FOR EACH ROW EXECUTE FUNCTION notify_on_invitation_acceptance();

-- Création d'un type ENUM pour le statut des tâches
CREATE TYPE task_status AS ENUM ('not_started', 'in_progress', 'completed', 'delayed');

-- Création d'un type ENUM pour la priorité des tâches
CREATE TYPE task_priority AS ENUM ('low', 'medium', 'high');

-- Création de la table des tâches
CREATE TABLE tasks (
    id UUID PRIMARY KEY DEFAULT uuid_generate_v4(),
    project_id UUID NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    title TEXT NOT NULL,
    description TEXT,
    status task_status NOT NULL DEFAULT 'not_started',
    assigned_to UUID REFERENCES users(id) ON DELETE SET NULL,
    created_by UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    due_date TIMESTAMP WITH TIME ZONE,
    priority task_priority NOT NULL DEFAULT 'medium',
    completion_percentage INTEGER DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW() NOT NULL
);

-- Création d'index pour améliorer les performances
CREATE INDEX idx_tasks_project_id ON tasks(project_id);
CREATE INDEX idx_tasks_assigned_to ON tasks(assigned_to);
CREATE INDEX idx_tasks_created_by ON tasks(created_by);
CREATE INDEX idx_tasks_status ON tasks(status);
CREATE INDEX idx_tasks_due_date ON tasks(due_date);

-- Application du trigger pour mettre à jour automatiquement le champ updated_at
CREATE TRIGGER update_tasks_updated_at
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_modified_column();

-- Activation de la sécurité au niveau des lignes (RLS)
ALTER TABLE tasks ENABLE ROW LEVEL SECURITY;

-- Création des politiques de sécurité pour la table tasks

-- Politique de visibilité : les membres du projet peuvent voir les tâches
CREATE POLICY tasks_visibility ON tasks
    FOR SELECT
    USING (
        created_by = current_user_id() OR 
        assigned_to = current_user_id() OR
        is_project_member(project_id, current_user_id())
    );

-- Politique d'insertion : les membres du projet peuvent créer des tâches
CREATE POLICY tasks_insert ON tasks
    FOR INSERT
    WITH CHECK (
        created_by = current_user_id() AND
        is_project_member(project_id, current_user_id())
    );

-- Politique de mise à jour : l'utilisateur assigné ou les gestionnaires du projet peuvent mettre à jour les tâches
CREATE POLICY tasks_update ON tasks
    FOR UPDATE
    USING (
        assigned_to = current_user_id() OR 
        created_by = current_user_id() OR
        can_manage_project(project_id, current_user_id())
    );

-- Politique de suppression : seuls les gestionnaires du projet peuvent supprimer des tâches
CREATE POLICY tasks_delete ON tasks
    FOR DELETE
    USING (
        can_manage_project(project_id, current_user_id())
    );

-- Création d'une fonction pour mettre à jour automatiquement le statut en fonction du pourcentage d'achèvement
CREATE OR REPLACE FUNCTION update_task_status_based_on_completion()
RETURNS TRIGGER AS $$
BEGIN
    -- Si le pourcentage d'achèvement est modifié
    IF NEW.completion_percentage != OLD.completion_percentage THEN
        -- Si le pourcentage est à 100%, mettre le statut à 'completed'
        IF NEW.completion_percentage = 100 THEN
            NEW.status = 'completed';
        -- Si le pourcentage est supérieur à 0 mais inférieur à 100%, mettre le statut à 'in_progress'
        ELSIF NEW.completion_percentage > 0 THEN
            -- Ne pas changer le statut s'il est déjà 'delayed'
            IF NEW.status != 'delayed' THEN
                NEW.status = 'in_progress';
            END IF;
        -- Si le pourcentage est à 0, mettre le statut à 'not_started'
        ELSE
            -- Ne pas changer le statut s'il est déjà 'delayed'
            IF NEW.status != 'delayed' THEN
                NEW.status = 'not_started';
            END IF;
        END IF;
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Application du trigger pour mettre à jour automatiquement le statut
CREATE TRIGGER trigger_update_task_status
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_task_status_based_on_completion();

-- Création d'une fonction pour vérifier les tâches en retard
CREATE OR REPLACE FUNCTION check_delayed_tasks()
RETURNS VOID AS $$
BEGIN
    -- Mettre à jour le statut des tâches dont la date d'échéance est passée et qui ne sont pas complétées
    UPDATE tasks
    SET status = 'delayed'
    WHERE due_date < NOW()
      AND status != 'completed'
      AND due_date IS NOT NULL;
END;
$$ LANGUAGE plpgsql;

-- Création d'une fonction pour obtenir les statistiques des tâches par projet
CREATE OR REPLACE FUNCTION get_project_task_stats(project_uuid UUID)
RETURNS TABLE (
    status task_status,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.status, COUNT(t.id)
    FROM tasks t
    WHERE t.project_id = project_uuid
    GROUP BY t.status;
END;
$$ LANGUAGE plpgsql;

-- Création d'une fonction pour obtenir les statistiques des tâches par utilisateur
CREATE OR REPLACE FUNCTION get_user_task_stats(user_uuid UUID)
RETURNS TABLE (
    status task_status,
    count BIGINT
) AS $$
BEGIN
    RETURN QUERY
    SELECT t.status, COUNT(t.id)
    FROM tasks t
    WHERE t.assigned_to = user_uuid
    GROUP BY t.status;
END;
$$ LANGUAGE plpgsql;

-- Commentaire explicatif
COMMENT ON TABLE tasks IS 'Stocke les tâches associées aux projets avec leur statut, priorité et assignation';



-- 1. إنشاء دالة لإرسال تنبيه عند إنشاء مهمة جديدة
CREATE OR REPLACE FUNCTION notify_task_creation()
RETURNS TRIGGER AS $$
DECLARE
    project_member_id UUID;
    project_name TEXT;
BEGIN
    -- الحصول على اسم المشروع
    SELECT name INTO project_name 
    FROM projects 
    WHERE id = NEW.project_id;
    
    -- إرسال تنبيه لكل عضو في المشروع باستثناء المنشئ
    FOR project_member_id IN (
        SELECT user_id 
        FROM project_members 
        WHERE project_id = NEW.project_id 
        AND user_id != NEW.created_by
    )
    LOOP
        INSERT INTO notifications (
            user_id, 
            title, 
            content, 
            type, 
            related_id, 
            is_read, 
            created_at
        )
        VALUES (
            project_member_id,
            'مهمة جديدة: ' || NEW.title,
            'تم إنشاء مهمة جديدة في المشروع: ' || project_name,
            'task_created',
            NEW.id,
            FALSE,
            NOW()
        );
    END LOOP;
    
    -- إرسال تنبيه للمستخدم المكلف بالمهمة (إذا تم تكليف أحد)
    IF NEW.assigned_to IS NOT NULL AND NEW.assigned_to != NEW.created_by THEN
        INSERT INTO notifications (
            user_id, 
            title, 
            content, 
            type, 
            related_id, 
            is_read, 
            created_at
        )
        VALUES (
            NEW.assigned_to,
            'تم تكليفك بمهمة جديدة: ' || NEW.title,
            'تم تكليفك بمهمة جديدة في المشروع: ' || project_name,
            'task_assigned',
            NEW.id,
            FALSE,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لإرسال التنبيهات عند إنشاء مهمة جديدة
DROP TRIGGER IF EXISTS trigger_notify_task_creation ON tasks;
CREATE TRIGGER trigger_notify_task_creation
AFTER INSERT ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_creation();

-- 2. إنشاء دالة لإرسال تنبيه عند تحديث مهمة
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
    project_member_id UUID;
    project_name TEXT;
    creator_name TEXT;
    notification_title TEXT;
    notification_content TEXT;
    notification_type TEXT;
BEGIN
    -- الحصول على اسم المشروع
    SELECT name INTO project_name 
    FROM projects 
    WHERE id = NEW.project_id;
    
    -- الحصول على اسم منشئ المهمة
    SELECT full_name INTO creator_name 
    FROM users 
    WHERE id = NEW.created_by;
    
    -- تحديد نوع التنبيه والمحتوى بناءً على التغييرات
    IF OLD.status != NEW.status THEN
        notification_title := 'تغيير حالة المهمة: ' || NEW.title;
        notification_content := 'تم تغيير حالة المهمة من "' || OLD.status || '" إلى "' || NEW.status || '"';
        notification_type := 'task_status_changed';
    ELSIF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to THEN
        notification_title := 'تغيير تكليف المهمة: ' || NEW.title;
        notification_content := 'تم تغيير تكليف المهمة في المشروع: ' || project_name;
        notification_type := 'task_assigned';
    ELSE
        notification_title := 'تحديث المهمة: ' || NEW.title;
        notification_content := 'تم تحديث تفاصيل المهمة في المشروع: ' || project_name;
        notification_type := 'task_updated';
    END IF;
    
    -- إرسال تنبيه لكل عضو في المشروع
    FOR project_member_id IN (
        SELECT user_id 
        FROM project_members 
        WHERE project_id = NEW.project_id 
        AND user_id != current_user_id() -- استثناء المستخدم الذي قام بالتحديث
    )
    LOOP
        INSERT INTO notifications (
            user_id, 
            title, 
            content, 
            type, 
            related_id, 
            is_read, 
            created_at
        )
        VALUES (
            project_member_id,
            notification_title,
            notification_content,
            notification_type,
            NEW.id,
            FALSE,
            NOW()
        );
    END LOOP;
    
    -- إرسال تنبيه خاص للمستخدم المكلف الجديد إذا تغير
    IF OLD.assigned_to IS DISTINCT FROM NEW.assigned_to AND NEW.assigned_to IS NOT NULL 
       AND NEW.assigned_to != current_user_id() THEN
        INSERT INTO notifications (
            user_id, 
            title, 
            content, 
            type, 
            related_id, 
            is_read, 
            created_at
        )
        VALUES (
            NEW.assigned_to,
            'تم تكليفك بمهمة: ' || NEW.title,
            'تم تكليفك بالعمل على مهمة في المشروع: ' || project_name,
            'task_assigned',
            NEW.id,
            FALSE,
            NOW()
        );
    END IF;
    
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لإرسال التنبيهات عند تحديث مهمة
DROP TRIGGER IF EXISTS trigger_notify_task_update ON tasks;
CREATE TRIGGER trigger_notify_task_update
AFTER UPDATE ON tasks
FOR EACH ROW
WHEN (
    OLD.status IS DISTINCT FROM NEW.status OR
    OLD.assigned_to IS DISTINCT FROM NEW.assigned_to OR
    OLD.title IS DISTINCT FROM NEW.title OR
    OLD.completion_percentage IS DISTINCT FROM NEW.completion_percentage
)
EXECUTE FUNCTION notify_task_update();

-- 3. إنشاء دالة لإرسال تنبيه عند حذف مهمة
CREATE OR REPLACE FUNCTION notify_task_deletion()
RETURNS TRIGGER AS $$
DECLARE
    project_member_id UUID;
    project_name TEXT;
BEGIN
    -- الحصول على اسم المشروع
    SELECT name INTO project_name 
    FROM projects 
    WHERE id = OLD.project_id;
    
    -- إرسال تنبيه لكل عضو في المشروع باستثناء من قام بالحذف
    FOR project_member_id IN (
        SELECT user_id 
        FROM project_members 
        WHERE project_id = OLD.project_id 
        AND user_id != current_user_id()
    )
    LOOP
        INSERT INTO notifications (
            user_id, 
            title, 
            content, 
            type, 
            related_id, 
            is_read, 
            created_at
        )
        VALUES (
            project_member_id,
            'تم حذف مهمة: ' || OLD.title,
            'تم حذف مهمة من المشروع: ' || project_name,
            'task_deleted',
            OLD.project_id,  -- استخدام معرف المشروع بدلاً من معرف المهمة المحذوفة
            FALSE,
            NOW()
        );
    END LOOP;
    
    RETURN OLD;
END;
$$ LANGUAGE plpgsql;

-- إنشاء trigger لإرسال التنبيهات عند حذف مهمة
DROP TRIGGER IF EXISTS trigger_notify_task_deletion ON tasks;
CREATE TRIGGER trigger_notify_task_deletion
AFTER DELETE ON tasks
FOR EACH ROW EXECUTE FUNCTION notify_task_deletion();


-- أولاً: تحديث نوع ENUM لإضافة أنواع التنبيهات الجديدة
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_created';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_updated';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_assigned';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_status_changed';
ALTER TYPE notification_type ADD VALUE IF NOT EXISTS 'task_deleted';



-- إنشاء نوع ENUM جديد يتضمن القيم القديمة والجديدة
CREATE TYPE notification_type_new AS ENUM (
    'post_created', 
    'comment_added', 
    'project_invitation', 
    'inactivity_alert', 
    'invitation_accepted',
    'task_created',
    'task_updated',
    'task_assigned',
    'task_status_changed',
    'task_deleted'
);

-- تحويل الجدول لاستخدام النوع الجديد
ALTER TABLE notifications 
  ALTER COLUMN type TYPE notification_type_new 
  USING (type::text::notification_type_new);

-- حذف النوع القديم وإعادة تسمية النوع الجديد
DROP TYPE notification_type;
ALTER TYPE notification_type_new RENAME TO notification_type;



-- تحديث جدول المستخدمين لإضافة حقل معرف صورة كلاودينيري
ALTER TABLE auth.users ADD COLUMN IF NOT EXISTS cloudinary_avatar_id TEXT;
COMMENT ON COLUMN auth.users.cloudinary_avatar_id IS 'معرف صورة المستخدم في Cloudinary';

-- تأكد من تطبيق التغييرات على جدول users المخصص إذا كنت تستخدم جدولاً مخصصاً
ALTER TABLE public.users ADD COLUMN IF NOT EXISTS cloudinary_avatar_id TEXT;
COMMENT ON COLUMN public.users.cloudinary_avatar_id IS 'معرف صورة المستخدم في Cloudinary';

-- تحديث المشاريع أيضاً لدعم cloudinary_image_id
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cloudinary_image_id TEXT;
COMMENT ON COLUMN projects.cloudinary_image_id IS 'معرف صورة المشروع في Cloudinary';


-- السماح بإنشاء إشعارات جديدة
CREATE POLICY "السماح بإنشاء إشعارات من قبل أي عضو مسجل الدخول"
ON notifications FOR INSERT
WITH CHECK (
  auth.uid() IS NOT NULL
);

ALTER TABLE projects 
ADD COLUMN completion_percentage numeric DEFAULT 0 CHECK (completion_percentage >= 0 AND completion_percentage <= 100);

ALTER TABLE projects
ADD COLUMN thumbnail_url text;

-- دالة إدخال الإشعارات
CREATE OR REPLACE FUNCTION insert_notification(
  p_user_id UUID,
  p_title TEXT,
  p_content TEXT,
  p_type TEXT,
  p_related_id UUID DEFAULT NULL,
  p_is_read BOOLEAN DEFAULT FALSE
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  INSERT INTO notifications (
    user_id,
    title,
    content,
    type,
    related_id,
    is_read,
    created_at
  )
  VALUES (
    p_user_id,
    p_title,
    p_content,
    p_type::notification_type,  -- التحويل الصريح إلى النوع enum
    p_related_id,
    p_is_read,
    NOW()
  )
  RETURNING to_jsonb(notifications.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- تحقق من وجود السياسة قبل إنشائها
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' 
    AND tablename = 'notifications' 
    AND policyname = 'allow_insert_notifications'
  ) THEN
    EXECUTE '
      CREATE POLICY allow_insert_notifications
      ON notifications
      FOR INSERT
      WITH CHECK (true)
    ';
  END IF;
END;
$$;

-- تحديث نوع enum notification_type
DO $$
BEGIN
  BEGIN
    ALTER TYPE notification_type ADD VALUE 'task_created';
  EXCEPTION WHEN duplicate_object THEN
    -- تجاهل إذا كانت القيمة موجودة
  END;

  BEGIN
    ALTER TYPE notification_type ADD VALUE 'task_updated';
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TYPE notification_type ADD VALUE 'task_status_changed';
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TYPE notification_type ADD VALUE 'task_assigned';
  EXCEPTION WHEN duplicate_object THEN
  END;

  BEGIN
    ALTER TYPE notification_type ADD VALUE 'task_deleted';
  EXCEPTION WHEN duplicate_object THEN
  END;
END;
$$;
   GRANT EXECUTE ON FUNCTION insert_notification TO authenticated;
   GRANT EXECUTE ON FUNCTION insert_notification TO service_role;


   -- إصلاح مشاكل جدول المهام دون حذف أي بيانات

-- 1. التأكد من أن سياسات RLS صحيحة للجدول tasks
DO $$
BEGIN
  -- إعادة تعريف سياسات RLS للمهام
  DROP POLICY IF EXISTS tasks_update ON tasks;
  
  -- إنشاء سياسة تحديث أكثر تساهلاً للمهام
  CREATE POLICY tasks_update ON tasks
    FOR UPDATE
    USING (true)
    WITH CHECK (true);
    
  -- تحديث سياسة العرض أيضاً
  DROP POLICY IF EXISTS tasks_visibility ON tasks;
  
  CREATE POLICY tasks_visibility ON tasks
    FOR SELECT
    USING (true);
END;
$$;

-- 2. إنشاء دالة وظيفية لتحديث المهام بشكل آمن
CREATE OR REPLACE FUNCTION update_task_safely(
  p_task_id UUID,
  p_title TEXT,
  p_description TEXT,
  p_status TEXT,
  p_priority TEXT,
  p_due_date TIMESTAMP WITH TIME ZONE,
  p_assigned_to UUID,
  p_completion_percentage INTEGER
) RETURNS JSONB AS $$
DECLARE
  v_result JSONB;
BEGIN
  -- تحديث المهمة مع التعامل الصحيح مع الأنواع
  UPDATE tasks
  SET
    title = p_title,
    description = p_description,
    status = p_status::task_status,
    priority = p_priority::task_priority,
    due_date = p_due_date,
    assigned_to = p_assigned_to,
    completion_percentage = p_completion_percentage,
    updated_at = NOW()
  WHERE id = p_task_id
  RETURNING to_jsonb(tasks.*) INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- منح الأذونات المناسبة للدالة الجديدة
GRANT EXECUTE ON FUNCTION update_task_safely TO authenticated;
GRANT EXECUTE ON FUNCTION update_task_safely TO service_role;

-- 3. إضافة مؤشرات للأعمدة المهمة لتحسين الأداء
CREATE INDEX IF NOT EXISTS idx_tasks_status_priority ON tasks(status, priority);

-- 4. التأكد من أن الـ Triggers موجودة وتعمل بشكل صحيح
DROP TRIGGER IF EXISTS trigger_update_task_status ON tasks;

CREATE OR REPLACE FUNCTION update_task_status_based_on_completion()
RETURNS TRIGGER AS $$
BEGIN
  -- إذا تم تغيير نسبة الإنجاز
  IF NEW.completion_percentage != OLD.completion_percentage THEN
    -- إذا كانت النسبة 100%، تعيين الحالة إلى 'completed'
    IF NEW.completion_percentage = 100 THEN
      NEW.status = 'completed';
    -- إذا كانت النسبة أكبر من 0 ولكن أقل من 100%، تعيين الحالة إلى 'in_progress'
    ELSIF NEW.completion_percentage > 0 THEN
      -- عدم تغيير الحالة إذا كانت بالفعل 'delayed'
      IF NEW.status != 'delayed' THEN
        NEW.status = 'in_progress';
      END IF;
    -- إذا كانت النسبة 0، تعيين الحالة إلى 'not_started'
    ELSE
      -- عدم تغيير الحالة إذا كانت بالفعل 'delayed'
      IF NEW.status != 'delayed' THEN
        NEW.status = 'not_started';
      END IF;
    END IF;
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trigger_update_task_status
BEFORE UPDATE ON tasks
FOR EACH ROW EXECUTE FUNCTION update_task_status_based_on_completion();

-- 5. إضافة تعليقات توضيحية للجدول وأعمدته
COMMENT ON TABLE tasks IS 'جدول المهام - يحتوي على جميع مهام المشاريع';
COMMENT ON COLUMN tasks.status IS 'حالة المهمة: not_started, in_progress, completed, delayed';
COMMENT ON COLUMN tasks.priority IS 'أولوية المهمة: low, medium, high';



-- إسقاط الترجير الحالي الذي يسبب المشكلة
DROP TRIGGER IF EXISTS trigger_notify_task_update ON tasks;

-- إسقاط الدالة المرتبطة بالترجير
DROP FUNCTION IF EXISTS notify_task_update();

-- إنشاء الدالة الجديدة مع معالجة صحيحة للأنواع
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
    project_id UUID;
    task_title TEXT;
    project_members UUID[];
    status_map TEXT;
BEGIN
    -- الحصول على معرف المشروع وعنوان المهمة
    SELECT projects.id, tasks.title INTO project_id, task_title
    FROM tasks
    JOIN projects ON tasks.project_id = projects.id
    WHERE tasks.id = NEW.id;

    -- الحصول على أعضاء المشروع باستثناء الشخص الذي قام بالتحديث
    SELECT array_agg(user_id) INTO project_members
    FROM project_members
    WHERE project_id = project_id AND user_id != NEW.updated_by;
    
    -- التحقق من وجود أعضاء لإرسال الإشعارات إليهم
    IF project_members IS NULL OR array_length(project_members, 1) IS NULL THEN
        RETURN NEW;
    END IF;

    -- خريطة حالات المهام بالعربية
    CASE NEW.status
        WHEN 'to_do' THEN status_map := 'قيد الانتظار';
        WHEN 'in_progress' THEN status_map := 'قيد التنفيذ';
        WHEN 'in_review' THEN status_map := 'قيد المراجعة';
        WHEN 'done' THEN status_map := 'مكتملة';
        ELSE status_map := NEW.status;
    END CASE;

    -- إرسال إشعار عام بتحديث المهمة
    IF TG_OP = 'UPDATE' AND (
        OLD.title != NEW.title OR 
        OLD.description != NEW.description OR 
        OLD.due_date != NEW.due_date OR 
        OLD.priority != NEW.priority OR
        OLD.completion_percentage != NEW.completion_percentage
    ) THEN
        BEGIN
            -- استخدام الوظيفة المخصصة التي تتعامل مع التحويل بشكل صحيح
            PERFORM insert_notification(
                receiver_id,
                'تم تحديث المهمة: ' || NEW.title,
                'تم تحديث معلومات المهمة',
                'task_updated',
                NEW.id
            )
            FROM unnest(project_members) AS receiver_id;
        EXCEPTION WHEN OTHERS THEN
            -- تسجيل الخطأ ولكن استمرار في تنفيذ الترجير
            RAISE NOTICE 'خطأ في إرسال إشعار تحديث المهمة: %', SQLERRM;
        END;
    END IF;

    -- إشعار بتغيير حالة المهمة
    IF TG_OP = 'UPDATE' AND OLD.status != NEW.status THEN
        BEGIN
            PERFORM insert_notification(
                receiver_id,
                'تم تغيير حالة المهمة: ' || NEW.title,
                'تم تغيير حالة المهمة إلى: ' || status_map,
                'task_status_changed',
                NEW.id
            )
            FROM unnest(project_members) AS receiver_id;
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إرسال إشعار تغيير حالة المهمة: %', SQLERRM;
        END;
    END IF;

    -- إشعار بتعيين المهمة لمستخدم جديد
    IF TG_OP = 'UPDATE' AND OLD.assigned_to != NEW.assigned_to AND NEW.assigned_to IS NOT NULL THEN
        BEGIN
            PERFORM insert_notification(
                NEW.assigned_to,
                'تم تعيين مهمة جديدة لك',
                'تم تعيينك للمهمة: ' || NEW.title,
                'task_assigned',
                NEW.id
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إرسال إشعار تعيين المهمة: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- إعادة إنشاء الترجير
CREATE TRIGGER trigger_notify_task_update
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_update();


-- 1. إسقاط الترجير والدالة القديمة إن وُجدتا
DROP TRIGGER IF EXISTS trigger_notify_task_update ON tasks;
DROP FUNCTION IF EXISTS notify_task_update();

-- 2. إنشاء الدالة الجديدة notify_task_update
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id       UUID;
    v_task_title       TEXT;
    v_project_members  UUID[];
    v_status_map       TEXT;
    v_user_id          UUID := NEW.updated_by;  -- معرّف من قام بالتحديث
BEGIN
    -- جلب معرف المشروع وعنوان المهمة
    SELECT p.id, t.title
      INTO v_project_id, v_task_title
    FROM tasks    t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = NEW.id;

    -- جلب أعضاء المشروع باستثناء من قام بالتحديث
    SELECT array_agg(pm.user_id)
      INTO v_project_members
    FROM project_members pm
    WHERE pm.project_id = v_project_id
      AND pm.user_id    != v_user_id;

    -- إذا لم يكن هناك أعضاء لإرسال إشعارات لهم، نرجع السجل بدون تغيير
    IF v_project_members IS NULL
       OR array_length(v_project_members, 1) = 0 THEN
        RETURN NEW;
    END IF;

    -- خريطة حالات المهام إلى العربية
    CASE NEW.status
        WHEN 'to_do'       THEN v_status_map := 'قيد الانتظار';
        WHEN 'in_progress' THEN v_status_map := 'قيد التنفيذ';
        WHEN 'in_review'   THEN v_status_map := 'قيد المراجعة';
        WHEN 'done'        THEN v_status_map := 'مكتملة';
        ELSE v_status_map := NEW.status;
    END CASE;

    -- إشعار بتحديث البيانات الأساسية للمهمة
    IF TG_OP = 'UPDATE' AND (
        OLD.title               IS DISTINCT FROM NEW.title          OR
        OLD.description         IS DISTINCT FROM NEW.description    OR
        OLD.due_date            IS DISTINCT FROM NEW.due_date       OR
        OLD.priority            IS DISTINCT FROM NEW.priority       OR
        OLD.completion_percentage IS DISTINCT FROM NEW.completion_percentage
    ) THEN
        -- نرسل لكل عضو في المصفوفة
        FOREACH v_user_id IN ARRAY v_project_members LOOP
            BEGIN
                PERFORM insert_notification(
                    v_user_id,
                    'تم تحديث المهمة: ' || v_task_title,
                    'تم تحديث معلومات المهمة',
                    'task_updated',
                    NEW.id,
                    FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'خطأ في إرسال إشعار تحديث المهمة: %', SQLERRM;
            END;
        END LOOP;
    END IF;

    -- إشعار بتغيير حالة المهمة
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        FOREACH v_user_id IN ARRAY v_project_members LOOP
            BEGIN
                PERFORM insert_notification(
                    v_user_id,
                    'تم تغيير حالة المهمة: ' || v_task_title,
                    'تم تغيير حالة المهمة إلى: ' || v_status_map,
                    'task_status_changed',
                    NEW.id,
                    FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'خطأ في إرسال إشعار تغيير الحالة: %', SQLERRM;
            END;
        END LOOP;
    END IF;

    -- إشعار بتعيين المهمة إلى مستخدم جديد
    IF TG_OP = 'UPDATE'
       AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
       AND NEW.assigned_to IS NOT NULL THEN
        BEGIN
            PERFORM insert_notification(
                NEW.assigned_to,
                'تم تعيين مهمة جديدة لك',
                'تم تعيينك للمهمة: ' || v_task_title,
                'task_assigned',
                NEW.id,
                FALSE
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إرسال إشعار التعيين: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إعادة إنشاء الترجير بعد التحديث
CREATE TRIGGER trigger_notify_task_update
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_update();


-- 1. إسقاط الترجير والدالة القديمة إن وجدت
DROP TRIGGER IF EXISTS trigger_notify_task_update ON tasks;
DROP FUNCTION IF EXISTS notify_task_update();

-- 2. إنشاء الدالة الجديدة notify_task_update
CREATE OR REPLACE FUNCTION notify_task_update()
RETURNS TRIGGER AS $$
DECLARE
    v_project_id      UUID;
    v_task_title      TEXT;
    v_project_members UUID[];
    v_status_map      TEXT;
    v_user_id         UUID := NEW.updated_by;  -- معرّف المستخدم الذي حدّث السجل
BEGIN
    -- جلب معرف المشروع وعنوان المهمة
    SELECT p.id, t.title
      INTO v_project_id, v_task_title
    FROM tasks t
    JOIN projects p ON t.project_id = p.id
    WHERE t.id = NEW.id;

    -- جلب أعضاء المشروع باستثناء مَن حدّث السجل
    SELECT array_agg(pm.user_id)
      INTO v_project_members
    FROM project_members pm
    WHERE pm.project_id = v_project_id
      AND pm.user_id    != v_user_id;

    -- إذا لم يكن هناك أعضاء لإرسال إشعارات، ننهي تنفيذ الترجير
    IF v_project_members IS NULL
       OR array_length(v_project_members, 1) = 0 THEN
        RETURN NEW;
    END IF;

    -- خريطة حالات المهام إلى العربية
    CASE NEW.status
      WHEN 'not_started' THEN v_status_map := 'لم تبدأ';
      WHEN 'in_progress' THEN v_status_map := 'قيد التنفيذ';
      WHEN 'completed'   THEN v_status_map := 'مكتملة';
      WHEN 'delayed'     THEN v_status_map := 'متأخرة';
      ELSE v_status_map := NEW.status::text;
    END CASE;

    -- إشعار بتحديث بيانات المهمة الأساسية
    IF TG_OP = 'UPDATE' AND (
       OLD.title                IS DISTINCT FROM NEW.title             OR
       OLD.description          IS DISTINCT FROM NEW.description       OR
       OLD.due_date             IS DISTINCT FROM NEW.due_date          OR
       OLD.priority             IS DISTINCT FROM NEW.priority          OR
       OLD.completion_percentage IS DISTINCT FROM NEW.completion_percentage
    ) THEN
        FOREACH v_user_id IN ARRAY v_project_members LOOP
            BEGIN
                PERFORM insert_notification(
                  v_user_id,
                  'تم تحديث المهمة: ' || v_task_title,
                  'تم تحديث معلومات المهمة',
                  'task_updated',
                  NEW.id,
                  FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'خطأ في إرسال إشعار تحديث المهمة: %', SQLERRM;
            END;
        END LOOP;
    END IF;

    -- إشعار بتغيير حالة المهمة
    IF TG_OP = 'UPDATE'
       AND OLD.status IS DISTINCT FROM NEW.status THEN
        FOREACH v_user_id IN ARRAY v_project_members LOOP
            BEGIN
                PERFORM insert_notification(
                  v_user_id,
                  'تم تغيير حالة المهمة: ' || v_task_title,
                  'تم تغيير حالة المهمة إلى: ' || v_status_map,
                  'task_status_changed',
                  NEW.id,
                  FALSE
                );
            EXCEPTION WHEN OTHERS THEN
                RAISE NOTICE 'خطأ في إرسال إشعار تغيير الحالة: %', SQLERRM;
            END;
        END LOOP;
    END IF;

    -- إشعار بتعيين المهمة إلى مستخدم جديد
    IF TG_OP = 'UPDATE'
       AND OLD.assigned_to IS DISTINCT FROM NEW.assigned_to
       AND NEW.assigned_to IS NOT NULL THEN
        BEGIN
            PERFORM insert_notification(
              NEW.assigned_to,
              'تم تعيين مهمة جديدة لك',
              'تم تعيينك للمهمة: ' || v_task_title,
              'task_assigned',
              NEW.id,
              FALSE
            );
        EXCEPTION WHEN OTHERS THEN
            RAISE NOTICE 'خطأ في إرسال إشعار التعيين: %', SQLERRM;
        END;
    END IF;

    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- 3. إعادة إنشاء الترجير trigger_notify_task_update
CREATE TRIGGER trigger_notify_task_update
AFTER UPDATE ON tasks
FOR EACH ROW
EXECUTE FUNCTION notify_task_update();


-- Add updated_by column to tasks table
ALTER TABLE tasks ADD COLUMN updated_by UUID REFERENCES users(id);

-- Create an index on the updated_by column for better performance
CREATE INDEX idx_tasks_updated_by ON tasks(updated_by);

-- Update existing tasks to set updated_by equal to created_by 
-- (assuming that the creator is also the last updater for existing tasks)
UPDATE tasks SET updated_by = created_by WHERE updated_by IS NULL;

-- Add a comment to the column for documentation
COMMENT ON COLUMN tasks.updated_by IS 'User ID who last updated this task';
