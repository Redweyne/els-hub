-- Add raw_ocr_row_json column to review_queue table
ALTER TABLE review_queue
ADD COLUMN raw_ocr_row_json jsonb;
