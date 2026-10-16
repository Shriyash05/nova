# Gate Status Log

## Gate — Phase C Iteration 1
| Agent | Role | Verdict | Source |
|---|---|---|---|
| worker_security_c1 | teamwork_preview_worker | DONE (build passed, 105/105 E2E) | handoff.md |
| reviewer_c1 | teamwork_preview_reviewer | APPROVE | handoff.md |
| reviewer_c2 | teamwork_preview_reviewer | REQUEST_CHANGES | handoff.md |
| challenger_c1 | teamwork_preview_challenger | REQUEST_CHANGES | handoff.md |
| challenger_c2 | teamwork_preview_challenger | APPROVE | handoff.md |
| auditor_c1 | teamwork_preview_auditor | CLEAN (Zero integrity violations) | handoff.md |

Gate Result: **FAIL** (reviewer_c2 REQUEST_CHANGES, challenger_c1 REQUEST_CHANGES)

### Specific Failure Reasons & Required Fixes:
1. **Critical IDOR in `user_devices` RLS policy**:
   `schema.sql` granted `INSERT ON user_devices TO authenticated` with `WITH CHECK (user_id = auth.uid())` without constraining `device_id`. This allows arbitrary device takeover via direct PostgREST calls, bypassing the 15-minute physical claim QR flow.
   **Fix**: Revoke `INSERT` on `user_devices` from `authenticated`. Device linking MUST only occur via authenticated server endpoints (`service_role`).
2. **Cryptographic Hash Shielding**:
   `GRANT SELECT ON devices TO authenticated` exposes `device_secret` and `bootstrap_hash`.
   **Fix**: Do not grant raw `devices` SELECT to `authenticated` or restrict access to a safe view/columns.
3. **Table Ownership Normalization & Migration Safety**:
   `postgres` vs `nova_app` split ownership causes `42501 must be owner of table` errors.
   **Fix**: Add table ownership transfer commands (`ALTER TABLE ... OWNER TO ...`) and `SET lock_timeout = '5s'`.
4. **Supabase Pooler CA Support in `api/index.ts`**:
   Document `DATABASE_SSL_CA` in `.env.example` and ensure certificate validation gracefully handles custom Supabase root CAs without falling back to insecure `rejectUnauthorized: false`.


## Gate — Phase C Iteration 2
| Agent | Role | Verdict | Source |
|---|---|---|---|
| worker_security_c2 | teamwork_preview_worker | DONE (build passed, 105/105 E2E, V1-V7 pass) | handoff.md |
| reviewer_c3 | teamwork_preview_reviewer | APPROVE | handoff.md |
| challenger_c3 | teamwork_preview_challenger | APPROVE | handoff.md |
| auditor_c2 | teamwork_preview_auditor | CLEAN (Zero integrity violations) | handoff.md |

Gate Result: **PASS** (All criteria satisfied: 100% tests pass, Reviewer APPROVE, Challenger APPROVE, Auditor CLEAN)
- `user_devices` IDOR eliminated: `REVOKE INSERT ON user_devices FROM authenticated` genuine and verified.
- Cryptographic hashes shielded: `user_visible_devices` view strictly shields `device_secret` and `bootstrap_hash`.
- Table ownership normalized to `postgres` and `SET lock_timeout = '5s'` active.
- Supabase Root 2021 CA certificate bundled and `parseSslCa()` verified with strict TLS.
