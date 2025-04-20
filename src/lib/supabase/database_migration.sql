-- Add cloudinary_image_id column to the projects table
ALTER TABLE projects ADD COLUMN IF NOT EXISTS cloudinary_image_id TEXT;

-- Add comment for the new column
COMMENT ON COLUMN projects.cloudinary_image_id IS 'معرف Cloudinary للصورة الخاصة بالمشروع'; 