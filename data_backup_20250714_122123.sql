SET session_replication_role = replica;

--
-- PostgreSQL database dump
--

-- Dumped from database version 17.4
-- Dumped by pg_dump version 17.4

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET transaction_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: audit_log_entries; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") FROM stdin;
00000000-0000-0000-0000-000000000000	9a9abd10-3240-4b37-8da5-01bb1ad4b750	{"action":"user_confirmation_requested","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}	2025-07-12 15:36:40.211505+00	
00000000-0000-0000-0000-000000000000	5f2ff158-5306-4f7e-b64b-ff96c561029f	{"action":"user_signedup","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}	2025-07-12 15:36:58.780725+00	
00000000-0000-0000-0000-000000000000	8c967d6f-8b95-4a78-84da-75a7fa0274ac	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-12 16:38:56.396534+00	
00000000-0000-0000-0000-000000000000	14a7f272-c826-424d-8d42-5c598c9cede5	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-12 16:38:56.400645+00	
00000000-0000-0000-0000-000000000000	d6e78203-a879-4868-9a02-9ff38049514a	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-12 17:40:01.998017+00	
00000000-0000-0000-0000-000000000000	f2fd018a-d660-460d-bd09-163f716016b1	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-12 17:40:02.009968+00	
00000000-0000-0000-0000-000000000000	2cf94219-6143-412c-b460-bec96439b706	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 08:48:24.811365+00	
00000000-0000-0000-0000-000000000000	5009243a-ccf3-4633-bd1b-1f4725ed6aee	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 08:48:24.820468+00	
00000000-0000-0000-0000-000000000000	a3bcb2f2-612c-41ae-bfd1-8d0981038629	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 10:41:37.159693+00	
00000000-0000-0000-0000-000000000000	28ff6c7d-ec1a-47fe-ab59-c79284c37811	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 10:41:37.166991+00	
00000000-0000-0000-0000-000000000000	01cd53ca-2b56-4a11-b5b5-1d94306f1f3b	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 12:21:18.816972+00	
00000000-0000-0000-0000-000000000000	49e5c49d-6e14-471d-a447-824d91d8fbe4	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 12:21:18.823653+00	
00000000-0000-0000-0000-000000000000	c3c21312-c93e-4f80-b517-333e17e42669	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 14:08:07.361714+00	
00000000-0000-0000-0000-000000000000	c9731e7c-8b2a-4d2e-a3a2-dc34041a613e	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 14:08:07.368206+00	
00000000-0000-0000-0000-000000000000	5a517f58-fd14-4844-8ae3-aae52a2a4a3a	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 15:06:09.434752+00	
00000000-0000-0000-0000-000000000000	7fa3eb56-795d-44b9-ba62-b9c3853d8d17	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 15:06:09.444267+00	
00000000-0000-0000-0000-000000000000	4eb63456-9cc3-4d59-a215-658ec379eb10	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 16:04:39.199422+00	
00000000-0000-0000-0000-000000000000	ea783ca1-0474-4371-8c02-592dfca2aa06	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 16:04:39.207209+00	
00000000-0000-0000-0000-000000000000	0f3794c8-ad18-42bb-a7df-4e8cb0a6db9f	{"action":"login","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}	2025-07-13 16:59:40.713981+00	
00000000-0000-0000-0000-000000000000	1dc9a942-5d08-4e2d-8a14-468568a780ce	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 17:23:18.414781+00	
00000000-0000-0000-0000-000000000000	826a37e3-9e46-4e0d-9fae-ab0d136ac1e2	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 17:23:18.420922+00	
00000000-0000-0000-0000-000000000000	fe704519-66da-4062-a2da-18159fb83cda	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 17:57:56.371624+00	
00000000-0000-0000-0000-000000000000	0793a7c4-5f55-41d1-beb7-b15b3330d018	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 17:57:56.380892+00	
00000000-0000-0000-0000-000000000000	7cf3d00d-a690-4c95-b76f-de4cb5da41bf	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 18:56:01.480214+00	
00000000-0000-0000-0000-000000000000	8af503d1-018d-42c7-abb0-8f46f0379988	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 18:56:01.488225+00	
00000000-0000-0000-0000-000000000000	9579b25c-b268-4144-8aff-d39ef5520841	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 19:55:54.640744+00	
00000000-0000-0000-0000-000000000000	66dd68ad-6dfc-42ee-9acd-6efd0d72f869	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 19:55:54.646302+00	
00000000-0000-0000-0000-000000000000	a9e3cbd0-9eae-47dc-81a8-3d5bad84745a	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 20:54:20.51499+00	
00000000-0000-0000-0000-000000000000	ef1fe75f-947b-46ed-93e8-8d787c2adf65	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-13 20:54:20.520067+00	
00000000-0000-0000-0000-000000000000	8ca92180-a2df-4dff-a52a-05a004a4c787	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 01:00:28.259708+00	
00000000-0000-0000-0000-000000000000	224a4df9-78ad-4cbb-84e1-efdd2d51fe74	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 01:00:28.277921+00	
00000000-0000-0000-0000-000000000000	3a4f9f4c-68da-4e72-a5d9-da333d174caf	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 01:58:58.765956+00	
00000000-0000-0000-0000-000000000000	3c421093-d872-4b5d-84c4-f1b5f2e7e2b5	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 01:58:58.771218+00	
00000000-0000-0000-0000-000000000000	91ff69c2-2041-468d-999c-4541cf8746c1	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 01:59:30.576264+00	
00000000-0000-0000-0000-000000000000	348e2af1-e90c-451e-b8e5-211489b3fd16	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 01:59:30.577846+00	
00000000-0000-0000-0000-000000000000	706d5d07-2e07-4d8b-bf44-ccd8c657f715	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 02:57:12.058859+00	
00000000-0000-0000-0000-000000000000	13516a39-23d3-4921-b2d2-7e4613262658	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 02:57:12.069534+00	
00000000-0000-0000-0000-000000000000	daa9fa0d-8095-47d3-809a-70bcc2d243ae	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 02:58:11.580032+00	
00000000-0000-0000-0000-000000000000	9b90f2a1-cb21-4826-ae0e-70260c221d61	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 02:58:11.581327+00	
00000000-0000-0000-0000-000000000000	64acf951-a799-4c4b-8dd5-0edf5fd7302e	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 03:55:58.340835+00	
00000000-0000-0000-0000-000000000000	87fc730f-3e77-400d-b303-67db0b30aaab	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 03:55:58.349218+00	
00000000-0000-0000-0000-000000000000	28b3ab3f-b6df-470f-8e4f-b0919e2886c6	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 03:56:46.00377+00	
00000000-0000-0000-0000-000000000000	e4b5b80c-eb70-4cde-9fd9-10e9ce5e8e88	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 03:56:46.004397+00	
00000000-0000-0000-0000-000000000000	6ef58d03-16c5-46d5-a0eb-32d5245c53bc	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 04:55:16.288211+00	
00000000-0000-0000-0000-000000000000	0e03c1cb-45ee-4dfb-8e86-07997e09be01	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 04:55:16.293032+00	
00000000-0000-0000-0000-000000000000	ab2c5160-49b1-4548-8177-cdf538b51f1a	{"action":"token_refreshed","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 05:53:53.355295+00	
00000000-0000-0000-0000-000000000000	fb91e631-3ebd-4545-be5a-0d805e44ee45	{"action":"token_revoked","actor_id":"130ec316-970f-429f-8cb8-ff9adf751248","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}	2025-07-14 05:53:53.362595+00	
\.


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."flow_state" ("id", "user_id", "auth_code", "code_challenge_method", "code_challenge", "provider_type", "provider_access_token", "provider_refresh_token", "created_at", "updated_at", "authentication_method", "auth_code_issued_at") FROM stdin;
\.


--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") FROM stdin;
00000000-0000-0000-0000-000000000000	130ec316-970f-429f-8cb8-ff9adf751248	authenticated	authenticated	iwbtracking@gmail.com	$2a$10$seSy.YDf17winyRt.tA9Ze8l/eaOAa5ZCW.oTAoA.Y8tTS8E8K6jm	2025-07-12 15:36:58.783098+00	\N		2025-07-12 15:36:40.215038+00		\N			\N	2025-07-13 16:59:40.723864+00	{"provider": "email", "providers": ["email"]}	{"sub": "130ec316-970f-429f-8cb8-ff9adf751248", "name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "email_verified": true, "phone_verified": false}	\N	2025-07-12 15:36:40.166324+00	2025-07-14 05:53:53.372059+00	\N	\N			\N		0	\N		\N	f	\N	f
\.


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") FROM stdin;
130ec316-970f-429f-8cb8-ff9adf751248	130ec316-970f-429f-8cb8-ff9adf751248	{"sub": "130ec316-970f-429f-8cb8-ff9adf751248", "name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "email_verified": true, "phone_verified": false}	email	2025-07-12 15:36:40.204531+00	2025-07-12 15:36:40.204595+00	2025-07-12 15:36:40.204595+00	961b5c81-b00d-436e-a812-be1c29cffaba
\.


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."instances" ("id", "uuid", "raw_base_config", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") FROM stdin;
c6137045-297b-4085-a3bc-4cac8d320c52	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 16:59:40.723964+00	2025-07-14 03:55:58.370228+00	\N	aal1	\N	2025-07-14 03:55:58.369576	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	27.34.64.219	\N
2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-12 15:36:58.789578+00	2025-07-14 05:53:53.376417+00	\N	aal1	\N	2025-07-14 05:53:53.376306	Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36	27.34.67.6	\N
\.


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") FROM stdin;
2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb	2025-07-12 15:36:58.807932+00	2025-07-12 15:36:58.807932+00	otp	63df2305-93af-4979-a0dd-f759fd86e5b9
c6137045-297b-4085-a3bc-4cac8d320c52	2025-07-13 16:59:40.739468+00	2025-07-13 16:59:40.739468+00	password	5231e542-1313-4256-966a-3fe3d4ac2752
\.


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_factors" ("id", "user_id", "friendly_name", "factor_type", "status", "created_at", "updated_at", "secret", "phone", "last_challenged_at", "web_authn_credential", "web_authn_aaguid") FROM stdin;
\.


--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."mfa_challenges" ("id", "factor_id", "created_at", "verified_at", "ip_address", "otp_code", "web_authn_session_data") FROM stdin;
\.


--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."one_time_tokens" ("id", "user_id", "token_type", "token_hash", "relates_to", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") FROM stdin;
00000000-0000-0000-0000-000000000000	73	xzatm26setzz	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-12 15:36:58.796083+00	2025-07-12 16:38:56.402225+00	\N	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	74	6fqao7l3ktf7	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-12 16:38:56.404268+00	2025-07-12 17:40:02.010588+00	xzatm26setzz	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	75	gno3kwsv6mq5	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-12 17:40:02.013618+00	2025-07-13 08:48:24.821131+00	6fqao7l3ktf7	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	76	qhu42gpj2ews	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 08:48:24.830102+00	2025-07-13 10:41:37.16763+00	gno3kwsv6mq5	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	77	d36wcq6aylze	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 10:41:37.173401+00	2025-07-13 12:21:18.824234+00	qhu42gpj2ews	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	78	xlwuhyuswh4r	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 12:21:18.827881+00	2025-07-13 14:08:07.368884+00	d36wcq6aylze	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	79	klzqepjmxy7l	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 14:08:07.375211+00	2025-07-13 15:06:09.444874+00	xlwuhyuswh4r	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	80	xxle5hhkwova	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 15:06:09.449301+00	2025-07-13 16:04:39.208413+00	klzqepjmxy7l	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	81	xn2jcenst2e6	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 16:04:39.2192+00	2025-07-13 17:23:18.421554+00	xxle5hhkwova	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	82	47drs4qisaz4	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 16:59:40.733969+00	2025-07-13 17:57:56.381532+00	\N	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	84	pgeegxcsnviq	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 17:57:56.386257+00	2025-07-13 18:56:01.490493+00	47drs4qisaz4	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	85	eelbx2gtkbmy	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 18:56:01.498102+00	2025-07-13 19:55:54.646883+00	pgeegxcsnviq	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	86	dxkwwmo24eop	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 19:55:54.65282+00	2025-07-13 20:54:20.520641+00	eelbx2gtkbmy	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	87	kj7qhpyjal6e	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 20:54:20.525236+00	2025-07-14 01:00:28.278667+00	dxkwwmo24eop	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	88	oaj7u7pucpog	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-14 01:00:28.296177+00	2025-07-14 01:58:58.772604+00	kj7qhpyjal6e	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	83	377zr6lk6xuw	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-13 17:23:18.427958+00	2025-07-14 01:59:30.57851+00	xn2jcenst2e6	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	89	3llnpunjdift	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-14 01:58:58.777151+00	2025-07-14 02:57:12.070701+00	oaj7u7pucpog	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	90	vsempkxuyxqa	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-14 01:59:30.578895+00	2025-07-14 02:58:11.58187+00	377zr6lk6xuw	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	91	vb4or4gxk5q5	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-14 02:57:12.081561+00	2025-07-14 03:55:58.350658+00	3llnpunjdift	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	93	wkz3pegdspdm	130ec316-970f-429f-8cb8-ff9adf751248	f	2025-07-14 03:55:58.35939+00	2025-07-14 03:55:58.35939+00	vb4or4gxk5q5	c6137045-297b-4085-a3bc-4cac8d320c52
00000000-0000-0000-0000-000000000000	92	rg2pr262oz46	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-14 02:58:11.583282+00	2025-07-14 03:56:46.00494+00	vsempkxuyxqa	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	94	ynevnumaevfb	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-14 03:56:46.005919+00	2025-07-14 04:55:16.293606+00	rg2pr262oz46	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	95	yi4xhfnzsmr7	130ec316-970f-429f-8cb8-ff9adf751248	t	2025-07-14 04:55:16.302815+00	2025-07-14 05:53:53.363214+00	ynevnumaevfb	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
00000000-0000-0000-0000-000000000000	96	tbygg2z2ftg7	130ec316-970f-429f-8cb8-ff9adf751248	f	2025-07-14 05:53:53.369428+00	2025-07-14 05:53:53.369428+00	yi4xhfnzsmr7	2e32c3e6-8a6b-4f9a-adcc-75a423b68aeb
\.


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_providers" ("id", "resource_id", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_providers" ("id", "sso_provider_id", "entity_id", "metadata_xml", "metadata_url", "attribute_mapping", "created_at", "updated_at", "name_id_format") FROM stdin;
\.


--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."saml_relay_states" ("id", "sso_provider_id", "request_id", "for_email", "redirect_to", "created_at", "updated_at", "flow_state_id") FROM stdin;
\.


--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

COPY "auth"."sso_domains" ("id", "sso_provider_id", "domain", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: authenticated_checkout_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."authenticated_checkout_sessions" ("id", "session_token", "user_id", "quote_ids", "temporary_shipping_address", "payment_currency", "payment_method", "payment_amount", "status", "expires_at", "created_at", "updated_at") FROM stdin;
edc7b968-268c-427d-b890-2b935a78a28e	cs_1752334759005_yyf2rtjth	130ec316-970f-429f-8cb8-ff9adf751248	{737e30f3-b621-4b04-a6f2-ffd0fa7c4be5}	\N	INR	payu	730.08	active	2025-07-12 17:39:19.005+00	2025-07-12 15:39:19.087275+00	2025-07-12 15:39:19.087275+00
43ed8451-c128-4cd0-aabf-0a449acbccb8	cs_1752334897267_tjrclzdji	130ec316-970f-429f-8cb8-ff9adf751248	{737e30f3-b621-4b04-a6f2-ffd0fa7c4be5}	\N	INR	payu	730.08	active	2025-07-12 17:41:37.267+00	2025-07-12 15:41:37.364896+00	2025-07-12 15:41:37.364896+00
d1b40a16-577e-4f2f-ac66-4d202865ea0f	cs_1752334957602_8gttweyci	130ec316-970f-429f-8cb8-ff9adf751248	{737e30f3-b621-4b04-a6f2-ffd0fa7c4be5}	\N	INR	payu	730.08	active	2025-07-12 17:42:37.602+00	2025-07-12 15:42:38.039368+00	2025-07-12 15:42:38.039368+00
153897e4-6a36-4ea7-92ac-c0ce735484dd	cs_1752335268248_k8apy2us3	130ec316-970f-429f-8cb8-ff9adf751248	{737e30f3-b621-4b04-a6f2-ffd0fa7c4be5}	\N	INR	payu	730.08	active	2025-07-12 17:47:48.248+00	2025-07-12 15:47:48.345457+00	2025-07-12 15:47:48.345457+00
58ba30a5-48a0-44f2-98ca-2c424683bdc0	cs_1752335430291_p0mlyp2tv	130ec316-970f-429f-8cb8-ff9adf751248	{737e30f3-b621-4b04-a6f2-ffd0fa7c4be5}	\N	INR	payu	730.08	active	2025-07-12 17:50:30.291+00	2025-07-12 15:50:30.371464+00	2025-07-12 15:50:30.371464+00
831ab83c-b101-4bc0-9a1b-2a0ca7a68abc	cs_1752335577392_8q85q4o0j	130ec316-970f-429f-8cb8-ff9adf751248	{737e30f3-b621-4b04-a6f2-ffd0fa7c4be5}	\N	INR	bank_transfer	730.08	active	2025-07-12 17:52:57.392+00	2025-07-12 15:52:57.48822+00	2025-07-12 15:52:57.48822+00
8c504356-d62d-4594-83c3-711d414c00bd	cs_1752335657813_c7vz92b1v	130ec316-970f-429f-8cb8-ff9adf751248	{60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	payu	617.14	active	2025-07-12 17:54:17.813+00	2025-07-12 15:54:17.912376+00	2025-07-12 15:54:17.912376+00
bd5bd3d7-e8c1-4291-9e68-e18b38d2a267	cs_1752335869073_zrm37yfvx	130ec316-970f-429f-8cb8-ff9adf751248	{60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	payu	617.14	active	2025-07-12 17:57:49.073+00	2025-07-12 15:57:49.178457+00	2025-07-12 15:57:49.178457+00
6359db56-5178-456e-9a34-0a61307d40b9	cs_1752336270048_2a1x85u29	130ec316-970f-429f-8cb8-ff9adf751248	{60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	payu	617.14	active	2025-07-12 18:04:30.048+00	2025-07-12 16:04:30.159705+00	2025-07-12 16:04:30.159705+00
2ce9f75e-aae9-48d4-8939-7afac9dfe467	cs_1752336603119_dc5xlinv1	130ec316-970f-429f-8cb8-ff9adf751248	{60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	payu	617.14	active	2025-07-12 18:10:03.119+00	2025-07-12 16:10:03.198631+00	2025-07-12 16:10:03.198631+00
40c07d6b-53b7-4fba-a73c-1e042be9ad0e	cs_1752336926372_a17yg7krq	130ec316-970f-429f-8cb8-ff9adf751248	{60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	payu	617.14	active	2025-07-12 18:15:26.372+00	2025-07-12 16:15:26.448167+00	2025-07-12 16:15:26.448167+00
c9f6ca0f-5e3f-458d-bd14-0a542d13eb1b	cs_1752337301156_rf3j0e760	130ec316-970f-429f-8cb8-ff9adf751248	{e0f78c9b-f302-40f9-9e71-6df52597bd00,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	payu	2375.10	active	2025-07-12 18:21:41.156+00	2025-07-12 16:21:41.216644+00	2025-07-12 16:21:41.216644+00
6b3d1a47-3ff1-421c-8cd3-8139c8fe777a	cs_1752339088429_v2vxykd3d	130ec316-970f-429f-8cb8-ff9adf751248	{e0f78c9b-f302-40f9-9e71-6df52597bd00,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	payu	2375.10	active	2025-07-12 18:51:28.429+00	2025-07-12 16:51:28.545044+00	2025-07-12 16:51:28.545044+00
f478a2da-fa79-4fef-b22e-adcb37ed6a70	cs_1752409392084_sz9rivj5o	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 14:23:12.084+00	2025-07-13 12:23:12.146223+00	2025-07-13 12:23:12.146223+00
b3ee26df-c5f2-4eea-b44d-d1b7dd3c8e38	cs_1752415700883_sqmmdbwxv	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:08:20.883+00	2025-07-13 14:08:20.948915+00	2025-07-13 14:08:20.948915+00
dac71620-5de4-46a9-a89a-298f3983612b	cs_1752415972282_hkdnbe2om	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:12:52.282+00	2025-07-13 14:12:52.351431+00	2025-07-13 14:12:52.351431+00
c8bb7b4e-61da-4900-8fce-25ee92c4a53e	cs_1752416182592_yoct7mry7	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:16:22.592+00	2025-07-13 14:16:22.649811+00	2025-07-13 14:16:22.649811+00
9465cc64-dc0e-40ed-a449-a73fc5002c42	cs_1752416242442_ajaekg44n	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:17:22.443+00	2025-07-13 14:17:22.486906+00	2025-07-13 14:17:22.486906+00
021bbc16-3920-44a3-90dc-cf3490cf9a33	cs_1752416663554_vnxpjt5wh	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:24:23.554+00	2025-07-13 14:24:23.654588+00	2025-07-13 14:24:23.654588+00
ba000ae4-b164-460b-b3de-bf6f099d2336	cs_1752416709412_k84j4b0nh	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:25:09.412+00	2025-07-13 14:25:09.487533+00	2025-07-13 14:25:09.487533+00
294af9d6-ad6e-40e9-9b21-8e4102c12998	cs_1752416796660_3n4r5sgr9	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:26:36.66+00	2025-07-13 14:26:36.746553+00	2025-07-13 14:26:36.746553+00
2134d965-a679-472f-9870-97ee3581f7c2	cs_1752416815923_q41n4mjik	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41,60db8bed-178d-471c-a9ba-86109767fe96}	\N	INR	bank_transfer	1234.28	active	2025-07-13 16:26:55.923+00	2025-07-13 14:26:56.005613+00	2025-07-13 14:26:56.005613+00
35991f1a-80f4-4ffa-bdba-57c14f95ce1a	cs_1752416889427_zgob67lww	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	bank_transfer	617.14	active	2025-07-13 16:28:09.427+00	2025-07-13 14:28:09.499433+00	2025-07-13 14:28:09.499433+00
b11fc794-2210-4c6b-bea0-e1cd9145d844	cs_1752416977187_wtq7dscll	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	payu	617.14	active	2025-07-13 16:29:37.188+00	2025-07-13 14:29:37.608036+00	2025-07-13 14:29:37.608036+00
38ac6699-041d-4309-8ff4-c1eea0046784	cs_1752418807512_2hmfu1ps4	130ec316-970f-429f-8cb8-ff9adf751248	{ba562ce0-17e9-4b1b-b0f2-0ba621209611,0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	bank_transfer	1234.28	active	2025-07-13 17:00:07.512+00	2025-07-13 15:00:07.583581+00	2025-07-13 15:00:07.583581+00
99976b07-608d-47f8-bfdb-83fc090c6f4d	cs_1752419021065_tjt298r9f	130ec316-970f-429f-8cb8-ff9adf751248	{ba562ce0-17e9-4b1b-b0f2-0ba621209611,0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	bank_transfer	1234.28	active	2025-07-13 17:03:41.066+00	2025-07-13 15:03:41.118845+00	2025-07-13 15:03:41.118845+00
a34f7b1a-8dba-46d9-9759-c44f04cc0f60	cs_1752419212029_4l464qxns	130ec316-970f-429f-8cb8-ff9adf751248	{ba562ce0-17e9-4b1b-b0f2-0ba621209611,0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	bank_transfer	1234.28	active	2025-07-13 17:06:52.029+00	2025-07-13 15:06:52.08988+00	2025-07-13 15:06:52.08988+00
28e841b9-20a1-4a90-bffc-87746edad8d4	cs_1752419216970_x78tjplnu	130ec316-970f-429f-8cb8-ff9adf751248	{ba562ce0-17e9-4b1b-b0f2-0ba621209611,0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	payu	1234.28	active	2025-07-13 17:06:56.97+00	2025-07-13 15:06:57.030311+00	2025-07-13 15:06:57.030311+00
923475b3-05a1-4796-8d91-7f0dc3bc3e41	cs_1752419283893_jizws0vps	130ec316-970f-429f-8cb8-ff9adf751248	{ba562ce0-17e9-4b1b-b0f2-0ba621209611,0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	bank_transfer	1234.28	active	2025-07-13 17:08:03.893+00	2025-07-13 15:08:03.977526+00	2025-07-13 15:08:03.977526+00
25c6efab-6c00-46b8-bb23-c7f9bd16ed20	cs_1752419309369_3fhildul2	130ec316-970f-429f-8cb8-ff9adf751248	{0a962e66-aa01-4039-8636-e7d3be7bdf41}	\N	INR	bank_transfer	617.14	active	2025-07-13 17:08:29.369+00	2025-07-13 15:08:29.412124+00	2025-07-13 15:08:29.412124+00
196e8836-c4b4-4504-8578-67607fa88fea	cs_1752419723170_q01sq45qb	130ec316-970f-429f-8cb8-ff9adf751248	{4773a891-5726-4168-ad24-13d0b30f0a3e}	\N	INR	bank_transfer	617.14	active	2025-07-13 17:15:23.17+00	2025-07-13 15:15:23.225907+00	2025-07-13 15:15:23.225907+00
5f8d6b35-ba37-43ad-b82a-9adbf535b230	cs_1752420545514_pcyfurst7	130ec316-970f-429f-8cb8-ff9adf751248	{38cafd36-e142-455b-a6e8-13fded5c10d9}	\N	INR	bank_transfer	617.14	active	2025-07-13 17:29:05.514+00	2025-07-13 15:29:05.552698+00	2025-07-13 15:29:05.552698+00
051ad3ab-5e5d-4dd3-b958-c1becd796429	cs_1752420618723_i2jf01ryh	130ec316-970f-429f-8cb8-ff9adf751248	{ba562ce0-17e9-4b1b-b0f2-0ba621209611}	\N	INR	payu	617.14	active	2025-07-13 17:30:18.723+00	2025-07-13 15:30:18.762178+00	2025-07-13 15:30:18.762178+00
d79b7ab6-429a-4438-8340-f5e3ee7603e0	cs_1752420746332_9812ggbzy	130ec316-970f-429f-8cb8-ff9adf751248	{889881cd-338c-44d2-bd0b-7638c93c731f,ba562ce0-17e9-4b1b-b0f2-0ba621209611}	\N	INR	payu	103816.09	active	2025-07-13 17:32:26.332+00	2025-07-13 15:32:26.365237+00	2025-07-13 15:32:26.365237+00
bd766611-3f0d-4ced-93ed-e22b53d18fdb	cs_1752421299050_9u05t3hi9	130ec316-970f-429f-8cb8-ff9adf751248	{889881cd-338c-44d2-bd0b-7638c93c731f,ba562ce0-17e9-4b1b-b0f2-0ba621209611}	\N	INR	payu	103816.09	active	2025-07-13 17:41:39.05+00	2025-07-13 15:41:39.089526+00	2025-07-13 15:41:39.089526+00
fbc6d7d2-6252-4862-ba8b-c7fe965d346a	cs_1752421405943_8yaqqzspf	130ec316-970f-429f-8cb8-ff9adf751248	{889881cd-338c-44d2-bd0b-7638c93c731f,ba562ce0-17e9-4b1b-b0f2-0ba621209611}	\N	INR	payu	103816.09	active	2025-07-13 17:43:25.943+00	2025-07-13 15:43:25.993711+00	2025-07-13 15:43:25.993711+00
1fe4e32e-7473-4465-97bb-c74c536fdcfb	cs_1752421586132_9jq8c2ent	130ec316-970f-429f-8cb8-ff9adf751248	{889881cd-338c-44d2-bd0b-7638c93c731f,ba562ce0-17e9-4b1b-b0f2-0ba621209611}	\N	INR	bank_transfer	103816.09	active	2025-07-13 17:46:26.132+00	2025-07-13 15:46:26.184786+00	2025-07-13 15:46:26.184786+00
e08e3cc5-7270-4023-be19-5ceceda2bbb5	cs_1752421591897_892fskgxl	130ec316-970f-429f-8cb8-ff9adf751248	{889881cd-338c-44d2-bd0b-7638c93c731f,ba562ce0-17e9-4b1b-b0f2-0ba621209611}	\N	INR	payu	103816.09	active	2025-07-13 17:46:31.897+00	2025-07-13 15:46:31.934666+00	2025-07-13 15:46:31.934666+00
96cf8f30-dc20-4159-92ff-ace063afc033	cs_1752422689850_feyfg64g7	130ec316-970f-429f-8cb8-ff9adf751248	{0c6a0ee3-5e0b-4329-b20c-47179d57e813}	\N	INR	payu	10885.59	active	2025-07-13 18:04:49.85+00	2025-07-13 16:04:49.911825+00	2025-07-13 16:04:49.911825+00
9260ac3a-f046-463f-8a52-233f29105ec1	cs_1752424244692_0mdi9q7hi	130ec316-970f-429f-8cb8-ff9adf751248	{0c6a0ee3-5e0b-4329-b20c-47179d57e813}	\N	INR	payu	10885.59	active	2025-07-13 18:30:44.692+00	2025-07-13 16:30:44.815622+00	2025-07-13 16:30:44.815622+00
55d19315-a46c-4c55-a4e7-bb384be27a8b	cs_1752424911966_2eyqjby5f	130ec316-970f-429f-8cb8-ff9adf751248	{0c6a0ee3-5e0b-4329-b20c-47179d57e813}	\N	INR	payu	10885.59	active	2025-07-13 18:41:51.966+00	2025-07-13 16:41:52.034079+00	2025-07-13 16:41:52.034079+00
af75c53e-d477-4052-bbac-d31e1a83e87c	cs_1752425173206_484po1axb	130ec316-970f-429f-8cb8-ff9adf751248	{620a1f3e-88a7-4c2a-bf37-d0134d1718ee}	\N	INR	payu	1870.91	active	2025-07-13 18:46:13.206+00	2025-07-13 16:46:13.285477+00	2025-07-13 16:46:13.285477+00
af1cade3-b356-4c45-8e6c-61237733cf23	cs_1752429901866_ria96k6gg	130ec316-970f-429f-8cb8-ff9adf751248	{7807eb4f-7c5f-4ebd-af96-dae0a2758db4}	\N	INR	bank_transfer	10884.56	active	2025-07-13 20:05:01.866+00	2025-07-13 18:05:01.930976+00	2025-07-13 18:05:01.930976+00
a788806b-7caf-4a91-8f52-d4fa72a8d0d4	cs_1752433190671_n5ydyq33p	130ec316-970f-429f-8cb8-ff9adf751248	{28cd6de8-f7d6-4eaf-90df-275b41f0beaf}	\N	INR	bank_transfer	12025.39	active	2025-07-13 20:59:50.671+00	2025-07-13 18:59:50.782955+00	2025-07-13 18:59:50.782955+00
dd447bef-dca4-4dfc-a6c8-0453606bea27	cs_1752458338282_6v8c82k6f	130ec316-970f-429f-8cb8-ff9adf751248	{2ef979ce-e712-41e3-8b67-9f6268da344c}	\N	INR	payu	617.14	active	2025-07-14 03:58:58.282+00	2025-07-14 01:58:58.903977+00	2025-07-14 01:58:58.903977+00
717c1f8e-e402-45e6-a4fd-bec701d5773b	cs_1752458384103_m7zhgk54u	130ec316-970f-429f-8cb8-ff9adf751248	{2ef979ce-e712-41e3-8b67-9f6268da344c}	\N	INR	payu	617.14	active	2025-07-14 03:59:44.103+00	2025-07-14 01:59:44.163488+00	2025-07-14 01:59:44.163488+00
a8b0ee22-f000-4f0a-b609-15c8de82e186	cs_1752459101845_5k9stp1kd	130ec316-970f-429f-8cb8-ff9adf751248	{3173b915-2011-4c6f-8802-fe0c5871ab21}	\N	INR	payu	617.14	active	2025-07-14 04:11:41.846+00	2025-07-14 02:11:41.888723+00	2025-07-14 02:11:41.888723+00
2951527f-ea4d-453c-b956-3ba1069f7cfb	cs_1752460288476_436g6m9ep	130ec316-970f-429f-8cb8-ff9adf751248	{0795b513-a941-4857-abe2-e56ab8e8ccdc}	\N	INR	payu	1756.94	active	2025-07-14 04:31:28.476+00	2025-07-14 02:31:28.519624+00	2025-07-14 02:31:28.519624+00
\.


--
-- Data for Name: country_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."country_settings" ("code", "name", "currency", "rate_from_usd", "sales_tax", "vat", "min_shipping", "additional_shipping", "additional_weight", "weight_unit", "volumetric_divisor", "payment_gateway_fixed_fee", "payment_gateway_percent_fee", "purchase_allowed", "shipping_allowed", "payment_gateway", "created_at", "updated_at", "minimum_payment_amount", "decimal_places", "thousand_separator", "decimal_separator", "symbol_position", "symbol_space", "priority_thresholds") FROM stdin;
US	United States	USD	1.000000	0.08	0.00	10.00	0.00	2.00	lbs	5000	0.00	2.90	t	t	stripe	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	10.00	2	,	.	before	f	{"low": 0, "normal": 500, "urgent": 2000}
IN	India	INR	83.000000	0.00	0.18	500.00	0.00	100.00	kg	5000	0.00	2.50	t	t	payu	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	10.00	2	,	.	before	f	{"low": 0, "normal": 41500, "urgent": 166000}
NP	Nepal	NPR	133.000000	0.00	0.13	1000.00	0.00	200.00	kg	5000	0.00	1.50	t	t	esewa	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	10.00	2	,	.	before	f	{"low": 0, "normal": 66500, "urgent": 266000}
JP	Japan	JPY	150.000000	0.00	0.10	1500.00	0.00	200.00	kg	5000	0.00	2.90	t	t	stripe	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	10.00	2	,	.	before	f	{"low": 0, "normal": 75000, "urgent": 300000}
GB	United Kingdom	GBP	0.790000	0.00	0.20	12.00	0.00	2.00	kg	5000	0.00	2.90	t	t	stripe	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	10.00	2	,	.	before	f	{"low": 0, "normal": 395, "urgent": 1580}
AU	Australia	AUD	1.520000	0.00	0.10	15.00	0.00	2.00	kg	5000	0.00	2.90	t	t	stripe	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	10.00	2	,	.	before	f	{"low": 0, "normal": 760, "urgent": 3040}
\.


--
-- Data for Name: bank_account_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."bank_account_details" ("id", "account_name", "account_number", "bank_name", "branch_name", "iban", "swift_code", "country_code", "is_fallback", "custom_fields", "field_labels", "display_order", "is_active", "created_at", "updated_at", "destination_country", "upi_id", "upi_qr_string", "payment_qr_url", "instructions", "currency_code") FROM stdin;
054784a9-263e-4dc3-b270-1f40319d27a8	iWB Enterprises	924020057946752	Axis Bank - Current	\N	\N	\N	IN	f	{"ifsc": "UTIB0000056"}	{}	0	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	\N	\N	\N	\N	\N	INR
fa226c85-c032-40f5-ac01-7a714550f25f	I WISH BAG	1780100000613201	Citizens Bank - Teku	\N	\N	\N	NP	f	{}	{}	0	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	\N	\N	\N	\N	\N	NPR
21df7298-785c-4204-b26c-99811054d0ed	IWISHBAG PTE. LTD.	8456220037	Community Federal Savings Bank	\N	\N	\N	US	f	{"ach": "026073150", "bank_address": "89-16 Jamaica Ave, Woodhaven, NY, United States, 11421"}	{}	0	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	\N	\N	\N	\N	\N	USD
\.


--
-- Data for Name: payment_reconciliation; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment_reconciliation" ("id", "reconciliation_date", "payment_method", "gateway_code", "statement_reference", "statement_start_date", "statement_end_date", "statement_opening_balance", "statement_closing_balance", "statement_total_credits", "statement_total_debits", "system_opening_balance", "system_closing_balance", "system_total_credits", "system_total_debits", "status", "matched_count", "unmatched_system_count", "unmatched_statement_count", "total_matched_amount", "statement_file_url", "statement_file_name", "reconciled_by", "started_at", "completed_at", "notes", "metadata", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: bank_statement_imports; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."bank_statement_imports" ("id", "reconciliation_id", "file_name", "file_url", "file_format", "total_rows", "processed_rows", "successful_rows", "failed_rows", "status", "error_log", "imported_by", "imported_at", "completed_at", "created_at") FROM stdin;
\.


--
-- Data for Name: chart_of_accounts; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."chart_of_accounts" ("code", "name", "account_type", "parent_code", "is_active", "description", "created_at", "updated_at") FROM stdin;
1000	Assets	asset	\N	t	All company assets	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1100	Current Assets	asset	1000	t	Short-term assets	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1110	Cash and Bank	asset	1100	t	Cash and bank accounts	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1111	PayU Account	asset	1110	t	PayU payment gateway balance	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1112	Stripe Account	asset	1110	t	Stripe payment gateway balance	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1113	Bank Transfer Account	asset	1110	t	Bank transfer receipts	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1114	eSewa Account	asset	1110	t	eSewa payment gateway balance	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1120	Accounts Receivable	asset	1100	t	Money owed by customers	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
1130	Prepaid Expenses	asset	1100	t	Expenses paid in advance	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
2000	Liabilities	liability	\N	t	All company liabilities	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
2100	Current Liabilities	liability	2000	t	Short-term liabilities	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
2110	Customer Deposits	liability	2100	t	Advance payments from customers	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
2120	Accounts Payable	liability	2100	t	Money owed to suppliers	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
2130	Accrued Expenses	liability	2100	t	Expenses incurred but not paid	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
2140	Refunds Payable	liability	2100	t	Pending refunds to customers	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
3000	Equity	equity	\N	t	Owner equity	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
3100	Retained Earnings	equity	3000	t	Accumulated profits	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
4000	Revenue	revenue	\N	t	All revenue streams	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
4100	Sales Revenue	revenue	4000	t	Product sales revenue	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
4200	Shipping Revenue	revenue	4000	t	Shipping charges collected	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
4300	Handling Fees	revenue	4000	t	Handling fee revenue	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
4400	Currency Exchange Gains	revenue	4000	t	Gains from currency exchange	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
5000	Expenses	expense	\N	t	All company expenses	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
5100	Payment Gateway Fees	expense	5000	t	Fees charged by payment gateways	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
5200	Refunds and Returns	expense	5000	t	Product refunds and returns	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
5300	Bad Debt Expense	expense	5000	t	Uncollectible customer accounts	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
5400	Currency Exchange Loss	expense	5000	t	Losses from currency exchange	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
5500	Write-offs	expense	5000	t	Written off amounts	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
5600	Discounts Given	expense	5000	t	Discounts provided to customers	2025-07-13 11:43:21.371416+00	2025-07-13 11:43:21.371416+00
\.


--
-- Data for Name: payment_gateways; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment_gateways" ("id", "name", "code", "is_active", "supported_countries", "supported_currencies", "fee_percent", "fee_fixed", "config", "test_mode", "created_at", "updated_at", "priority", "description") FROM stdin;
ea7bf93c-40ab-4fde-af3e-bc05fcd4b507	Razorpay	razorpay	t	{IN}	{INR}	2.00	0.00	{"key_id": "test_razorpay_key", "key_secret": "test_razorpay_secret", "environment": "test"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Complete payments solution for Indian businesses
3c3db53e-bada-49af-b63c-3dba5c801a65	Bank Transfer	bank_transfer	t	{US,CA,GB,AU,IN,NP,SG,JP,MY,TH,PH,ID,VN,KR}	{USD,CAD,GBP,AUD,INR,NPR,SGD,JPY,MYR,THB,PHP,IDR,VND,KRW}	0.00	0.00	{"processing_time": "1-3 business days", "requires_manual_verification": true}	f	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Direct bank transfer with manual verification
ec841dca-79b7-4751-8d71-f2639e0bbc16	Cash on Delivery	cod	t	{IN,NP,MY,TH,PH,ID,VN}	{INR,NPR,MYR,THB,PHP,IDR,VND}	0.00	50.00	{"max_amount_inr": 50000, "max_amount_npr": 80000, "verification_required": true}	f	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Pay with cash upon delivery
e88a0b55-5838-4851-a7bd-260f2c1f1b43	PayPal	paypal	t	{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,IN}	{USD,CAD,GBP,AUD,EUR,SGD,JPY,INR}	3.40	30.00	{"client_id": "ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH", "webhook_id": "8ME41227A0068401Y", "environment": "sandbox", "client_secret": "ARi806xV-dbFCS5E9OCYkapLEb-7V0P521rLUG9pYUk6kJ7Nm7exNudxamGEkQ1SXqUSzNgV3lEZyAXH"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Global payment platform supporting multiple countries and currencies
db2f4ce8-2f44-4313-a73b-7548e325d1e9	Stripe	stripe	t	{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,IN}	{USD,EUR,GBP,CAD,AUD,JPY,SGD,AED,SAR,EGP,TRY}	2.90	0.30	{"environment": "test", "test_secret_key": "sk_test_placeholder", "test_publishable_key": "pk_test_placeholder"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	International payment gateway supporting cards and multiple currencies
b45d125e-a00a-47af-ae0c-79a8636cb7cd	eSewa	esewa	t	{NP}	{NPR}	1.50	0.00	{"secret_key": "test_esewa_secret", "environment": "test", "merchant_id": "test_esewa_merchant"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Nepal's most popular digital wallet and payment service
680f07ec-1502-45df-bbae-390749f01767	Khalti	khalti	t	{NP}	{NPR}	2.00	0.00	{"public_key": "test_khalti_public", "secret_key": "test_khalti_secret", "environment": "test"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Nepal's digital wallet service
e4750bd8-886f-4b39-b65c-f36832a11d3f	Fonepay	fonepay	t	{NP}	{NPR}	1.50	0.00	{"password": "test_pass", "username": "test_user", "environment": "test", "merchant_code": "test_fonepay_merchant"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Nepal's mobile payment network
ff709a62-1436-4f2f-a37c-81ca9682693f	Airwallex	airwallex	t	{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,HK,CN}	{USD,EUR,GBP,CAD,AUD,JPY,SGD,AED,SAR,EGP,TRY}	1.80	0.30	{"api_key": "test_airwallex_key", "client_id": "test_airwallex_client", "environment": "demo"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Global payments infrastructure for modern businesses
a6bb0734-b2c1-4829-8c80-9529a230de40	PayU	payu	t	{IN}	{INR}	2.50	0.00	{"salt_key": "U39kJNfW", "client_id": "2e64183e25e481e5859741d0e458ed3c48852c2100b552e032cd37f273caef30", "environment": "test", "failure_url": "/functions/v1/payu-failure", "merchant_id": "8725115", "success_url": "/functions/v1/payu-success", "webhook_url": "https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/payment-webhook", "merchant_key": "u7Ui5I", "client_secret": "cb2c6b7f39a3ffae9442cb270de49971381ad2c04b0800d9c14ca634a83aaad8"}	t	2025-07-12 15:25:53.325565+00	2025-07-12 15:25:53.325565+00	999	Leading payment gateway in India supporting cards, UPI, net banking, and wallets
\.


--
-- Data for Name: country_payment_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."country_payment_preferences" ("id", "country_code", "gateway_code", "priority", "is_active", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: financial_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."financial_transactions" ("id", "transaction_date", "transaction_type", "reference_type", "reference_id", "description", "debit_account", "credit_account", "amount", "currency", "status", "posted_at", "reversed_by", "reversal_reason", "created_by", "approved_by", "approved_at", "notes", "metadata", "created_at", "updated_at") FROM stdin;
\.


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."profiles" ("id", "full_name", "phone", "country", "preferred_display_currency", "avatar_url", "cod_enabled", "internal_notes", "referral_code", "total_orders", "total_spent", "created_at", "updated_at", "email") FROM stdin;
130ec316-970f-429f-8cb8-ff9adf751248	Raunak Bohra	+919311161034	IN	INR	\N	f	\N	REF4f69e92c	0	0.00	2025-07-12 15:36:40.160601+00	2025-07-12 15:38:58.415136+00	iwbtracking@gmail.com
\.


--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."messages" ("id", "sender_id", "recipient_id", "subject", "content", "message_type", "quote_id", "reply_to_message_id", "attachment_file_name", "attachment_url", "sender_email", "sender_name", "is_read", "created_at", "updated_at", "verification_status", "admin_notes", "verified_by", "verified_at") FROM stdin;
4dffd576-e5d4-407c-b558-590ac85c5867	130ec316-970f-429f-8cb8-ff9adf751248	\N	Payment Proof for Order Q20250713-a04980	Payment proof uploaded for Order #Q20250713-a04980	payment_proof	7807eb4f-7c5f-4ebd-af96-dae0a2758db4	\N	iWishBag-india-logo.png	https://grgvlrvywsfmnmkxrecd.supabase.co/storage/v1/object/public/message-attachments/payment-proof-130ec316-970f-429f-8cb8-ff9adf751248-1752429914502.png	\N	\N	f	2025-07-13 18:05:15.11926+00	2025-07-13 18:05:15.11926+00	pending	\N	\N	\N
cc1de42f-db13-4fc6-a8ad-bc4079147e8a	130ec316-970f-429f-8cb8-ff9adf751248	\N	Payment Proof for Order Q20250713-278e84	Payment proof uploaded for Order #Q20250713-278e84	payment_proof	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	\N	iWishBag-india-logoo.png	https://grgvlrvywsfmnmkxrecd.supabase.co/storage/v1/object/public/message-attachments/payment-proof-130ec316-970f-429f-8cb8-ff9adf751248-1752433199176.png	\N	\N	f	2025-07-13 19:00:00.12886+00	2025-07-13 19:00:00.12886+00	rejected	unclear_proof	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 19:10:02.347+00
e834b78a-775d-413d-8cb2-62ffb6e85537	130ec316-970f-429f-8cb8-ff9adf751248	\N	Payment Proof for Order Q20250712-1bea11	Payment proof uploaded for Order #Q20250712-1bea11	payment_proof	737e30f3-b621-4b04-a6f2-ffd0fa7c4be5	\N	Invoice_1875948235.pdf	https://grgvlrvywsfmnmkxrecd.supabase.co/storage/v1/object/public/message-attachments/payment-proof-130ec316-970f-429f-8cb8-ff9adf751248-1752339225287.pdf	\N	\N	f	2025-07-12 16:53:46.29713+00	2025-07-12 16:53:46.29713+00	verified	Payment proof verified and payment confirmed automatically	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-12 17:26:15.423+00
c341b797-0469-4026-9528-f36ffdcbe4bd	130ec316-970f-429f-8cb8-ff9adf751248	\N	Payment Proof for Order Q20250713-c7b94b	Payment proof uploaded for Order #Q20250713-c7b94b	payment_proof	0a962e66-aa01-4039-8636-e7d3be7bdf41	\N	WhatsApp Image 2025-07-10 at 17.31.11.jpeg	https://grgvlrvywsfmnmkxrecd.supabase.co/storage/v1/object/public/message-attachments/payment-proof-130ec316-970f-429f-8cb8-ff9adf751248-1752416895451.jpeg	\N	\N	f	2025-07-13 14:28:16.212776+00	2025-07-13 14:28:16.212776+00	verified	Payment verified: INR 617.14 received	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 14:28:28.904+00
dfbb779f-ce7c-4fc6-bce5-8538fcb3082c	130ec316-970f-429f-8cb8-ff9adf751248	\N	Payment Proof for Order Q20250713-880978	Payment proof uploaded for Order #Q20250713-880978	payment_proof	4773a891-5726-4168-ad24-13d0b30f0a3e	\N	WhatsApp Image 2025-07-10 at 17.31.11.jpeg	https://grgvlrvywsfmnmkxrecd.supabase.co/storage/v1/object/public/message-attachments/payment-proof-130ec316-970f-429f-8cb8-ff9adf751248-1752419729502.jpeg	\N	\N	f	2025-07-13 15:15:30.097801+00	2025-07-13 15:15:30.097801+00	verified	Payment verified: INR 617.14 received	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 15:15:40.249+00
2c9efdaa-425a-4328-bd0a-9f60d7773d3c	130ec316-970f-429f-8cb8-ff9adf751248	\N	Payment Proof for Order Q20250713-71ba43	Payment proof uploaded for Order #Q20250713-71ba43	payment_proof	38cafd36-e142-455b-a6e8-13fded5c10d9	\N	Stripe Tax Invoice UDBUTHJQ-2025-05.pdf	https://grgvlrvywsfmnmkxrecd.supabase.co/storage/v1/object/public/message-attachments/payment-proof-130ec316-970f-429f-8cb8-ff9adf751248-1752420550264.pdf	\N	\N	f	2025-07-13 15:29:10.841132+00	2025-07-13 15:29:10.841132+00	verified	Payment verified: INR 22.00 received	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 17:48:19.844+00
\.


--
-- Data for Name: shipping_routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."shipping_routes" ("id", "origin_country", "destination_country", "base_shipping_cost", "cost_per_kg", "cost_percentage", "weight_tiers", "carriers", "max_weight", "restricted_items", "requires_documentation", "is_active", "created_at", "updated_at", "weight_unit", "delivery_options", "processing_days", "active", "customs_clearance_days", "shipping_per_kg", "exchange_rate") FROM stdin;
24	US	IN	12.00	11.00	2.50	[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]	[{"days": "7-10", "name": "DHL", "cost_multiplier": 5.0}]	\N	\N	f	t	2025-07-12 15:25:53.325565	2025-07-12 15:25:53.325565	kg	[]	2	t	3	0.00	1.000000
25	US	NP	12.00	11.00	2.50	[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]	[{"days": "10-14", "name": "GSH", "cost_multiplier": 5.0}, {"days": "10-14", "name": "GExpress", "cost_multiplier": 5.0}]	\N	\N	f	t	2025-07-12 15:25:53.325565	2025-07-12 15:25:53.325565	kg	[]	2	t	3	0.00	1.000000
26	IN	NP	450.00	400.00	2.50	[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]	[{"days": "8-12", "name": "Chain Express", "cost_multiplier": 5.0}]	\N	\N	f	t	2025-07-12 15:25:53.325565	2025-07-12 15:25:53.325565	kg	[]	2	t	3	0.00	1.000000
\.


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."quotes" ("id", "display_id", "user_id", "email", "status", "approval_status", "priority", "destination_country", "currency", "items_currency", "product_name", "product_url", "image_url", "options", "quantity", "item_price", "item_weight", "sub_total", "domestic_shipping", "international_shipping", "merchant_shipping_price", "sales_tax_price", "vat", "customs_and_ecs", "handling_charge", "insurance_amount", "payment_gateway_fee", "discount", "final_total", "final_total_local", "final_currency", "exchange_rate", "in_cart", "payment_method", "shipping_carrier", "tracking_number", "current_location", "estimated_delivery_date", "customs_category_name", "rejection_reason_id", "rejection_details", "internal_notes", "order_display_id", "shipping_address", "address_locked", "address_updated_at", "address_updated_by", "payment_reminder_sent_at", "payment_reminder_count", "created_at", "updated_at", "approved_at", "rejected_at", "paid_at", "shipped_at", "last_tracking_update", "amount_paid", "payment_status", "overpayment_amount", "admin_notes", "priority_auto", "origin_country", "shipping_method", "shipping_route_id", "shipping_delivery_days", "breakdown", "customs_percentage", "enabled_delivery_options", "is_anonymous", "social_handle", "quote_source", "share_token", "expires_at", "customer_name", "customer_phone", "sent_at", "calculated_at", "ordered_at", "delivered_at", "customer_notes", "calculation_metadata", "payment_details") FROM stdin;
0a962e66-aa01-4039-8636-e7d3be7bdf41	Q20250713-c7b94b	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N		\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 12:22:47.839749+00	2025-07-13 18:43:17.679734+00	\N	\N	2025-07-13 15:32:43.226638+00	\N	\N	617.14	paid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
38cafd36-e142-455b-a6e8-13fded5c10d9	Q20250713-71ba43	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N	fdsa	\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 15:17:27.570289+00	2025-07-13 18:43:17.679734+00	\N	\N	2025-07-13 15:32:43.226638+00	\N	\N	639.14	overpaid	22.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
620a1f3e-88a7-4c2a-bf37-d0134d1718ee	Q20250713-3e547c	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N		\N	\N	\N	1	1222.00	5.00	2277.55	0.00	1000.00	0.00	0.00	4.10	0.00	0.00	0.00	55.55	0.00	2281.65	2281.65	INR	83.000000	f	payu	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 16:45:42.61641+00	2025-07-13 21:28:03.124678+00	\N	\N	2025-07-13 16:46:33.865+00	\N	\N	-12.00	partial	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"amount": 1870.91, "gateway": "payu", "payu_id": "403993715534333758", "currency": "INR", "customer_name": "Raunak Bohra", "customer_email": "iwbtracking@gmail.com", "customer_phone": "9999999999", "transaction_id": "PAYU_1752425175070_1jo9l4rpu", "payment_confirmed_at": "2025-07-13T16:46:33.865Z"}
2ef979ce-e712-41e3-8b67-9f6268da344c	Q20250714-e44018	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N	india maazon	\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	payu	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-14 01:58:34.909917+00	2025-07-14 02:29:43.129001+00	\N	\N	2025-07-14 02:00:01.952+00	\N	\N	-617.14	partial	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"amount": 617.14, "gateway": "payu", "payu_id": "403993715534334243", "currency": "INR", "customer_name": "Raunak Bohra", "customer_email": "iwbtracking@gmail.com", "customer_phone": "9999999999", "transaction_id": "PAYU_1752458385384_gbq3gffo2", "payment_confirmed_at": "2025-07-14T02:00:01.952Z"}
e0f78c9b-f302-40f9-9e71-6df52597bd00	Q20250712-d983c9	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	approved	pending	low	IN	INR	\N		\N	\N	\N	1	1112.00	1.00	1754.80	0.00	600.00	0.00	0.00	3.16	0.00	0.00	0.00	42.80	0.00	1757.96	1757.96	INR	83.000000	f	\N	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}	f	\N	\N	\N	0	2025-07-12 16:20:49.398936+00	2025-07-13 08:48:46.992675+00	\N	\N	\N	\N	\N	0.00	unpaid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
abdb6dfc-963d-441d-b101-d8b92924ee4c	Q20250713-24e3e3	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	sent	pending	low	IN	INR	\N	https://whyteclub.com/admin/orders	\N	\N	\N	1	11.00	1.00	626.28	0.00	600.00	0.00	0.00	1.13	0.00	0.00	0.00	15.28	0.00	627.41	627.41	INR	83.000000	f	\N	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 15:16:46.810597+00	2025-07-13 15:17:08.358753+00	\N	\N	\N	\N	\N	0.00	unpaid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	2025-07-18 15:16:55.160085+00	\N	\N	2025-07-13 15:16:55.160085+00	\N	\N	\N	\N	\N	\N
56752d27-9fce-4de4-9d1c-6c1750db0da5	Q20250713-749fa6	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	sent	pending	low	IN	INR	\N		\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	\N	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 12:21:41.340667+00	2025-07-13 12:21:55.074796+00	\N	\N	\N	\N	\N	0.00	unpaid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	2025-07-18 12:21:55.074796+00	\N	\N	2025-07-13 12:21:55.074796+00	\N	\N	\N	\N	\N	\N
737e30f3-b621-4b04-a6f2-ffd0fa7c4be5	Q20250712-1bea11	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N		\N	\N	\N	1	111.00	1.00	728.78	0.00	600.00	0.00	0.00	1.31	0.00	0.00	0.00	17.78	0.00	730.08	730.08	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		ORD-737E30	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}	f	\N	\N	\N	0	2025-07-12 15:37:29.222253+00	2025-07-13 14:07:15.93534+00	\N	\N	2025-07-12 17:26:15.534+00	\N	\N	730.08	paid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
ba562ce0-17e9-4b1b-b0f2-0ba621209611	Q20250713-af7847	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	payment_pending	pending	low	IN	INR	\N		\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 14:42:09.097921+00	2025-07-13 15:46:27.646518+00	\N	\N	\N	\N	\N	0.00	unpaid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
889881cd-338c-44d2-bd0b-7638c93c731f	Q20250713-f51837	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	payment_pending	pending	normal	IN	INR	\N		\N	\N	\N	1	1.00	1000.00	103013.53	0.00	100500.00	0.00	0.00	185.42	0.00	0.00	0.00	2512.53	0.00	103198.95	103198.95	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 15:22:16.845086+00	2025-07-13 15:46:27.646518+00	\N	\N	\N	\N	\N	0.00	unpaid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
7807eb4f-7c5f-4ebd-af96-dae0a2758db4	Q20250713-a04980	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	payment_pending	pending	low	IN	INR	\N	bank	\N	\N	\N	1	10000.00	1.00	10865.00	0.00	600.00	0.00	0.00	19.56	0.00	0.00	0.00	265.00	0.00	10884.56	10884.56	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 18:04:31.401921+00	2025-07-13 18:58:37.91044+00	\N	\N	\N	\N	\N	10884.56	paid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
4773a891-5726-4168-ad24-13d0b30f0a3e	Q20250713-880978	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N	1	\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 15:15:01.224573+00	2025-07-13 18:43:17.679734+00	\N	\N	2025-07-13 15:32:43.226638+00	\N	\N	617.14	paid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
60db8bed-178d-471c-a9ba-86109767fe96	Q20250712-68b0b3	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	approved	pending	low	IN	INR	\N		\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	\N	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}	f	\N	\N	\N	0	2025-07-12 15:53:32.926421+00	2025-07-13 14:27:36.894196+00	\N	\N	\N	\N	\N	0.00	unpaid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
28cd6de8-f7d6-4eaf-90df-275b41f0beaf	Q20250713-278e84	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	payment_pending	pending	low	IN	INR	\N	amazon.indi	\N	\N	\N	1	11111.00	1.00	12003.78	0.00	600.00	0.00	0.00	21.61	0.00	0.00	0.00	292.78	0.00	12025.39	12025.39	INR	83.000000	f	bank_transfer	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 18:59:31.638678+00	2025-07-13 19:10:26.263257+00	\N	\N	\N	\N	\N	48101.29	overpaid	36075.90	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0c6a0ee3-5e0b-4329-b20c-47179d57e813	Q20250713-8ff9a9	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	processing	pending	low	IN	INR	\N	amazon	\N	\N	\N	1	10001.00	1.00	10866.03	0.00	600.00	0.00	0.00	19.56	0.00	0.00	0.00	265.03	0.00	10885.59	10885.59	INR	83.000000	f	payu	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-13 16:04:31.100672+00	2025-07-13 16:41:57.049737+00	\N	\N	\N	\N	\N	0.00	unpaid	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N
0795b513-a941-4857-abe2-e56ab8e8ccdc	Q20250714-c6921e	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N	a	\N	\N	\N	1	1111.00	1.00	1753.78	0.00	600.00	0.00	0.00	3.16	0.00	0.00	0.00	42.78	0.00	1756.94	1756.94	INR	83.000000	f	payu	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-14 02:31:08.949755+00	2025-07-14 02:55:09.381001+00	\N	\N	2025-07-14 02:36:03.929725+00	\N	\N	-2.00	partial	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"amount": 1756.94, "gateway": "payu", "payu_id": "403993715534334285", "currency": "INR", "customer_name": "Raunak Bohra", "customer_email": "iwbtracking@gmail.com", "customer_phone": "9999999999", "transaction_id": "PAYU_1752460289990_2cmyg1jaj", "payment_confirmed_at": "2025-07-14T02:31:45.556Z"}
3173b915-2011-4c6f-8802-fe0c5871ab21	Q20250714-b88aaa	130ec316-970f-429f-8cb8-ff9adf751248	iwbtracking@gmail.com	paid	pending	low	IN	INR	\N	amazon	\N	\N	\N	1	1.00	1.00	616.03	0.00	600.00	0.00	0.00	1.11	0.00	0.00	0.00	15.03	0.00	617.14	617.14	INR	83.000000	f	payu	\N	\N	\N	\N	\N	\N	\N		\N	{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": ""}	f	\N	\N	\N	0	2025-07-14 02:11:18.957323+00	2025-07-14 02:13:31.033514+00	\N	\N	2025-07-14 02:11:58.448+00	\N	\N	-1.00	partial	0.00	\N	t	IN	country_settings	\N	\N	\N	\N	[]	f	\N	website	\N	\N	\N	\N	\N	\N	\N	\N	\N	\N	{"amount": 617.14, "gateway": "payu", "payu_id": "403993715534334253", "currency": "INR", "customer_name": "Raunak Bohra", "customer_email": "iwbtracking@gmail.com", "customer_phone": "9999999999", "transaction_id": "PAYU_1752459103521_rq5yym04p", "payment_confirmed_at": "2025-07-14T02:11:58.449Z"}
\.


--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment_transactions" ("id", "user_id", "quote_id", "amount", "currency", "status", "payment_method", "gateway_response", "created_at", "updated_at", "total_refunded", "refund_count", "is_fully_refunded", "last_refund_at", "paypal_order_id", "paypal_capture_id", "paypal_payer_id", "paypal_payer_email") FROM stdin;
ba20eb6d-8d46-46c9-8eb0-385e398f704d	\N	620a1f3e-88a7-4c2a-bf37-d0134d1718ee	1870.91	INR	completed	payu	{"payu_id": "403993715534333758", "product_info": "Order  Product  620a1f3e-88a7-4c2a-bf37-d0134d1718ee ", "all_quote_ids": ["620a1f3e-88a7-4c2a-bf37-d0134d1718ee"], "customer_info": {"name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "9999999999"}, "transaction_id": "PAYU_1752425175070_1jo9l4rpu"}	2025-07-13 16:46:34.067188+00	2025-07-13 16:46:34.067188+00	0.00	0	f	\N	\N	\N	\N	\N
47be8596-22f2-4d74-9b8d-a5ae0573c613	130ec316-970f-429f-8cb8-ff9adf751248	7807eb4f-7c5f-4ebd-af96-dae0a2758db4	100.00	NPR	completed	bank_transfer	{"notes": "Test payment fixed v2", "recorded_by": "130ec316-970f-429f-8cb8-ff9adf751248", "payment_date": "2025-07-13", "manual_payment": true, "transaction_reference": "TEST-PAYMENT-003"}	2025-07-13 18:11:08.003586+00	2025-07-13 18:11:08.003586+00	0.00	0	f	\N	\N	\N	\N	\N
850fdb92-4c6e-48e0-82fc-9b65b6d4f64d	130ec316-970f-429f-8cb8-ff9adf751248	7807eb4f-7c5f-4ebd-af96-dae0a2758db4	10784.56	INR	completed	bank_transfer	{"notes": "", "recorded_by": "130ec316-970f-429f-8cb8-ff9adf751248", "payment_date": "2025-07-13", "manual_payment": true, "transaction_reference": "MANUAL-1752433117645"}	2025-07-13 18:58:37.91044+00	2025-07-13 18:58:37.91044+00	0.00	0	f	\N	\N	\N	\N	\N
e99b9a62-af2e-454b-ba26-74f9e4233dc7	130ec316-970f-429f-8cb8-ff9adf751248	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	12025.30	INR	completed	bank_transfer	{"notes": "Payment verified from uploaded proof", "recorded_by": "130ec316-970f-429f-8cb8-ff9adf751248", "payment_date": "2025-07-13", "manual_payment": true, "transaction_reference": "PROOF-cc1de42f-db13-4fc6-a8ad-bc4079147e8a"}	2025-07-13 19:09:31.375411+00	2025-07-13 19:09:31.375411+00	0.00	0	f	\N	\N	\N	\N	\N
6264f0d9-3af2-47ea-b619-7d533826f8c2	130ec316-970f-429f-8cb8-ff9adf751248	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	12025.30	INR	completed	bank_transfer	{"notes": "Payment verified from uploaded proof", "recorded_by": "130ec316-970f-429f-8cb8-ff9adf751248", "payment_date": "2025-07-13", "manual_payment": true, "transaction_reference": "PROOF-cc1de42f-db13-4fc6-a8ad-bc4079147e8a"}	2025-07-13 19:09:39.68354+00	2025-07-13 19:09:39.68354+00	0.00	0	f	\N	\N	\N	\N	\N
ba0d0e10-6a65-4334-8652-5f4aa0b115e8	130ec316-970f-429f-8cb8-ff9adf751248	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	12025.30	INR	completed	bank_transfer	{"notes": "Payment verified from uploaded proof", "recorded_by": "130ec316-970f-429f-8cb8-ff9adf751248", "payment_date": "2025-07-13", "manual_payment": true, "transaction_reference": "PROOF-cc1de42f-db13-4fc6-a8ad-bc4079147e8a"}	2025-07-13 19:09:45.510486+00	2025-07-13 19:09:45.510486+00	0.00	0	f	\N	\N	\N	\N	\N
990b9a11-1578-4d9d-80ff-1d9a262dd77a	130ec316-970f-429f-8cb8-ff9adf751248	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	12025.39	INR	completed	bank_transfer	{"notes": "", "recorded_by": "130ec316-970f-429f-8cb8-ff9adf751248", "payment_date": "2025-07-13", "manual_payment": true, "transaction_reference": "MANUAL-1752433826020"}	2025-07-13 19:10:26.263257+00	2025-07-13 19:10:26.263257+00	0.00	0	f	\N	\N	\N	\N	\N
27b55319-c3b8-43e0-96cd-873cf52e5803	\N	2ef979ce-e712-41e3-8b67-9f6268da344c	617.14	INR	completed	payu	{"payu_id": "403993715534334243", "product_info": "Order  india maazon  2ef979ce-e712-41e3-8b67-9f6268da344c ", "all_quote_ids": ["2ef979ce-e712-41e3-8b67-9f6268da344c"], "customer_info": {"name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "9999999999"}, "transaction_id": "PAYU_1752458385384_gbq3gffo2"}	2025-07-14 02:00:02.105808+00	2025-07-14 02:00:02.105808+00	0.00	0	f	\N	\N	\N	\N	\N
b7907e56-9fff-48a4-8266-cd65969925f0	\N	3173b915-2011-4c6f-8802-fe0c5871ab21	617.14	INR	completed	payu	{"payu_id": "403993715534334253", "product_info": "Order  amazon  3173b915-2011-4c6f-8802-fe0c5871ab21 ", "all_quote_ids": ["3173b915-2011-4c6f-8802-fe0c5871ab21"], "customer_info": {"name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "9999999999"}, "transaction_id": "PAYU_1752459103521_rq5yym04p"}	2025-07-14 02:11:58.597572+00	2025-07-14 02:11:58.597572+00	0.00	0	f	\N	\N	\N	\N	\N
d20d7da3-7229-4ad0-9268-b1fc9a744186	\N	0795b513-a941-4857-abe2-e56ab8e8ccdc	1756.94	INR	completed	payu	{"payu_id": "403993715534334285", "product_info": "Order  a  0795b513-a941-4857-abe2-e56ab8e8ccdc ", "all_quote_ids": ["0795b513-a941-4857-abe2-e56ab8e8ccdc"], "customer_info": {"name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "9999999999"}, "transaction_id": "PAYU_1752460289990_2cmyg1jaj"}	2025-07-14 02:31:45.698883+00	2025-07-14 02:31:45.698883+00	0.00	0	f	\N	\N	\N	\N	\N
\.


--
-- Data for Name: payment_ledger; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."payment_ledger" ("id", "quote_id", "payment_transaction_id", "payment_date", "payment_type", "payment_method", "gateway_code", "gateway_transaction_id", "amount", "currency", "reference_number", "bank_reference", "customer_reference", "status", "verified_by", "verified_at", "financial_transaction_id", "parent_payment_id", "payment_proof_message_id", "gateway_response", "metadata", "notes", "created_by", "created_at", "updated_at") FROM stdin;
e9a09023-6274-47ae-8620-dc6e779ac2d7	0a962e66-aa01-4039-8636-e7d3be7bdf41	\N	2025-07-13 14:37:05.9871+00	customer_payment	bank_transfer	bank_transfer	\N	617.1400	INR	CLEAN_TEST_001	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Testing clean payment flow	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 14:37:05.9871+00	2025-07-13 14:37:05.9871+00
3705095c-fefb-4161-91ee-034190443a5d	4773a891-5726-4168-ad24-13d0b30f0a3e	\N	2025-07-13 15:15:40.406678+00	customer_payment	bank_transfer	bank_transfer	\N	617.1400	INR	Manual verification	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Payment verified: INR 617.14 received	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 15:15:40.406678+00	2025-07-13 15:15:40.406678+00
c31b3447-d31b-42e2-bf91-3c0e0ebd5746	38cafd36-e142-455b-a6e8-13fded5c10d9	\N	2025-07-13 15:29:23.601529+00	customer_payment	bank_transfer	bank_transfer	\N	617.1400	INR	Manual verification	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Payment verified: INR 617.14 received	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 15:29:23.601529+00	2025-07-13 15:29:23.601529+00
b61a0221-b410-4256-92b9-c5c68288ee2a	38cafd36-e142-455b-a6e8-13fded5c10d9	\N	2025-07-13 17:48:20.011445+00	customer_payment	bank_transfer	bank_transfer	\N	22.0000	INR	Manual verification	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Payment verified: INR 22.00 received	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 17:48:20.011445+00	2025-07-13 17:48:20.011445+00
d4158b97-b623-4328-b5a2-ec2468e5f3f4	7807eb4f-7c5f-4ebd-af96-dae0a2758db4	\N	2025-07-13 00:00:00+00	customer_payment	bank_transfer	bank_transfer	\N	100.0000	NPR	TEST-PAYMENT-003	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Test payment fixed v2	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 18:11:08.003586+00	2025-07-13 18:11:08.003586+00
e7fd01e1-32e9-402c-a729-ceb88e83381a	7807eb4f-7c5f-4ebd-af96-dae0a2758db4	\N	2025-07-13 00:00:00+00	customer_payment	bank_transfer	bank_transfer	\N	10784.5600	INR	MANUAL-1752433117645	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}		130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 18:58:37.91044+00	2025-07-13 18:58:37.91044+00
85e067af-de32-4b02-a24a-a7ccf613a942	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	\N	2025-07-13 00:00:00+00	customer_payment	bank_transfer	bank_transfer	\N	12025.3000	INR	PROOF-cc1de42f-db13-4fc6-a8ad-bc4079147e8a	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Payment verified from uploaded proof	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 19:09:31.375411+00	2025-07-13 19:09:31.375411+00
a2243da5-9c4c-4367-94cd-d3205924cb8b	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	\N	2025-07-13 00:00:00+00	customer_payment	bank_transfer	bank_transfer	\N	12025.3000	INR	PROOF-cc1de42f-db13-4fc6-a8ad-bc4079147e8a	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Payment verified from uploaded proof	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 19:09:39.68354+00	2025-07-13 19:09:39.68354+00
a6647d02-75eb-4340-a372-a417b8a4b07b	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	\N	2025-07-13 00:00:00+00	customer_payment	bank_transfer	bank_transfer	\N	12025.3000	INR	PROOF-cc1de42f-db13-4fc6-a8ad-bc4079147e8a	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	Payment verified from uploaded proof	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 19:09:45.510486+00	2025-07-13 19:09:45.510486+00
fb433219-b431-4667-b8ec-8caff5673b03	28cd6de8-f7d6-4eaf-90df-275b41f0beaf	\N	2025-07-13 00:00:00+00	customer_payment	bank_transfer	bank_transfer	\N	12025.3900	INR	MANUAL-1752433826020	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}		130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 19:10:26.263257+00	2025-07-13 19:10:26.263257+00
4c1d608b-9b91-4c75-8d49-b338c0ad88c5	620a1f3e-88a7-4c2a-bf37-d0134d1718ee	\N	2025-07-13 21:26:03.118306+00	refund	bank_transfer	bank_transfer	\N	-11.0000	INR	REF-1752441963013	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	REFUND: price_adjustment -	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 21:26:03.118306+00	2025-07-13 21:26:03.118306+00
207c405f-2cfd-4b05-bdc8-bcc2b1d4bdac	620a1f3e-88a7-4c2a-bf37-d0134d1718ee	\N	2025-07-13 21:28:02.995685+00	refund	original_method	manual	\N	-1.0000	INR	REF-1752442082906	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	REFUND: price_adjustment -	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-13 21:28:02.995685+00	2025-07-13 21:28:02.995685+00
e86b2206-513b-40b5-9efe-2779a647dc2c	2ef979ce-e712-41e3-8b67-9f6268da344c	\N	2025-07-14 02:00:45.35+00	refund	payu	\N	\N	-617.1400	INR	REF-1752458445350	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	order_cancelled -	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-14 02:00:45.404418+00	2025-07-14 02:00:45.404418+00
196cab8e-bdbf-4060-9823-28b8bda8adb8	3173b915-2011-4c6f-8802-fe0c5871ab21	\N	2025-07-14 02:13:30.514+00	refund	payu	\N	\N	-1.0000	INR	REF-1752459210514	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	price_adjustment -	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-14 02:13:30.5901+00	2025-07-14 02:13:30.5901+00
c1d02130-50cb-4555-8d13-eb4c82b2b630	0795b513-a941-4857-abe2-e56ab8e8ccdc	\N	2025-07-14 02:40:50.67+00	refund	payu	\N	\N	-1.0000	INR	REF-1752460850670	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	price_adjustment -	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-14 02:40:50.731995+00	2025-07-14 02:40:50.731995+00
2ee584c1-b2d7-437d-8467-3bfee542d3d5	0795b513-a941-4857-abe2-e56ab8e8ccdc	\N	2025-07-14 02:46:00.251+00	refund	payu	\N	\N	-1.0000	INR	REF-1752461160251	\N	\N	completed	\N	\N	\N	\N	\N	\N	{}	price_adjustment -	130ec316-970f-429f-8cb8-ff9adf751248	2025-07-14 02:46:00.336475+00	2025-07-14 02:46:00.336475+00
\.


--
-- Data for Name: refund_requests; Type: TABLE DATA; Schema: public; Owner: postgres
--

COPY "public"."refund_requests" ("id", "quote_id", "payment_ledger_id", "refund_type", "requested_amount", "approved_amount", "currency", "reason_code", "reason_description", "customer_notes", "internal_notes", "status", "requested_by", "requested_at", "reviewed_by", "reviewed_at", "processed_by", "processed_at", "completed_at", "refund_method", "metadata", "created_at", "updated_at") FROM stdin;
