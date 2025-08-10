-- ============================================================================
-- RLS SYNC COMPLETION REPORT
-- Get final counts and comparison with local database
-- ============================================================================

DO $$
DECLARE
    final_rls_count INTEGER;
    final_policy_count INTEGER;
    rls_coverage NUMERIC;
    policy_coverage NUMERIC;
BEGIN
    SELECT COUNT(*) INTO final_rls_count 
    FROM pg_tables 
    WHERE schemaname = 'public' AND rowsecurity = true;
    
    SELECT COUNT(*) INTO final_policy_count 
    FROM pg_policies 
    WHERE schemaname = 'public';
    
    rls_coverage := round((final_rls_count::numeric / 95) * 100, 1);
    policy_coverage := round((final_policy_count::numeric / 245) * 100, 1);
    
    RAISE NOTICE '=== COMPREHENSIVE RLS SYNC COMPLETE ===';
    RAISE NOTICE 'Final RLS Enabled Tables: %', final_rls_count;
    RAISE NOTICE 'Final Total Policies: %', final_policy_count;
    RAISE NOTICE 'Local Target (RLS Tables): 95';
    RAISE NOTICE 'Local Target (Policies): 245+';
    RAISE NOTICE 'RLS Coverage: % percent', rls_coverage;
    RAISE NOTICE 'Policy Coverage: % percent', policy_coverage;
    
    IF final_rls_count >= 95 THEN
        RAISE NOTICE '✅ RLS TABLE COVERAGE: EXCELLENT (exceeded target)';
    ELSIF final_rls_count >= 80 THEN
        RAISE NOTICE '🟡 RLS TABLE COVERAGE: GOOD (close to target)';
    ELSE
        RAISE NOTICE '🔴 RLS TABLE COVERAGE: NEEDS IMPROVEMENT';
    END IF;
    
    IF final_policy_count >= 200 THEN
        RAISE NOTICE '✅ POLICY COVERAGE: EXCELLENT';
    ELSIF final_policy_count >= 150 THEN
        RAISE NOTICE '🟡 POLICY COVERAGE: GOOD';
    ELSE
        RAISE NOTICE '🔴 POLICY COVERAGE: BASIC (admin-only policies)';
    END IF;
END $$;