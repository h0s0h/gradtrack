# Documentation des améliorations apportées au projet GradTrack

## Introduction

Ce document détaille les modifications apportées au projet GradTrack pour améliorer la compatibilité entre la base de données et les pages web. Les principales améliorations concernent la sélection du rôle lors de l'inscription (étudiant ou superviseur) et diverses corrections de la base de données pour assurer le bon fonctionnement de l'application.

## 1. Modifications de la base de données

### 1.1 Création de la table 'users'

La table 'users' a été ajoutée pour stocker les informations des utilisateurs, notamment leur rôle. Cette table est référencée dans le fichier auth.ts mais n'était pas définie dans les scripts SQL originaux.

```sql
CREATE TABLE IF NOT EXISTS users (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL,
  full_name TEXT,
  avatar_url TEXT,
  role TEXT DEFAULT 'student' CHECK (role IN ('student', 'supervisor', 'admin')),
  created_at TIMESTAMP WITH TIME ZONE DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT now()
);
```

La colonne `role` est définie avec une contrainte CHECK pour limiter les valeurs possibles à 'student', 'supervisor' ou 'admin', avec 'student' comme valeur par défaut.

### 1.2 Ajout des politiques RLS (Row Level Security)

Des politiques RLS ont été ajoutées pour sécuriser l'accès aux données :

#### Pour la table 'post_views'
- Politique SELECT : Les utilisateurs peuvent voir les vues de leurs propres posts
- Politique INSERT : Les utilisateurs peuvent ajouter des vues aux posts des projets dont ils sont membres
- Politique UPDATE : Les utilisateurs peuvent mettre à jour leurs propres vues
- Politique DELETE : Les utilisateurs peuvent supprimer leurs propres vues

#### Pour la table 'project_members'
- Politique UPDATE : Les propriétaires et superviseurs peuvent mettre à jour les membres du projet
- Politique DELETE : Les propriétaires et superviseurs peuvent supprimer les membres du projet

#### Pour la table 'comments'
- Politique UPDATE : Les utilisateurs peuvent mettre à jour leurs propres commentaires
- Politique DELETE : Les utilisateurs peuvent supprimer leurs propres commentaires

#### Pour la table 'users'
- Politique SELECT : Les utilisateurs peuvent voir leur propre profil
- Politique UPDATE : Les utilisateurs peuvent mettre à jour leur propre profil
- Politique SELECT pour administrateurs : Les administrateurs peuvent voir tous les profils
- Politique SELECT pour superviseurs : Les superviseurs peuvent voir les profils des étudiants dans leurs projets

### 1.3 Optimisation des performances

Des index ont été ajoutés sur les colonnes fréquemment utilisées dans les requêtes pour améliorer les performances :

```sql
CREATE INDEX IF NOT EXISTS idx_project_members_project_id ON project_members(project_id);
CREATE INDEX IF NOT EXISTS idx_project_members_user_id ON project_members(user_id);
CREATE INDEX IF NOT EXISTS idx_posts_project_id ON posts(project_id);
CREATE INDEX IF NOT EXISTS idx_posts_user_id ON posts(user_id);
CREATE INDEX IF NOT EXISTS idx_comments_post_id ON comments(post_id);
CREATE INDEX IF NOT EXISTS idx_comments_user_id ON comments(user_id);
CREATE INDEX IF NOT EXISTS idx_post_views_post_id ON post_views(post_id);
CREATE INDEX IF NOT EXISTS idx_post_views_user_id ON post_views(user_id);
CREATE INDEX IF NOT EXISTS idx_notifications_user_id ON notifications(user_id);
```

### 1.4 Fonctions et triggers utilitaires

Des fonctions et triggers ont été ajoutés pour faciliter certaines opérations :

- Fonction `get_post_views_count` : Compte les vues d'un post
- Trigger `create_project_owner` : Crée automatiquement un membre de projet lorsqu'un projet est créé
- Trigger `update_users_updated_at` : Met à jour le champ updated_at dans la table users

## 2. Modifications du système d'authentification

### 2.1 Mise à jour de la fonction signUp dans auth.ts

La fonction `signUp` a été modifiée pour prendre en compte le rôle sélectionné par l'utilisateur :

```typescript
export async function signUp(email: string, password: string, fullName: string, role: 'student' | 'supervisor' = 'student'): Promise<AuthResponse> {
  try {
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
          role: role,
        },
      },
    });

    if (error) {
      return { user: null, error: { message: error.message } };
    }

    // إنشاء سجل في جدول المستخدمين للمعلومات الإضافية
    if (data.user) {
      const { error: profileError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          email: data.user.email,
          full_name: fullName,
          role: role
        });
      
      if (profileError) {
        console.error('Error creating user profile:', profileError);
      }
    }

    return { user: data.user as User, error: null };
  } catch (error) {
    return { user: null, error: { message: 'حدث خطأ أثناء إنشاء الحساب' } };
  }
}
```

