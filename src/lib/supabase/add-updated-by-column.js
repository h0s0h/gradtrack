// Script to add updated_by column to tasks table
import { createClient } from '@supabase/supabase-js';

// Initialize Supabase client (use environment variables in production)
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY; // Use service role key for schema changes
const supabase = createClient(supabaseUrl, supabaseKey);

async function addUpdatedByColumn() {
  try {
    // Execute the SQL query to add the column
    const { error: columnError } = await supabase.rpc('execute_sql', {
      query: `ALTER TABLE tasks ADD COLUMN IF NOT EXISTS updated_by UUID REFERENCES users(id);`
    });
    
    if (columnError) throw columnError;
    console.log('✅ Added updated_by column to tasks table');

    // Create an index on the updated_by column
    const { error: indexError } = await supabase.rpc('execute_sql', {
      query: `CREATE INDEX IF NOT EXISTS idx_tasks_updated_by ON tasks(updated_by);`
    });
    
    if (indexError) throw indexError;
    console.log('✅ Created index on updated_by column');

    // Update existing tasks to set updated_by equal to created_by
    const { error: updateError } = await supabase.rpc('execute_sql', {
      query: `UPDATE tasks SET updated_by = created_by WHERE updated_by IS NULL;`
    });
    
    if (updateError) throw updateError;
    console.log('✅ Updated existing tasks with created_by values');

    // Add comment to column
    const { error: commentError } = await supabase.rpc('execute_sql', {
      query: `COMMENT ON COLUMN tasks.updated_by IS 'User ID who last updated this task';`
    });
    
    if (commentError) throw commentError;
    console.log('✅ Added comment to updated_by column');

    console.log('✅ All operations completed successfully');
  } catch (error) {
    console.error('❌ Error adding updated_by column:', error);
  }
}

// Run the function
addUpdatedByColumn();

// To run this script: node src/lib/supabase/add-updated-by-column.js 