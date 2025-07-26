-- Queue Logging Tables for Cloudflare D1
-- These tables track queue performance and debugging

-- 1. Queue Processing Logs
CREATE TABLE IF NOT EXISTS queue_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  status TEXT NOT NULL CHECK (status IN ('queued', 'processing', 'completed', 'failed')),
  processing_time_ms INTEGER,
  attempt_number INTEGER DEFAULT 1,
  error_message TEXT,
  created_at INTEGER DEFAULT (unixepoch()),
  updated_at INTEGER DEFAULT (unixepoch()),
  
  INDEX idx_message_id (message_id),
  INDEX idx_type (message_type),
  INDEX idx_status (status),
  INDEX idx_created (created_at)
);

-- 2. Queue Failures (Dead Letter Queue tracking)
CREATE TABLE IF NOT EXISTS queue_failures (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT NOT NULL,
  message_type TEXT NOT NULL,
  message_body TEXT, -- JSON
  error TEXT NOT NULL,
  failed_attempts INTEGER DEFAULT 1,
  failed_at INTEGER DEFAULT (unixepoch()),
  last_retry_at INTEGER,
  
  INDEX idx_message_type (message_type),
  INDEX idx_failed_at (failed_at)
);

-- 3. Email Logs (specific to email messages)
CREATE TABLE IF NOT EXISTS email_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT,
  order_id TEXT,
  quote_id TEXT,
  email_type TEXT NOT NULL CHECK (email_type IN ('order_confirmation', 'quote_ready', 'payment_received', 'shipping_update')),
  recipient TEXT NOT NULL,
  subject TEXT,
  status TEXT NOT NULL CHECK (status IN ('queued', 'sent', 'delivered', 'bounced', 'failed')),
  external_id TEXT, -- SendGrid message ID, etc.
  sent_at INTEGER DEFAULT (unixepoch()),
  delivered_at INTEGER,
  error_message TEXT,
  
  INDEX idx_email_type (email_type),
  INDEX idx_recipient (recipient),
  INDEX idx_order_id (order_id),
  INDEX idx_quote_id (quote_id),
  INDEX idx_status (status)
);

-- 4. Webhook Logs
CREATE TABLE IF NOT EXISTS webhook_logs (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  message_id TEXT,
  webhook_url TEXT NOT NULL,
  event_type TEXT NOT NULL,
  payload TEXT, -- JSON
  status_code INTEGER,
  response_body TEXT,
  attempt_number INTEGER DEFAULT 1,
  created_at INTEGER DEFAULT (unixepoch()),
  completed_at INTEGER,
  
  INDEX idx_event_type (event_type),
  INDEX idx_status_code (status_code),
  INDEX idx_created (created_at)
);

-- 5. Analytics Events Buffer (before sending to external services)
CREATE TABLE IF NOT EXISTS analytics_events (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  event TEXT NOT NULL,
  properties TEXT, -- JSON
  user_id TEXT,
  session_id TEXT,
  timestamp INTEGER DEFAULT (unixepoch()),
  processed BOOLEAN DEFAULT FALSE,
  
  INDEX idx_event (event),
  INDEX idx_user_id (user_id),
  INDEX idx_processed (processed),
  INDEX idx_timestamp (timestamp)
);

-- 6. Queue Performance Metrics (aggregated)
CREATE TABLE IF NOT EXISTS queue_metrics (
  id TEXT PRIMARY KEY DEFAULT (lower(hex(randomblob(16)))),
  metric_name TEXT NOT NULL,
  metric_value REAL NOT NULL,
  metric_data TEXT, -- JSON for additional data
  time_bucket TEXT NOT NULL, -- 'hour', 'day', 'week'
  bucket_start INTEGER NOT NULL,
  bucket_end INTEGER NOT NULL,
  
  INDEX idx_metric_name (metric_name),
  INDEX idx_time_bucket (time_bucket, bucket_start)
);

-- Triggers to update timestamps
CREATE TRIGGER IF NOT EXISTS update_queue_logs_timestamp 
  AFTER UPDATE ON queue_logs
BEGIN
  UPDATE queue_logs SET updated_at = unixepoch() WHERE id = NEW.id;
END;

-- Views for common queries
CREATE VIEW IF NOT EXISTS recent_queue_activity AS
SELECT 
  message_type,
  status,
  COUNT(*) as count,
  AVG(processing_time_ms) as avg_processing_time,
  MAX(created_at) as last_seen
FROM queue_logs 
WHERE created_at > (unixepoch() - 3600) -- Last hour
GROUP BY message_type, status;

CREATE VIEW IF NOT EXISTS failed_messages_summary AS
SELECT 
  message_type,
  COUNT(*) as failure_count,
  COUNT(DISTINCT message_id) as unique_failures,
  MIN(failed_at) as first_failure,
  MAX(failed_at) as last_failure
FROM queue_failures
WHERE failed_at > (unixepoch() - 86400) -- Last 24 hours
GROUP BY message_type;

CREATE VIEW IF NOT EXISTS email_delivery_stats AS
SELECT 
  email_type,
  COUNT(*) as total_sent,
  COUNT(CASE WHEN status = 'delivered' THEN 1 END) as delivered,
  COUNT(CASE WHEN status = 'bounced' THEN 1 END) as bounced,
  COUNT(CASE WHEN status = 'failed' THEN 1 END) as failed,
  ROUND(COUNT(CASE WHEN status = 'delivered' THEN 1 END) * 100.0 / COUNT(*), 2) as delivery_rate
FROM email_logs
WHERE sent_at > (unixepoch() - 86400) -- Last 24 hours
GROUP BY email_type;

-- Cleanup old logs (run periodically)
-- Keep only last 30 days of logs for performance
CREATE INDEX IF NOT EXISTS idx_queue_logs_cleanup ON queue_logs(created_at) 
WHERE created_at < (unixepoch() - 2592000); -- 30 days ago

CREATE INDEX IF NOT EXISTS idx_email_logs_cleanup ON email_logs(sent_at) 
WHERE sent_at < (unixepoch() - 2592000); -- 30 days ago

-- Sample data for testing (optional)
INSERT OR IGNORE INTO queue_metrics (metric_name, metric_value, time_bucket, bucket_start, bucket_end)
VALUES 
  ('messages_processed_per_hour', 0, 'hour', unixepoch(), unixepoch() + 3600),
  ('avg_processing_time_ms', 0, 'hour', unixepoch(), unixepoch() + 3600),
  ('failure_rate_percent', 0, 'hour', unixepoch(), unixepoch() + 3600);