Les principales modifications sont :
- Ajout du paramètre `role` avec une valeur par défaut 'student'
- Passage du rôle aux options de données lors de l'inscription
- Utilisation du rôle sélectionné lors de la création du profil utilisateur

## 3. Modifications de la page d'inscription

### 3.1 Mise à jour du schéma de validation

Le schéma de validation Zod a été mis à jour pour inclure le champ 'role' :

```typescript
const signupSchema = z.object({
  fullName: z.string().min(3, 'الاسم الكامل يجب أن يكون 3 أحرف على الأقل'),
  email: z.string().email('يرجى إدخال بريد إلكتروني صحيح'),
  password: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  confirmPassword: z.string().min(6, 'كلمة المرور يجب أن تكون 6 أحرف على الأقل'),
  role: z.enum(['student', 'supervisor'], {
    required_error: 'يرجى اختيار نوع الحساب',
  }),
}).refine((data) => data.password === data.confirmPassword, {
  message: 'كلمات المرور غير متطابقة',
  path: ['confirmPassword'],
});
```

### 3.2 Ajout des valeurs par défaut du formulaire

Les valeurs par défaut du formulaire ont été mises à jour pour inclure le rôle :

```typescript
const {
  register,
  handleSubmit,
  formState: { errors },
} = useForm<SignupFormValues>({
  resolver: zodResolver(signupSchema),
  defaultValues: {
    fullName: '',
    email: '',
    password: '',
    confirmPassword: '',
    role: 'student',
  },
});
```

### 3.3 Ajout de l'interface utilisateur pour la sélection du rôle

Des boutons radio ont été ajoutés pour permettre à l'utilisateur de choisir entre étudiant et superviseur :

```tsx
<div>
  <label className="block text-sm font-medium text-gray-700 mb-1 text-right">
    نوع الحساب
  </label>
  <div className="flex space-x-4 space-x-reverse justify-end">
    <div className="flex items-center">
      <input
        id="role-student"
        type="radio"
        value="student"
        {...register("role")}
        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
        defaultChecked
      />
      <label htmlFor="role-student" className="mr-2 block text-sm text-gray-700">
        طالب
      </label>
    </div>
    <div className="flex items-center">
      <input
        id="role-supervisor"
        type="radio"
        value="supervisor"
        {...register("role")}
        className="h-4 w-4 text-indigo-600 focus:ring-indigo-500 border-gray-300"
      />
      <label htmlFor="role-supervisor" className="mr-2 block text-sm text-gray-700">
        مشرف
      </label>
    </div>
  </div>
  {errors.role && (
    <p className="mt-1 text-sm text-red-600">{errors.role.message}</p>
  )}
</div>
```

### 3.4 Mise à jour de la fonction onSubmit

La fonction onSubmit a été mise à jour pour passer le rôle sélectionné à la fonction signUp :

```typescript
const onSubmit = async (data: SignupFormValues) => {
  setIsLoading(true);
  setError(null);
  setSuccess(null);

  try {
    const { user, error } = await signUp(data.email, data.password, data.fullName, data.role);

    if (error) {
      setError(error.message);
      return;
    }

    setSuccess('تم إنشاء الحساب بنجاح! يرجى التحقق من بريدك الإلكتروني لتأكيد الحساب.');
    setTimeout(() => {
      router.push('/auth/login');
    }, 3000);
  } catch (err) {
    setError('حدث خطأ أثناء إنشاء الحساب');
  } finally {
    setIsLoading(false);
  }
};
```

## 4. Tests et vérification

Les modifications ont été testées pour s'assurer qu'elles fonctionnent correctement :

- La fonction signUp dans auth.ts prend correctement en compte le paramètre de rôle
- La page d'inscription permet la sélection du rôle (étudiant ou superviseur)
- Les corrections de la base de données incluent la création de la table users avec la colonne role, les politiques RLS nécessaires, et des index pour améliorer les performances

## 5. Conclusion

Les modifications apportées au projet GradTrack permettent désormais aux utilisateurs de sélectionner leur rôle (étudiant ou superviseur) lors de l'inscription, comme demandé. Les corrections de la base de données assurent également le bon fonctionnement des pages de profil, tableau de bord, création de projet et lecture de projet.

Pour appliquer ces modifications, il suffit d'exécuter le script SQL `database_fixes_updated.sql` dans la base de données Supabase et de déployer les fichiers modifiés (auth.ts et page.tsx) sur le serveur.
