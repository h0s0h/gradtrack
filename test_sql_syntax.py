#!/usr/bin/env python3
# -*- coding: utf-8 -*-

"""
Script de test pour vérifier la syntaxe du script SQL corrigé
"""

import os
import sys
import re

def test_sql_syntax():
    """Vérifier la syntaxe du script SQL corrigé"""
    print("\n=== Test de la syntaxe du script SQL corrigé ===")
    
    # Vérifier le fichier database_fixes_corrected.sql
    sql_file_path = "/home/ubuntu/gradtrack/src/lib/supabase/database_fixes_corrected.sql"
    try:
        with open(sql_file_path, 'r') as f:
            sql_content = f.read()
            
            # Vérifier qu'il n'y a pas de "IF NOT EXISTS" dans les commandes CREATE POLICY
            create_policy_pattern = re.compile(r'CREATE\s+POLICY\s+IF\s+NOT\s+EXISTS', re.IGNORECASE)
            if create_policy_pattern.search(sql_content):
                print("❌ Le script contient encore des clauses 'IF NOT EXISTS' dans les commandes CREATE POLICY")
                for line_num, line in enumerate(sql_content.split('\n'), 1):
                    if create_policy_pattern.search(line):
                        print(f"  - Ligne {line_num}: {line.strip()}")
            else:
                print("✅ Aucune clause 'IF NOT EXISTS' trouvée dans les commandes CREATE POLICY")
            
            # Vérifier que les autres commandes CREATE TABLE et CREATE INDEX conservent "IF NOT EXISTS"
            create_table_pattern = re.compile(r'CREATE\s+TABLE\s+IF\s+NOT\s+EXISTS', re.IGNORECASE)
            create_index_pattern = re.compile(r'CREATE\s+INDEX\s+IF\s+NOT\s+EXISTS', re.IGNORECASE)
            
            if create_table_pattern.search(sql_content):
                print("✅ Les commandes CREATE TABLE conservent la clause 'IF NOT EXISTS'")
            else:
                print("⚠️ Les commandes CREATE TABLE ne contiennent pas la clause 'IF NOT EXISTS'")
            
            if create_index_pattern.search(sql_content):
                print("✅ Les commandes CREATE INDEX conservent la clause 'IF NOT EXISTS'")
            else:
                print("⚠️ Les commandes CREATE INDEX ne contiennent pas la clause 'IF NOT EXISTS'")
            
            # Vérifier la présence des éléments essentiels
            essential_elements = [
                ("CREATE TABLE", "✅ Le script contient des commandes CREATE TABLE", "❌ Le script ne contient pas de commandes CREATE TABLE"),
                ("CREATE POLICY", "✅ Le script contient des commandes CREATE POLICY", "❌ Le script ne contient pas de commandes CREATE POLICY"),
                ("CREATE INDEX", "✅ Le script contient des commandes CREATE INDEX", "❌ Le script ne contient pas de commandes CREATE INDEX"),
                ("CREATE OR REPLACE FUNCTION", "✅ Le script contient des fonctions", "❌ Le script ne contient pas de fonctions"),
                ("CREATE TRIGGER", "✅ Le script contient des triggers", "❌ Le script ne contient pas de triggers"),
                ("role TEXT DEFAULT 'student' CHECK", "✅ La colonne 'role' est correctement définie", "❌ La colonne 'role' n'est pas correctement définie")
            ]
            
            for pattern, success_msg, error_msg in essential_elements:
                if pattern in sql_content:
                    print(success_msg)
                else:
                    print(error_msg)
            
    except Exception as e:
        print(f"❌ Erreur lors de la vérification du script SQL: {e}")

def main():
    """Fonction principale pour exécuter tous les tests"""
    print("🔍 Démarrage des tests du script SQL corrigé")
    
    try:
        # Tester la syntaxe du script SQL
        test_sql_syntax()
        
        print("\n✅ Tests terminés")
        
    except Exception as e:
        print(f"\n❌ Erreur lors de l'exécution des tests: {e}")
        sys.exit(1)

if __name__ == "__main__":
    main()
