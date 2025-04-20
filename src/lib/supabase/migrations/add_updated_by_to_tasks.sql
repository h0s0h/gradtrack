-- Add updated_by column to tasks table
ALTER TABLE tasks ADD COLUMN updated_by UUID REFERENCES users(id);

-- Create an index on the updated_by column for better performance
CREATE INDEX idx_tasks_updated_by ON tasks(updated_by);

-- Update existing tasks to set updated_by equal to created_by 
-- (assuming that the creator is also the last updater for existing tasks)
UPDATE tasks SET updated_by = created_by WHERE updated_by IS NULL;

-- Add a comment to the column for documentation
COMMENT ON COLUMN tasks.updated_by IS 'User ID who last updated this task'; 