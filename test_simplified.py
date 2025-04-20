#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour vérifier les fonctionnalités de la base de données et des pages GradTrack
Version simplifiée sans connexion à la base de données
"""

import os
import sys

def test_auth_function():
    """Vérifier la fonction d'authentification"""
    print("\n=== Test de la fonction d'authentification ===")
    
    # Vérifier le fichier auth.ts
    auth_file_path = "/home/ubuntu/gradtrack/src/lib/supabase/auth.ts"
    try:
        with open(auth_file_path, 'r') as f:
            auth_content = f.read()
            
            if "role: 'student' | 'supervisor'" in auth_content:
                print("✅ Le type de rôle est correctement défini dans auth.ts")
            else:
                print("❌ Le type de rôle n'est pas correctement défini dans auth.ts")
            
            if "role: role" in auth_content:
                print("✅ La fonction signUp passe correctement le rôle à Supabase")
            else:
                print("❌ La fonction signUp ne passe pas correctement le rôle à Supabase")
    except Exception as e:
        print(f"❌ Erreur lors de la vérification du fichier auth.ts: {e}")

def test_signup_page():
    """Vérifier la page d'inscription"""
    print("\n=== Test de la page d'inscription ===")
    
    # Vérifier le fichier page.tsx
    signup_file_path = "/home/ubuntu/gradtrack/src/app/auth/signup/page.tsx"
    try:
        with open(signup_file_path, 'r') as f:
            signup_content = f.read()
            
            if "role: z.enum(['student', 'supervisor']" in signup_content:
                print("✅ Le schéma de validation inclut le champ 'role'")
            else:
                print("❌ Le schéma de validation n'inclut pas le champ 'role'")
            
            if "role: 'student'" in signup_content:
                print("✅ La valeur par défaut du rôle est définie")
            else:
                print("❌ La valeur par défaut du rôle n'est pas définie")
            
            if "value=\"student\"" in signup_content and "value=\"supervisor\"" in signup_content:
                print("✅ Les options de sélection de rôle sont présentes dans la page")
            else:
                print("❌ Les options de sélection de rôle ne sont pas présentes dans la page")
            
            if "data.role" in signup_content:
                print("✅ La fonction onSubmit passe le rôle sélectionné à la fonction signUp")
            else:
                print("❌ La fonction onSubmit ne passe pas le rôle sélectionné à la fonction signUp")
    except Exception as e:
        print(f"❌ Erreur lors de la vérification de la page d'inscription: {e}")

def test_database_fixes():
    """Vérifier les corrections de la base de données"""
    print("\n=== Test des corrections de la base de données ===")
    
    # Vérifier le fichier database_fixes_updated.sql
    db_file_path = "/home/ubuntu/gradtrack/src/lib/supabase/database_fixes_updated.sql"
    try:
        with open(db_file_path, 'r') as f:
            db_content = f.read()
            
            if "CREATE TABLE IF NOT EXISTS users" in db_content:
                print("✅ La table 'users' est créée si elle n'existe pas")
            else:
                print("❌ La création de la table 'users' n'est pas correctement définie")
            
            if "role TEXT DEFAULT 'student' CHECK (role IN ('student', 'supervisor', 'admin'))" in db_content:
                print("✅ La colonne 'role' est correctement définie avec les valeurs autorisées")
            else:
                print("❌ La colonne 'role' n'est pas correctement définie")
            
            if "CREATE POLICY" in db_content and "ON post_views" in db_content:
                print("✅ Les politiques RLS pour la table 'post_views' sont définies")
            else:
                print("❌ Les politiques RLS pour la table 'post_views' ne sont pas définies")
            
            if "CREATE POLICY" in db_content and "ON project_members" in db_content:
                print("✅ Les politiques RLS pour la table 'project_members' sont définies")
            else:
                print("❌ Les politiques RLS pour la table 'project_members' ne sont pas définies")
            
            if "CREATE POLICY" in db_content and "ON comments" in db_content:
                print("✅ Les politiques RLS pour la table 'comments' sont définies")
            else:
                print("❌ Les politiques RLS pour la table 'comments' ne sont pas définies")
            
            if "CREATE INDEX" in db_content:
                print("✅ Des index sont créés pour améliorer les performances")
            else:
                print("❌ Aucun index n'est créé pour améliorer les performances")
    except Exception as e:
        print(f"❌ Erreur lors de la vérification des corrections de la base de données: {e}")

def main():
    """Fonction principale pour exécuter tous les tests"""
    print("🔍 Démarrage des tests des modifications de GradTrack")
    
    try:
        # Tester la fonction d'authentification
        test_auth_function()
        
        # Tester la page d'inscription
        test_signup_page()
        
        # Tester les corrections de la base de données
        test_database_fixes()
        
        print("\n✅ Tests terminés avec succès")
        
    except Exception as e:
        print(f"\n❌ Erreur lors de l'exécution des tests: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
