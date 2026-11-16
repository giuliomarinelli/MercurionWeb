-- Sola lettura. Eseguire dopo ROLLBACK nel Query Tool che ha fallito.
SELECT a.pid, a.application_name, a.state, a.xact_start,
       a.wait_event_type, a.wait_event,
       string_agg(DISTINCT c.relname || ': ' || l.mode, ', ')
         FILTER (WHERE n.nspname='public' AND l.granted) AS lock_tabelle
FROM pg_stat_activity a
LEFT JOIN pg_locks l ON l.pid=a.pid
LEFT JOIN pg_class c ON c.oid=l.relation
LEFT JOIN pg_namespace n ON n.oid=c.relnamespace
WHERE a.datname=current_database()
 AND a.pid<>pg_backend_pid() AND a.xact_start IS NOT NULL
GROUP BY a.pid,a.application_name,a.state,a.xact_start,a.wait_event_type,a.wait_event
ORDER BY a.xact_start;
