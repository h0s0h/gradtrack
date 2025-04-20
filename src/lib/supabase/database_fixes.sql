-- Corrections pour la base de données GradTrack

-- 1. Création de la table 'users' si elle n'existe pas déjà
-- Cette table est référencée dans auth.ts mais n'est pas définie dans les scripts SQL
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'supervisor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);

-- Trigger pour mettre à jour le champ updated_at dans la table users
CREATE TRIGGER update_users_updated_at
BEFORE UPDATE ON users
FOR EACH ROW
EXECUTE FUNCTION update_updated_at_column();

-- 2. Ajout des politiques RLS manquantes pour la table post_views

-- Politique pour permettre aux utilisateurs de voir les vues de leurs propres posts
CREATE POLICY "Les utilisateurs peuvent voir les vues de leurs propres posts"
  ON post_views FOR SELECT
  USING (
    auth.uid() IN (
      SELECT user_id FROM posts WHERE id = post_id
    )
  );

-- Politique pour permettre aux utilisateurs d'ajouter des vues aux posts des projets dont ils sont membres
CREATE POLICY "Les utilisateurs peuvent ajouter des vues aux posts des projets dont ils sont membres"
  ON post_views FOR INSERT
  WITH CHECK (
    EXISTS (
      SELECT 1 FROM posts p
      JOIN project_members pm ON p.project_id = pm.project_id
      WHERE p.id = NEW.post_id AND pm.user_id = auth.uid()
    )
  );

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres vues
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres vues"
  ON post_views FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres vues
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres vues"
  ON post_views FOR DELETE
  USING (auth.uid() = user_id);

-- 3. Ajout des politiques de mise à jour et de suppression pour project_members

-- Politique pour permettre aux propriétaires et superviseurs de mettre à jour les membres du projet
CREATE POLICY "Les propriétaires et superviseurs peuvent mettre à jour les membres du projet"
  ON project_members FOR UPDATE
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_id AND role IN ('owner', 'supervisor')
    )
  );

-- Politique pour permettre aux propriétaires et superviseurs de supprimer les membres du projet
CREATE POLICY "Les propriétaires et superviseurs peuvent supprimer les membres du projet"
  ON project_members FOR DELETE
  USING (
    auth.uid() IN (
      SELECT user_id FROM project_members 
      WHERE project_id = project_id AND role IN ('owner', 'supervisor')
    )
  );

-- 4. Ajout des politiques de mise à jour et de suppression pour comments

-- Politique pour permettre aux utilisateurs de mettre à jour leurs propres commentaires
CREATE POLICY "Les utilisateurs peuvent mettre à jour leurs propres commentaires"
  ON comments FOR UPDATE
  USING (auth.uid() = user_id);

-- Politique pour permettre aux utilisateurs de supprimer leurs propres commentaires
CREATE POLICY "Les utilisateurs peuvent supprimer leurs propres commentaires"
  ON comments FOR DELETE
  USING (auth.uid() = user_id);

-- 5. Ajout d'index pour améliorer les performances

-- Index sur la colonne project_id dans la table project_members pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);

-- Index sur la colonne user_id dans la table project_members pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);

-- Index sur la colonne project_id dans la table posts pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_posts_project_id ON posts(project_id);

-- Index sur la colonne user_id dans la table posts pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);

-- Index sur la colonne post_id dans la table comments pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);

-- Index sur la colonne user_id dans la table comments pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);

-- Index sur la colonne post_id dans la table post_views pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);

-- Index sur la colonne user_id dans la table post_views pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);

-- Index sur la colonne user_id dans la table notifications pour accélérer les recherches
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);

-- 6. Ajout de politiques RLS pour la table users

-- Politique pour permettre aux utilisateurs de voir leur propre profil
CREATE POLICY "Les utilisateurs peuvent voir leur propre profil"
  ON users FOR SELECT
  USING (auth.uid() = id);

-- Politique pour permettre aux utilisateurs de mettre à jour leur propre profil
CREATE POLICY "Les utilisateurs peuvent mettre à jour leur propre profil"
  ON users FOR UPDATE
  USING (auth.uid() = id);

-- Activer RLS sur la table users
ALTER TABLE users ENABLE ROW LEVEL SECURITY;

-- 7. Ajout d'une fonction pour compter les vues d'un post

CREATE OR REPLACE FUNCTION get_post_views_count(post_id UUID)
RETURNS INTEGER AS $$
DECLARE
  views_count INTEGER;
BEGIN
  SELECT COUNT(*) INTO views_count FROM post_views WHERE post_id = $1;
  RETURN views_count;
END;
$$ LANGUAGE plpgsql;

-- 8. Ajout d'un trigger pour créer automatiquement un membre de projet lorsqu'un projet est créé

CREATE OR REPLACE FUNCTION create_project_owner()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO project_members (project_id, user_id, role)
  VALUES (NEW.id, NEW.owner_id, 'owner');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER create_project_owner_trigger
AFTER INSERT ON projects
FOR EACH ROW
EXECUTE FUNCTION create_project_owner();
