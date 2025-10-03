-- Migration: Add order_index field to activities table for drag and drop functionality
-- This migration adds an order_index column to the activities table to enable reordering

-- Add order_index column to activities table
ALTER TABLE activities 
ADD COLUMN order_index INTEGER DEFAULT 0;

-- Create index for better performance when ordering activities
CREATE INDEX idx_activities_order_index ON activities(project_id, order_index);

-- Update existing activities to have proper order_index values
-- This will set order_index based on the current created_at order
UPDATE activities 
SET order_index = subquery.row_number - 1
FROM (
  SELECT id, ROW_NUMBER() OVER (PARTITION BY project_id ORDER BY created_at ASC) as row_number
  FROM activities
) AS subquery
WHERE activities.id = subquery.id;

-- Add comment to the column
COMMENT ON COLUMN activities.order_index IS 'Order index for drag and drop functionality within a project';
