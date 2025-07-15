-- Test if the migrations are actually applied
SELECT 
  'payment_gateway_fee_configs' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'payment_gateway_fee_configs'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
  'refund_retry_queue' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.tables 
    WHERE table_name = 'refund_retry_queue'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
  'payment_state column' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_transactions' AND column_name = 'payment_state'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
  'gateway_fee_amount column' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.columns 
    WHERE table_name = 'payment_transactions' AND column_name = 'gateway_fee_amount'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
  'backfill_payment_transaction_fees function' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.routines 
    WHERE routine_name = 'backfill_payment_transaction_fees'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status

UNION ALL

SELECT 
  'daily_gateway_fees view' as table_name,
  CASE WHEN EXISTS (
    SELECT 1 FROM information_schema.views 
    WHERE table_name = 'daily_gateway_fees'
  ) THEN 'EXISTS' ELSE 'MISSING' END as status;
