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

INSERT INTO "auth"."audit_log_entries" ("instance_id", "id", "payload", "created_at", "ip_address") VALUES
	('00000000-0000-0000-0000-000000000000', 'f64f835c-1710-41e4-8c1e-56c1d9586f2a', '{"action":"user_confirmation_requested","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-10 11:49:00.830223+00', ''),
	('00000000-0000-0000-0000-000000000000', '2b3e8021-ffbc-410f-94ff-99df2120abe4', '{"action":"user_signedup","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-10 11:49:35.844537+00', ''),
	('00000000-0000-0000-0000-000000000000', '91520669-3a2b-4133-8fd4-68d439f6f63c', '{"action":"login","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-10 11:50:41.830141+00', ''),
	('00000000-0000-0000-0000-000000000000', '2879d03f-64a6-4556-b213-4e0ac37fce51', '{"action":"logout","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 12:24:30.085801+00', ''),
	('00000000-0000-0000-0000-000000000000', '804e6948-671f-4b3b-ad67-f2fd79f1de13', '{"action":"user_recovery_requested","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-07-10 12:24:36.008018+00', ''),
	('00000000-0000-0000-0000-000000000000', 'f4d93527-9af8-4b22-8c52-23f273eed0d7', '{"action":"login","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 12:25:35.12108+00', ''),
	('00000000-0000-0000-0000-000000000000', '8850ce13-469b-40d5-9111-cb26919dc7e6', '{"action":"login","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-10 12:32:50.338245+00', ''),
	('00000000-0000-0000-0000-000000000000', '987773e1-5c0e-4583-9310-0e70f8f24a4d', '{"action":"logout","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 12:32:52.669504+00', ''),
	('00000000-0000-0000-0000-000000000000', '023f75e3-0d79-4b2a-9643-770ca7641075', '{"action":"user_recovery_requested","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-07-10 12:32:59.436255+00', ''),
	('00000000-0000-0000-0000-000000000000', '81294119-0291-4b4e-939a-4fe01cbf0e43', '{"action":"login","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 12:33:20.340644+00', ''),
	('00000000-0000-0000-0000-000000000000', '56abe5ac-4651-44ef-9de1-40062a243c09', '{"action":"logout","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 12:33:37.430641+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd2fe81de-2a97-49eb-8093-c6bca06ba51b', '{"action":"user_confirmation_requested","actor_id":"3c4e03d6-9882-49d7-84a7-9f01e477ced5","actor_username":"rnkbohra18@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-10 12:42:32.781236+00', ''),
	('00000000-0000-0000-0000-000000000000', '233ebe50-ccdc-40f2-9237-951e4dabfed8', '{"action":"user_signedup","actor_id":"3c4e03d6-9882-49d7-84a7-9f01e477ced5","actor_username":"rnkbohra18@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-10 12:42:42.108641+00', ''),
	('00000000-0000-0000-0000-000000000000', '09309ef1-de7c-41fc-a5a3-5c8411334592', '{"action":"user_recovery_requested","actor_id":"3c4e03d6-9882-49d7-84a7-9f01e477ced5","actor_username":"rnkbohra18@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-07-10 12:42:59.085221+00', ''),
	('00000000-0000-0000-0000-000000000000', '297c07ac-6a58-4d97-bf43-1b99c8b76d49', '{"action":"login","actor_id":"3c4e03d6-9882-49d7-84a7-9f01e477ced5","actor_username":"rnkbohra18@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 12:43:05.896135+00', ''),
	('00000000-0000-0000-0000-000000000000', '0aa8eb43-365e-4c71-a5b7-eeded03e0b7e', '{"action":"user_confirmation_requested","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-10 13:12:53.140723+00', ''),
	('00000000-0000-0000-0000-000000000000', 'efa5b0ac-392e-4b95-a336-257204fcea4e', '{"action":"user_signedup","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-10 13:13:04.951657+00', ''),
	('00000000-0000-0000-0000-000000000000', 'ecabcf6e-f0ea-4814-9f32-f38adebf69f6', '{"action":"login","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-10 13:13:09.529041+00', ''),
	('00000000-0000-0000-0000-000000000000', '825ce353-7543-4c44-98d6-c9285a3d4c47', '{"action":"logout","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 13:13:11.146686+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aa77524b-8d4f-490f-a94b-5bd815a44ce9', '{"action":"user_recovery_requested","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-07-10 13:13:19.248507+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a4a8f645-261b-4838-9c05-ccc9fcc00c82', '{"action":"login","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 13:13:30.049771+00', ''),
	('00000000-0000-0000-0000-000000000000', 'be5720e5-8fb8-4ecd-8908-f7389ba9b090', '{"action":"login","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-10 13:42:12.541501+00', ''),
	('00000000-0000-0000-0000-000000000000', 'c01d8a12-e504-4a0f-b6ca-afa3e19a6b43', '{"action":"logout","actor_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","actor_username":"rnkbohra@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-10 13:42:14.914838+00', ''),
	('00000000-0000-0000-0000-000000000000', '3c7a7f7b-a105-42be-84f9-72207030afed', '{"action":"user_repeated_signup","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-10 13:42:51.777952+00', ''),
	('00000000-0000-0000-0000-000000000000', '773b1f00-ab87-40cc-becb-ca0134b4e593', '{"action":"user_repeated_signup","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-10 16:35:37.228987+00', ''),
	('00000000-0000-0000-0000-000000000000', '456e2a7f-1bcb-4bc1-bd8a-299933d0f8a6', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"rnkbohra18@gmail.com","user_id":"3c4e03d6-9882-49d7-84a7-9f01e477ced5","user_phone":""}}', '2025-07-11 03:37:09.415331+00', ''),
	('00000000-0000-0000-0000-000000000000', 'a74a5e93-32b8-4b6b-86a8-be66c4183b21', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"rnkbohra@gmail.com","user_id":"5f1ccf7c-6a7f-4c27-9eb1-dad263962fc2","user_phone":""}}', '2025-07-11 03:37:09.410562+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd24b7eed-70c6-4453-9a7d-74f05ae18a10', '{"action":"user_recovery_requested","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user"}', '2025-07-11 03:37:18.302923+00', ''),
	('00000000-0000-0000-0000-000000000000', '9f31887b-a408-4acf-b411-23b6b813cd3e', '{"action":"login","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-11 03:38:21.239658+00', ''),
	('00000000-0000-0000-0000-000000000000', '97591d57-eafd-4bd0-804f-46f6ecd1ab6e', '{"action":"logout","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account"}', '2025-07-11 03:41:43.507011+00', ''),
	('00000000-0000-0000-0000-000000000000', '1f0c5b69-94b7-4f07-a633-9a4bf85c96de', '{"action":"user_repeated_signup","actor_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-11 04:34:03.03093+00', ''),
	('00000000-0000-0000-0000-000000000000', '63cf99d0-1eb3-4d21-8a0e-ec5fb63f961c', '{"action":"user_deleted","actor_id":"00000000-0000-0000-0000-000000000000","actor_username":"service_role","actor_via_sso":false,"log_type":"team","traits":{"user_email":"iwbtracking@gmail.com","user_id":"685d4a8f-3d73-43b8-8fff-d7ed904b9eb8","user_phone":""}}', '2025-07-11 04:35:05.845651+00', ''),
	('00000000-0000-0000-0000-000000000000', '888a7e08-f430-47fc-af8a-b79a25c3d9f1', '{"action":"user_confirmation_requested","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"user","traits":{"provider":"email"}}', '2025-07-11 04:35:13.649455+00', ''),
	('00000000-0000-0000-0000-000000000000', '14417b65-08bc-47e7-a53e-ef5da27d0c87', '{"action":"user_signedup","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"team","traits":{"provider":"email"}}', '2025-07-11 04:35:25.365845+00', ''),
	('00000000-0000-0000-0000-000000000000', '5eb4487b-9ea0-4441-9a08-035b4b445d86', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 12:16:16.557482+00', ''),
	('00000000-0000-0000-0000-000000000000', '6075e317-eb51-4c17-9111-e653519ea941', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 12:16:16.564744+00', ''),
	('00000000-0000-0000-0000-000000000000', '569db1a6-e92b-4795-82ca-a62e57fdc098', '{"action":"login","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-11 13:41:12.706648+00', ''),
	('00000000-0000-0000-0000-000000000000', '184e600a-c4cd-4047-813b-55c9e2941ecc', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 13:55:18.652924+00', ''),
	('00000000-0000-0000-0000-000000000000', 'fa05e953-101d-446a-aa2f-a574adccf205', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 13:55:18.654416+00', ''),
	('00000000-0000-0000-0000-000000000000', '83380f6a-5cc8-45ea-bf50-3e9e9f05b8f0', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 14:39:30.982178+00', ''),
	('00000000-0000-0000-0000-000000000000', '08cb4d96-68b2-4360-8fc7-873ae0202f18', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 14:39:30.983683+00', ''),
	('00000000-0000-0000-0000-000000000000', '6c372929-7216-4381-bbd4-82e4508160f8', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 15:39:07.229409+00', ''),
	('00000000-0000-0000-0000-000000000000', '58cb7ac6-e4c5-4ae0-a149-b46f6f5151b6', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 15:39:07.230957+00', ''),
	('00000000-0000-0000-0000-000000000000', '534030f9-8f77-4d52-a6fb-2648c0b0bdae', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 16:48:54.726663+00', ''),
	('00000000-0000-0000-0000-000000000000', '12b23d39-239a-4341-8a28-d3892d70a583', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 16:48:54.728179+00', ''),
	('00000000-0000-0000-0000-000000000000', 'bfb8de7d-0f79-490b-835c-966faeb849de', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 16:48:55.360263+00', ''),
	('00000000-0000-0000-0000-000000000000', '72d6db42-8d08-4095-8128-08c17f6a9345', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 17:48:20.412981+00', ''),
	('00000000-0000-0000-0000-000000000000', 'aeaf8208-2efd-4e3c-8e81-8abfb4f2c331', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 17:48:20.418502+00', ''),
	('00000000-0000-0000-0000-000000000000', '0207f7fd-cd2f-4888-8984-034293618004', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 18:46:54.878136+00', ''),
	('00000000-0000-0000-0000-000000000000', '33cc683a-9622-463c-86f5-92d93114d9cd', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 18:46:54.882427+00', ''),
	('00000000-0000-0000-0000-000000000000', '8d71926a-7d1a-42ee-b9d5-51086cfc7b74', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 23:43:40.42027+00', ''),
	('00000000-0000-0000-0000-000000000000', '861a2799-b47c-40aa-b669-889429a6aeb6', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-11 23:43:40.437223+00', ''),
	('00000000-0000-0000-0000-000000000000', '5e1bf41f-7e1b-46dd-8111-98852fa835b7', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 00:42:08.237581+00', ''),
	('00000000-0000-0000-0000-000000000000', '46f1136b-a720-45bc-b985-520cddffbe98', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 00:42:08.243472+00', ''),
	('00000000-0000-0000-0000-000000000000', '21862287-434d-4b59-a636-fb6771053adc', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 01:43:03.271661+00', ''),
	('00000000-0000-0000-0000-000000000000', 'e36cf5c2-e154-42e3-83ac-d91ae8064cbf', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 01:43:03.27936+00', ''),
	('00000000-0000-0000-0000-000000000000', '1c34afbf-1055-4dbf-acfe-7dbe345219f3', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 02:41:18.988112+00', ''),
	('00000000-0000-0000-0000-000000000000', '2802dfb0-801e-4de4-9bc7-48cfcb2b64ad', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 02:41:18.997248+00', ''),
	('00000000-0000-0000-0000-000000000000', '37831569-54d5-4ddc-8507-841c3bc6632f', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 03:40:04.895413+00', ''),
	('00000000-0000-0000-0000-000000000000', '864a8826-bfc3-4276-90ba-83b8a9ea6d9d', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 03:40:04.907905+00', ''),
	('00000000-0000-0000-0000-000000000000', '5265ab41-8717-4d5b-b116-bdaf926d4724', '{"action":"login","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"account","traits":{"provider":"email"}}', '2025-07-12 03:58:42.852671+00', ''),
	('00000000-0000-0000-0000-000000000000', '4c807153-001b-4da7-a4e5-64251bfeeffe', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 05:02:58.299927+00', ''),
	('00000000-0000-0000-0000-000000000000', 'd56b7af6-22e9-41cf-a1fa-f40fd33d2c33', '{"action":"token_revoked","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 05:02:58.305527+00', ''),
	('00000000-0000-0000-0000-000000000000', '5a4dd535-80e0-4659-bacd-193cbacb55a3', '{"action":"token_refreshed","actor_id":"c5d8ea1d-d801-4362-8150-7d605e7765fc","actor_username":"iwbtracking@gmail.com","actor_via_sso":false,"log_type":"token"}', '2025-07-12 05:03:22.742395+00', '');


--
-- Data for Name: flow_state; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: users; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."users" ("instance_id", "id", "aud", "role", "email", "encrypted_password", "email_confirmed_at", "invited_at", "confirmation_token", "confirmation_sent_at", "recovery_token", "recovery_sent_at", "email_change_token_new", "email_change", "email_change_sent_at", "last_sign_in_at", "raw_app_meta_data", "raw_user_meta_data", "is_super_admin", "created_at", "updated_at", "phone", "phone_confirmed_at", "phone_change", "phone_change_token", "phone_change_sent_at", "email_change_token_current", "email_change_confirm_status", "banned_until", "reauthentication_token", "reauthentication_sent_at", "is_sso_user", "deleted_at", "is_anonymous") VALUES
	('00000000-0000-0000-0000-000000000000', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'authenticated', 'authenticated', 'iwbtracking@gmail.com', '$2a$10$jhoQYBpTDePUzlANfTg2Gerjll0vY8YpLWsj10tCHLRS7reFB9oNu', '2025-07-11 04:35:25.366518+00', NULL, '', '2025-07-11 04:35:13.650743+00', '', NULL, '', '', NULL, '2025-07-12 03:58:42.861707+00', '{"provider": "email", "providers": ["email"]}', '{"sub": "c5d8ea1d-d801-4362-8150-7d605e7765fc", "name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "email_verified": true, "phone_verified": false}', NULL, '2025-07-11 04:35:13.628933+00', '2025-07-12 05:02:58.312001+00', NULL, NULL, '', '', NULL, '', 0, NULL, '', NULL, false, NULL, false);


--
-- Data for Name: identities; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."identities" ("provider_id", "user_id", "identity_data", "provider", "last_sign_in_at", "created_at", "updated_at", "id") VALUES
	('c5d8ea1d-d801-4362-8150-7d605e7765fc', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{"sub": "c5d8ea1d-d801-4362-8150-7d605e7765fc", "name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "email_verified": true, "phone_verified": false}', 'email', '2025-07-11 04:35:13.644871+00', '2025-07-11 04:35:13.644942+00', '2025-07-11 04:35:13.644942+00', '2123977b-ecc4-4c0f-9f5d-7590796ce22c');


--
-- Data for Name: instances; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sessions; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."sessions" ("id", "user_id", "created_at", "updated_at", "factor_id", "aal", "not_after", "refreshed_at", "user_agent", "ip", "tag") VALUES
	('6229baa5-933c-40f1-af6d-5dd3511ef3e1', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 04:35:25.37277+00', '2025-07-11 13:55:18.665687+00', NULL, 'aal1', NULL, '2025-07-11 13:55:18.665617', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '27.34.64.206', NULL),
	('7ef57997-5961-45db-b56d-835e25547276', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:41:12.720457+00', '2025-07-12 03:40:04.91893+00', NULL, 'aal1', NULL, '2025-07-12 03:40:04.918856', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '27.34.64.243', NULL),
	('99a4b9a4-42c0-4bbc-a1d6-6eeb95ff3efc', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 03:58:42.861792+00', '2025-07-12 05:03:22.746331+00', NULL, 'aal1', NULL, '2025-07-12 05:03:22.746253', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/138.0.0.0 Safari/537.36', '27.34.64.243', NULL);


--
-- Data for Name: mfa_amr_claims; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."mfa_amr_claims" ("session_id", "created_at", "updated_at", "authentication_method", "id") VALUES
	('6229baa5-933c-40f1-af6d-5dd3511ef3e1', '2025-07-11 04:35:25.378874+00', '2025-07-11 04:35:25.378874+00', 'otp', '57b07d7c-55a5-4c1c-a119-70f71ab7d0a4'),
	('7ef57997-5961-45db-b56d-835e25547276', '2025-07-11 13:41:12.73623+00', '2025-07-11 13:41:12.73623+00', 'password', 'df8f45e8-b21d-4410-9955-026131d6c6c3'),
	('99a4b9a4-42c0-4bbc-a1d6-6eeb95ff3efc', '2025-07-12 03:58:42.87733+00', '2025-07-12 03:58:42.87733+00', 'password', '5da878e0-68ca-4c11-b1da-5431a61eaf64');


--
-- Data for Name: mfa_factors; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: mfa_challenges; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: one_time_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: refresh_tokens; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--

INSERT INTO "auth"."refresh_tokens" ("instance_id", "id", "token", "user_id", "revoked", "created_at", "updated_at", "parent", "session_id") VALUES
	('00000000-0000-0000-0000-000000000000', 54, 'e2q64eciqplt', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 04:35:25.374884+00', '2025-07-11 12:16:16.565325+00', NULL, '6229baa5-933c-40f1-af6d-5dd3511ef3e1'),
	('00000000-0000-0000-0000-000000000000', 55, 'hyuvpfyr6rtu', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 12:16:16.576802+00', '2025-07-11 13:55:18.655539+00', 'e2q64eciqplt', '6229baa5-933c-40f1-af6d-5dd3511ef3e1'),
	('00000000-0000-0000-0000-000000000000', 57, 'y7hrdermdlzj', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', false, '2025-07-11 13:55:18.657619+00', '2025-07-11 13:55:18.657619+00', 'hyuvpfyr6rtu', '6229baa5-933c-40f1-af6d-5dd3511ef3e1'),
	('00000000-0000-0000-0000-000000000000', 56, 'xo2t763f4d2h', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 13:41:12.726867+00', '2025-07-11 14:39:30.984259+00', NULL, '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 58, 'yhc3coweftml', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 14:39:30.986043+00', '2025-07-11 15:39:07.23154+00', 'xo2t763f4d2h', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 59, 'p2lhp57t23nd', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 15:39:07.234355+00', '2025-07-11 16:48:54.728776+00', 'yhc3coweftml', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 60, 'tnfwhizmh25w', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 16:48:54.730268+00', '2025-07-11 17:48:20.419119+00', 'p2lhp57t23nd', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 61, 'izvy4glbx67v', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 17:48:20.422034+00', '2025-07-11 18:46:54.883002+00', 'tnfwhizmh25w', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 62, '3jvdx63j6d2u', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 18:46:54.886721+00', '2025-07-11 23:43:40.437872+00', 'izvy4glbx67v', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 63, 'mb6rnocape45', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-11 23:43:40.451097+00', '2025-07-12 00:42:08.244679+00', '3jvdx63j6d2u', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 64, 'ujwwr24vq7hg', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-12 00:42:08.250399+00', '2025-07-12 01:43:03.279938+00', 'mb6rnocape45', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 65, 'qor2smbmvhgb', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-12 01:43:03.284361+00', '2025-07-12 02:41:18.998032+00', 'ujwwr24vq7hg', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 66, 'akucl2ltskxb', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-12 02:41:19.002971+00', '2025-07-12 03:40:04.909754+00', 'qor2smbmvhgb', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 67, 'vpdvdl7oma2m', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', false, '2025-07-12 03:40:04.913266+00', '2025-07-12 03:40:04.913266+00', 'akucl2ltskxb', '7ef57997-5961-45db-b56d-835e25547276'),
	('00000000-0000-0000-0000-000000000000', 68, '7zl2fm4szyms', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', true, '2025-07-12 03:58:42.867748+00', '2025-07-12 05:02:58.306161+00', NULL, '99a4b9a4-42c0-4bbc-a1d6-6eeb95ff3efc'),
	('00000000-0000-0000-0000-000000000000', 69, 'hc2raw2on6wp', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', false, '2025-07-12 05:02:58.309343+00', '2025-07-12 05:02:58.309343+00', '7zl2fm4szyms', '99a4b9a4-42c0-4bbc-a1d6-6eeb95ff3efc');


--
-- Data for Name: sso_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_providers; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: saml_relay_states; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: sso_domains; Type: TABLE DATA; Schema: auth; Owner: supabase_auth_admin
--



--
-- Data for Name: authenticated_checkout_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."authenticated_checkout_sessions" ("id", "session_token", "user_id", "quote_ids", "temporary_shipping_address", "payment_currency", "payment_method", "payment_amount", "status", "expires_at", "created_at", "updated_at") VALUES
	('435f364c-c7b1-4e19-ba4b-f0f6b6ab639c', 'cs_1752236287215_3yn8n8ljd', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d0d9e2cf-7375-45ea-a08d-ac133b09db0b}', NULL, 'INR', 'payu', 1.00, 'active', '2025-07-11 14:18:07.215+00', '2025-07-11 12:18:07.338296+00', '2025-07-11 12:18:07.338296+00'),
	('6b4809f5-b7eb-40a9-89c2-1e2e784afb16', 'cs_1752236382234_9fca9t8bk', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d0d9e2cf-7375-45ea-a08d-ac133b09db0b}', NULL, 'INR', 'payu', 1.00, 'active', '2025-07-11 14:19:42.235+00', '2025-07-11 12:19:42.344941+00', '2025-07-11 12:19:42.344941+00'),
	('3e9f22b2-0561-4e33-bcd2-c01d4a47b5df', 'cs_1752236627481_bfsrmyo8j', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d0d9e2cf-7375-45ea-a08d-ac133b09db0b}', NULL, 'INR', 'bank_transfer', 1.00, 'active', '2025-07-11 14:23:47.481+00', '2025-07-11 12:23:47.576843+00', '2025-07-11 12:23:47.576843+00'),
	('da5682d0-3bf3-4d02-bedd-c0f84fec3d9f', 'cs_1752237222639_pjonkjxta', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d0d9e2cf-7375-45ea-a08d-ac133b09db0b,c40d76fd-e891-46af-975f-684ae16fa915}', NULL, 'INR', 'payu', 2.02, 'active', '2025-07-11 14:33:42.639+00', '2025-07-11 12:33:42.771364+00', '2025-07-11 12:33:42.771364+00'),
	('4d58c715-fae9-48de-adc3-5ff39cc80cc3', 'cs_1752241286524_8kqd4zek5', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{c40d76fd-e891-46af-975f-684ae16fa915}', NULL, 'INR', 'payu', 1.02, 'active', '2025-07-11 15:41:26.524+00', '2025-07-11 13:41:26.751386+00', '2025-07-11 13:41:26.751386+00'),
	('60af8826-2c2d-4bfe-8f3a-b9ab76e10bea', 'cs_1752241479255_7asy9rbyu', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{c40d76fd-e891-46af-975f-684ae16fa915}', NULL, 'INR', 'bank_transfer', 1.02, 'active', '2025-07-11 15:44:39.255+00', '2025-07-11 13:44:39.456348+00', '2025-07-11 13:44:39.456348+00'),
	('5f24d8db-eb84-45ec-9036-d5265f5c7f72', 'cs_1752241594318_is6x0o2y4', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ec2dd22c-7427-406b-bd25-0244e2887bce}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 15:46:34.318+00', '2025-07-11 13:46:34.535321+00', '2025-07-11 13:46:34.535321+00'),
	('480bd781-5d82-4de4-b315-7902e64fa7ce', 'cs_1752241876160_2nx5lc3gb', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3ee5a939-b249-41bb-88ed-033cbbf485fd,4337bcd2-7897-4a93-bdb3-aebe0aac9a20,ec2dd22c-7427-406b-bd25-0244e2887bce}', NULL, 'INR', 'payu', 2108.16, 'active', '2025-07-11 15:51:16.16+00', '2025-07-11 13:51:16.340927+00', '2025-07-11 13:51:16.340927+00'),
	('f7141113-484f-4a52-9280-10bc463facc1', 'cs_1752242000710_93ovlwlwd', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3ee5a939-b249-41bb-88ed-033cbbf485fd,4337bcd2-7897-4a93-bdb3-aebe0aac9a20,ec2dd22c-7427-406b-bd25-0244e2887bce}', NULL, 'INR', 'payu', 2108.16, 'active', '2025-07-11 15:53:20.71+00', '2025-07-11 13:53:20.878191+00', '2025-07-11 13:53:20.878191+00'),
	('795c812c-bba2-4607-b09a-0e6120707906', 'cs_1752242210743_9i4q75foq', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f496c4d2-91e4-4c0e-84e7-577bd5ae5523,3ee5a939-b249-41bb-88ed-033cbbf485fd,4337bcd2-7897-4a93-bdb3-aebe0aac9a20,ec2dd22c-7427-406b-bd25-0244e2887bce}', NULL, 'INR', 'payu', 2725.30, 'active', '2025-07-11 15:56:50.743+00', '2025-07-11 13:56:50.938497+00', '2025-07-11 13:56:50.938497+00'),
	('8f38d460-37dc-455f-9a4c-ef9eca8959c0', 'cs_1752242515074_3uv5yf5wj', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:01:55.074+00', '2025-07-11 14:01:55.247335+00', '2025-07-11 14:01:55.247335+00'),
	('0ce82178-dc53-40f6-b47c-b01b7528381e', 'cs_1752242870804_967yhtgug', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'paytm', 617.14, 'active', '2025-07-11 16:07:50.804+00', '2025-07-11 14:07:50.983863+00', '2025-07-11 14:07:50.983863+00'),
	('e7b96bad-4efb-4ce6-a1c6-c76d2f7f2604', 'cs_1752242876803_9wo799d5w', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:07:56.803+00', '2025-07-11 14:07:56.97646+00', '2025-07-11 14:07:56.97646+00'),
	('ef6c39d6-2818-4b10-bd18-f7f59e490915', 'cs_1752243829667_czn6t6267', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f356fc0c-be0f-48d8-9415-997d97648c3d,d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 1234.28, 'active', '2025-07-11 16:23:49.667+00', '2025-07-11 14:23:49.826263+00', '2025-07-11 14:23:49.826263+00'),
	('bbb9a63e-76cd-4cd8-a177-7c9d87c79d61', 'cs_1752244057530_1djhnwhi0', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:27:37.53+00', '2025-07-11 14:27:37.695847+00', '2025-07-11 14:27:37.695847+00'),
	('cbfc384a-f3f8-4b47-b5a1-d28f5abb2ba2', 'cs_1752244470955_ejpe6g44q', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:34:30.955+00', '2025-07-11 14:34:31.112673+00', '2025-07-11 14:34:31.112673+00'),
	('5c2a9a3a-dbf5-4d7e-85f0-5914bcc355e7', 'cs_1752244853423_u8sm6lvvy', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:40:53.423+00', '2025-07-11 14:40:53.647356+00', '2025-07-11 14:40:53.647356+00'),
	('361d1279-4c4f-4e0d-b6a3-fb4bb8a63812', 'cs_1752245305858_nuku497jh', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:48:25.858+00', '2025-07-11 14:48:26.042589+00', '2025-07-11 14:48:26.042589+00'),
	('c7f3e822-6c40-49fc-a3a1-843cf0531283', 'cs_1752245417998_rym2ijgk4', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:50:17.998+00', '2025-07-11 14:50:18.177687+00', '2025-07-11 14:50:18.177687+00'),
	('c4616740-817e-4828-8b75-fa9c11ac3abe', 'cs_1752245545631_37husli9v', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:52:25.631+00', '2025-07-11 14:52:25.815037+00', '2025-07-11 14:52:25.815037+00'),
	('b5348287-fb13-43c9-b44a-629426b639d7', 'cs_1752245744680_oyygcdodt', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:55:44.68+00', '2025-07-11 14:55:44.869402+00', '2025-07-11 14:55:44.869402+00'),
	('6d8175cb-4441-4699-a623-274fe7d38e42', 'cs_1752245974782_83nd20si5', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 16:59:34.782+00', '2025-07-11 14:59:34.915033+00', '2025-07-11 14:59:34.915033+00'),
	('7aa3d1e8-fcd8-47d7-8ec0-c4a8ffa0e0c0', 'cs_1752246716740_cm869xy0y', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 17:11:56.74+00', '2025-07-11 15:11:56.897107+00', '2025-07-11 15:11:56.897107+00'),
	('77e35684-14c7-4506-98a4-4d4c96249aef', 'cs_1752246877328_65siqej5f', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 17:14:37.328+00', '2025-07-11 15:14:37.500262+00', '2025-07-11 15:14:37.500262+00'),
	('57b275ec-0488-4af4-bc55-371402b6ff9d', 'cs_1752247110843_40hec9h98', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f356fc0c-be0f-48d8-9415-997d97648c3d,d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 1234.28, 'active', '2025-07-11 17:18:30.843+00', '2025-07-11 15:18:31.01892+00', '2025-07-11 15:18:31.01892+00'),
	('cf62c765-60c9-4598-bbc5-46115e1ff265', 'cs_1752247360828_ddnnkbg6t', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f356fc0c-be0f-48d8-9415-997d97648c3d,d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 1234.28, 'active', '2025-07-11 17:22:40.828+00', '2025-07-11 15:22:41.006942+00', '2025-07-11 15:22:41.006942+00'),
	('bfd89dff-79bd-4ea7-a3f5-80f7f7535dcd', 'cs_1752247585835_06pv18y5d', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f356fc0c-be0f-48d8-9415-997d97648c3d,d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 1234.28, 'active', '2025-07-11 17:26:25.835+00', '2025-07-11 15:26:25.997628+00', '2025-07-11 15:26:25.997628+00'),
	('18730fa0-eb46-41d8-86e7-57f009faf600', 'cs_1752247789915_4fjf0pfr7', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f356fc0c-be0f-48d8-9415-997d97648c3d,d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 1234.28, 'active', '2025-07-11 17:29:49.915+00', '2025-07-11 15:29:50.094324+00', '2025-07-11 15:29:50.094324+00'),
	('bd20fdc7-cff4-44c2-bd63-f3d5bc7e6c80', 'cs_1752248359486_2xkyr1900', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 17:39:19.486+00', '2025-07-11 15:39:19.637971+00', '2025-07-11 15:39:19.637971+00'),
	('942f9580-47d4-4108-9591-f9a72de4a970', 'cs_1752252551077_vh355cy97', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f356fc0c-be0f-48d8-9415-997d97648c3d}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 18:49:11.077+00', '2025-07-11 16:49:11.239418+00', '2025-07-11 16:49:11.239418+00'),
	('1be28062-5261-4657-8b59-c87423245860', 'cs_1752252668510_kw9vfzsnj', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{f356fc0c-be0f-48d8-9415-997d97648c3d}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 18:51:08.51+00', '2025-07-11 16:51:08.636927+00', '2025-07-11 16:51:08.636927+00'),
	('0feed64d-4174-4f74-853b-d414d2004a61', 'cs_1752252857493_jju27qeyo', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{d2d7d0a4-23eb-447c-8c4f-7e7081009bdc}', NULL, 'INR', 'payu', 617.14, 'active', '2025-07-11 18:54:17.493+00', '2025-07-11 16:54:17.614035+00', '2025-07-11 16:54:17.614035+00'),
	('b07dd8e6-8651-4ff3-8d44-99ac1222a5ef', 'cs_1752256018617_4bm00m7s1', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 19:46:58.617+00', '2025-07-11 17:46:58.754406+00', '2025-07-11 17:46:58.754406+00'),
	('d7b41be7-bb8f-46aa-b49e-8e04964480d1', 'cs_1752256256366_sxsb90zof', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 19:50:56.366+00', '2025-07-11 17:50:56.513815+00', '2025-07-11 17:50:56.513815+00'),
	('e7bef9b5-b1f4-427a-8ec0-6561d4970c27', 'cs_1752256278698_8m4rl5urd', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 19:51:18.698+00', '2025-07-11 17:51:18.833778+00', '2025-07-11 17:51:18.833778+00'),
	('6847d12b-35f4-44b7-9371-5b21348d806d', 'cs_1752256488215_84zz1jc0x', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 19:54:48.215+00', '2025-07-11 17:54:48.716518+00', '2025-07-11 17:54:48.716518+00'),
	('b72bc0bc-52bf-40c2-9b10-9a16799bdb7e', 'cs_1752256591965_4mg1xdhfl', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 19:56:31.965+00', '2025-07-11 17:56:32.486308+00', '2025-07-11 17:56:32.486308+00'),
	('d81b499e-9a52-4966-8d5e-1472eeb94644', 'cs_1752256686766_shqiihi1j', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 19:58:06.767+00', '2025-07-11 17:58:06.957683+00', '2025-07-11 17:58:06.957683+00'),
	('1debae71-3e7f-443d-9240-2b18d157f7ba', 'cs_1752256780636_fmlfnyzto', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 19:59:40.636+00', '2025-07-11 17:59:41.119004+00', '2025-07-11 17:59:41.119004+00'),
	('fb5da59c-d62e-4ef8-aaf3-e2e9fcc6bb59', 'cs_1752256893833_9bs6lrieq', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 20:01:33.834+00', '2025-07-11 18:01:33.960458+00', '2025-07-11 18:01:33.960458+00'),
	('e8372b5b-0b0c-469d-ad87-ed60dffcf99f', 'cs_1752257046092_zotns0ey7', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 20:04:06.092+00', '2025-07-11 18:04:06.2048+00', '2025-07-11 18:04:06.2048+00'),
	('69b0367d-edff-4562-a15c-18ab7f1814d8', 'cs_1752257514458_h8ufevmg3', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3}', NULL, 'USD', 'bank_transfer', 13.38, 'active', '2025-07-11 20:11:54.459+00', '2025-07-11 18:11:54.677237+00', '2025-07-11 18:11:54.677237+00'),
	('c5120e4e-e7fe-4158-a7c8-e3afcb135fa3', 'cs_1752257653337_qzmchlr7n', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 20:14:13.338+00', '2025-07-11 18:14:13.433699+00', '2025-07-11 18:14:13.433699+00'),
	('4993f688-f5c7-4225-b469-dc1dbd779e88', 'cs_1752258040661_qn92jkrp8', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 20:20:40.661+00', '2025-07-11 18:20:41.162844+00', '2025-07-11 18:20:41.162844+00'),
	('71eb0b60-1de4-4881-bcb4-9d21e420e7e9', 'cs_1752258363039_jvygbmvbp', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 26.76, 'active', '2025-07-11 20:26:03.039+00', '2025-07-11 18:26:03.127058+00', '2025-07-11 18:26:03.127058+00'),
	('a020bfb8-b305-4440-a821-97bac75a4d32', 'cs_1752258658742_430evdma7', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'bank_transfer', 26.76, 'active', '2025-07-11 20:30:58.742+00', '2025-07-11 18:30:59.183503+00', '2025-07-11 18:30:59.183503+00'),
	('7d75392b-1641-4c9b-b752-cb0f3df9c35d', 'cs_1752258664455_gplw8qdrj', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'bank_transfer', 26.76, 'active', '2025-07-11 20:31:04.455+00', '2025-07-11 18:31:04.509084+00', '2025-07-11 18:31:04.509084+00'),
	('41f68ab7-44e6-44e1-bcb3-88c95f6d4419', 'cs_1752258709589_ulfyclob8', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 26.76, 'active', '2025-07-11 20:31:49.589+00', '2025-07-11 18:31:49.689388+00', '2025-07-11 18:31:49.689388+00'),
	('c76e4fa8-bff9-421d-a71d-a7005cdfefad', 'cs_1752259616344_fehl55oj6', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'bank_transfer', 26.76, 'active', '2025-07-11 20:46:56.344+00', '2025-07-11 18:46:56.416772+00', '2025-07-11 18:46:56.416772+00'),
	('20100892-030b-4770-b390-3317b0cdfaa5', 'cs_1752259626363_oyzphwxkq', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 26.76, 'active', '2025-07-11 20:47:06.363+00', '2025-07-11 18:47:06.431146+00', '2025-07-11 18:47:06.431146+00'),
	('9e3699bd-53a0-4b1c-baf0-f401cfb7cc2b', 'cs_1752259704229_sgqveca75', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'bank_transfer', 26.76, 'active', '2025-07-11 20:48:24.229+00', '2025-07-11 18:48:24.338079+00', '2025-07-11 18:48:24.338079+00'),
	('fe37b97e-2796-4702-a782-5b4d19d30518', 'cs_1752259709359_xa7jx1p0q', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 26.76, 'active', '2025-07-11 20:48:29.359+00', '2025-07-11 18:48:29.454382+00', '2025-07-11 18:48:29.454382+00'),
	('fe6917c8-b8cd-432d-9702-0bca71b6a72c', 'cs_1752259933494_7q62uma93', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'bank_transfer', 26.76, 'active', '2025-07-11 20:52:13.494+00', '2025-07-11 18:52:14.034211+00', '2025-07-11 18:52:14.034211+00'),
	('09bcccf0-a591-458b-ad51-e3244f3b0c98', 'cs_1752259940958_unttfl12m', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 26.76, 'active', '2025-07-11 20:52:20.958+00', '2025-07-11 18:52:21.046547+00', '2025-07-11 18:52:21.046547+00'),
	('9e53fea6-6c18-4716-96d8-0490678222dd', 'cs_1752260109220_kle42uez8', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'bank_transfer', 26.76, 'active', '2025-07-11 20:55:09.22+00', '2025-07-11 18:55:09.701216+00', '2025-07-11 18:55:09.701216+00'),
	('3dfd2a32-a94e-4b44-90cd-b8c53af4ff63', 'cs_1752260114327_w2m98ej2h', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 26.76, 'active', '2025-07-11 20:55:14.327+00', '2025-07-11 18:55:14.409672+00', '2025-07-11 18:55:14.409672+00'),
	('92dee22b-645c-45e0-98f8-a382d3833c15', 'cs_1752260210028_mki6ote0v', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 20:56:50.028+00', '2025-07-11 18:56:50.098128+00', '2025-07-11 18:56:50.098128+00'),
	('338d076a-8f13-49aa-a3c1-f1b50f28ea9f', 'cs_1752260338051_y756l5s9r', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 20:58:58.051+00', '2025-07-11 18:58:58.100436+00', '2025-07-11 18:58:58.100436+00'),
	('9cb31137-06ef-4a3b-b706-4c102a5bbc84', 'cs_1752260620843_e6ld86erg', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 21:03:40.843+00', '2025-07-11 19:03:41.000387+00', '2025-07-11 19:03:41.000387+00'),
	('97596928-b490-4372-8eb9-9cb8997e0978', 'cs_1752260812143_3vc2jpmhr', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 13.38, 'active', '2025-07-11 21:06:52.143+00', '2025-07-11 19:06:52.286459+00', '2025-07-11 19:06:52.286459+00'),
	('089ea046-22e7-4570-994b-060ede3b21ed', 'cs_1752278423867_mdelf6ail', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{874ce0c6-12b1-44a4-9677-4226de669861,ff107c51-ef2f-4340-b35b-a38bde8cb87b}', NULL, 'USD', 'paypal', 38.08, 'active', '2025-07-12 02:00:23.867+00', '2025-07-12 00:00:24.109352+00', '2025-07-12 00:00:24.109352+00'),
	('6a1ae9b9-81e2-4605-bc78-f97f5ad5aa36', 'cs_1752278602300_a5h52j8f9', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861}', NULL, 'USD', 'paypal', 38.08, 'active', '2025-07-12 02:03:22.3+00', '2025-07-12 00:03:22.559498+00', '2025-07-12 00:03:22.559498+00'),
	('a9e1042c-831c-4349-950c-fca980642a5d', 'cs_1752279457567_7mq87jbse', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b}', NULL, 'USD', 'paypal', 24.70, 'active', '2025-07-12 02:17:37.568+00', '2025-07-12 00:17:37.827111+00', '2025-07-12 00:17:37.827111+00'),
	('a6679dca-2d30-449b-9cba-2257764dcd2a', 'cs_1752280585220_jts275esf', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b}', NULL, 'USD', 'paypal', 24.70, 'active', '2025-07-12 02:36:25.221+00', '2025-07-12 00:36:25.442827+00', '2025-07-12 00:36:25.442827+00'),
	('0915ed28-71b0-41fa-8213-34299bbb353b', 'cs_1752282154506_1sbeasvjr', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b}', NULL, 'USD', 'paypal', 24.70, 'active', '2025-07-12 03:02:34.506+00', '2025-07-12 01:02:34.601615+00', '2025-07-12 01:02:34.601615+00'),
	('cca1a39f-4c7b-4da0-95e4-26819431fe73', 'cs_1752285005448_y0ovvp8w9', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ff107c51-ef2f-4340-b35b-a38bde8cb87b}', NULL, 'USD', 'bank_transfer', 24.70, 'active', '2025-07-12 03:50:05.448+00', '2025-07-12 01:50:05.507901+00', '2025-07-12 01:50:05.507901+00'),
	('e973fdf3-da1c-44b1-b240-a3917ba7a8d9', 'cs_1752285406533_jt3b8dbez', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ee829559-6e39-4474-9833-ca66f0f9b852}', NULL, 'USD', 'airwallex', 13.38, 'active', '2025-07-12 03:56:46.533+00', '2025-07-12 01:56:46.590216+00', '2025-07-12 01:56:46.590216+00'),
	('6339eaf4-dbc1-4f8f-9de2-65ceba05446e', 'cs_1752285572664_f65wduhu7', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ee829559-6e39-4474-9833-ca66f0f9b852}', NULL, 'USD', 'airwallex', 13.38, 'active', '2025-07-12 03:59:32.664+00', '2025-07-12 01:59:32.738776+00', '2025-07-12 01:59:32.738776+00'),
	('d11c90fc-4dfd-403c-be33-f5b3cd9b2bc2', 'cs_1752285657898_ie728aufa', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ee829559-6e39-4474-9833-ca66f0f9b852}', NULL, 'USD', 'airwallex', 13.38, 'active', '2025-07-12 04:00:57.898+00', '2025-07-12 02:00:58.004258+00', '2025-07-12 02:00:58.004258+00'),
	('9c1d7b74-d98d-436b-806b-f6c0e064776f', 'cs_1752285883001_l1fo97l25', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ee829559-6e39-4474-9833-ca66f0f9b852}', NULL, 'USD', 'airwallex', 13.38, 'active', '2025-07-12 04:04:43.001+00', '2025-07-12 02:04:43.089691+00', '2025-07-12 02:04:43.089691+00'),
	('0c9f61f9-0b30-46eb-a2d1-e54975c260e6', 'cs_1752286733753_68j5zhsz5', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{ee829559-6e39-4474-9833-ca66f0f9b852}', NULL, 'USD', 'airwallex', 13.38, 'active', '2025-07-12 04:18:53.753+00', '2025-07-12 02:18:53.859786+00', '2025-07-12 02:18:53.859786+00');


--
-- Data for Name: country_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."country_settings" ("code", "name", "currency", "rate_from_usd", "sales_tax", "vat", "min_shipping", "additional_shipping", "additional_weight", "weight_unit", "volumetric_divisor", "payment_gateway_fixed_fee", "payment_gateway_percent_fee", "purchase_allowed", "shipping_allowed", "payment_gateway", "created_at", "updated_at", "priority_thresholds", "minimum_payment_amount", "decimal_places", "thousand_separator", "decimal_separator", "symbol_position", "symbol_space") VALUES
	('US', 'United States', 'USD', 1.000000, 0.08, 0.00, 10.00, 0.00, 2.00, 'lbs', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', '{"low": 0, "normal": 500, "urgent": 2000}', 10.00, 2, ',', '.', 'before', false),
	('IN', 'India', 'INR', 83.000000, 0.00, 0.18, 500.00, 0.00, 100.00, 'kg', 5000, 0.00, 2.50, true, true, 'payu', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', '{"low": 0, "normal": 41500, "urgent": 166000}', 10.00, 2, ',', '.', 'before', false),
	('NP', 'Nepal', 'NPR', 133.000000, 0.00, 0.13, 1000.00, 0.00, 200.00, 'kg', 5000, 0.00, 1.50, true, true, 'esewa', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', '{"low": 0, "normal": 66500, "urgent": 266000}', 10.00, 2, ',', '.', 'before', false),
	('JP', 'Japan', 'JPY', 150.000000, 0.00, 0.10, 1500.00, 0.00, 200.00, 'kg', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', '{"low": 0, "normal": 75000, "urgent": 300000}', 10.00, 2, ',', '.', 'before', false),
	('GB', 'United Kingdom', 'GBP', 0.790000, 0.00, 0.20, 12.00, 0.00, 2.00, 'kg', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', '{"low": 0, "normal": 395, "urgent": 1580}', 10.00, 2, ',', '.', 'before', false),
	('AU', 'Australia', 'AUD', 1.520000, 0.00, 0.10, 15.00, 0.00, 2.00, 'kg', 5000, 0.00, 2.90, true, true, 'stripe', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', '{"low": 0, "normal": 760, "urgent": 3040}', 10.00, 2, ',', '.', 'before', false);


--
-- Data for Name: bank_account_details; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."bank_account_details" ("id", "account_name", "account_number", "bank_name", "branch_name", "iban", "swift_code", "country_code", "is_fallback", "custom_fields", "field_labels", "display_order", "is_active", "created_at", "updated_at", "currency_code", "destination_country", "upi_id", "upi_qr_string", "payment_qr_url", "instructions") VALUES
	('e5b3c8ad-0bc1-4c35-9cfc-98fa6a081441', 'iWB Enterprises', '924020057946752', 'Axis Bank - Current', NULL, NULL, NULL, 'IN', false, '{"ifsc": "UTIB0000056"}', '{}', 0, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'INR', NULL, NULL, NULL, NULL, NULL),
	('9896c5f1-a51e-402a-93d8-fc582925910f', 'I WISH BAG', '1780100000613201', 'Citizens Bank - Teku', NULL, NULL, NULL, 'NP', false, '{}', '{}', 0, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'NPR', NULL, NULL, NULL, NULL, NULL),
	('ed1c0b1d-49e6-409c-9b75-b1ab37b32079', 'IWISHBAG PTE. LTD.', '8456220037', 'Community Federal Savings Bank', NULL, NULL, NULL, 'US', false, '{"ach": "026073150", "bank_address": "89-16 Jamaica Ave, Woodhaven, NY, United States, 11421"}', '{}', 0, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'USD', NULL, NULL, NULL, NULL, NULL);


--
-- Data for Name: blog_authors; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."blog_authors" ("id", "user_id", "bio", "avatar_url", "social_links", "created_at", "updated_at") VALUES
	('da7173f4-0104-4b71-b96f-45678a6f00ae', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', NULL, NULL, '{}', '2025-07-12 02:19:44.646982+00', '2025-07-12 02:19:44.646982+00');


--
-- Data for Name: blog_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."blog_categories" ("id", "name", "slug", "description", "created_at", "updated_at") VALUES
	('0a712d44-9030-4e7e-bd07-88b9f4ec3207', 'Shipping Guides', 'shipping-guides', 'Step-by-step guides for international shipping from various marketplaces', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('875b0c72-2e25-4525-8d53-18a4030dea4a', 'Country Spotlights', 'country-spotlights', 'Detailed shipping information for specific countries including customs and regulations', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('8b8127bf-d632-48a7-8326-7a2fa5eb9224', 'Marketplace Tips', 'marketplace-tips', 'Tips and tricks for shopping from Amazon, Flipkart, eBay, Alibaba and more', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('021ae8b5-4c02-40f7-abba-b17227d6579d', 'Customer Stories', 'customer-stories', 'Success stories and testimonials from our satisfied customers', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('1e4195fe-a866-4a6b-b2ff-0c39290d8e29', 'Cost Savings', 'cost-savings', 'Learn how to reduce your international shipping costs', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('27b694e4-2804-4e74-8ca2-29d23671092b', 'Product Reviews', 'product-reviews', 'Reviews of popular products available for international shipping', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('24be0915-3745-420b-ad24-432bb6401921', 'Industry News', 'industry-news', 'Latest updates on customs, regulations, and shipping industry trends', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('d704a9bf-e991-4d9b-ac36-ec9803bd4969', 'How-To Guides', 'how-to-guides', 'Detailed tutorials on using iwishBag services effectively', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00');


--
-- Data for Name: blog_posts; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."blog_posts" ("id", "title", "slug", "excerpt", "content", "featured_image", "author_id", "status", "featured", "read_time", "meta_title", "meta_description", "meta_keywords", "published_at", "created_at", "updated_at") VALUES
	('84fc79f5-7311-41d1-98c5-fe001dc054a8', 'fdsa', 'fdsa-1', 'fdsa', 'fdsa', '', 'da7173f4-0104-4b71-b96f-45678a6f00ae', 'draft', false, 1, '', '', NULL, NULL, '2025-07-12 02:26:11.396596+00', '2025-07-12 02:26:11.396596+00'),
	('76513892-9a72-44b3-919c-ebc950c85bf9', 'fdsa fdsa ', 'fdsafd sa', 'fdsa  fds', 'fdsa fdsa ', '', 'da7173f4-0104-4b71-b96f-45678a6f00ae', 'draft', false, 1, 'f dsa', ' fdsa', '{fdsa}', NULL, '2025-07-12 02:19:44.793004+00', '2025-07-12 03:44:54.757308+00'),
	('a8576327-58a9-483e-bb01-56f09dceaae1', 'Complete Guide to Shopping from Amazon US and Shipping to India', 'complete-guide-amazon-us-to-india', 'Everything you need to know about buying from Amazon.com and getting your products delivered to India safely and affordably.', '<h2>Shopping from Amazon US to India Made Easy</h2>
<p>With iwishBag, shopping from Amazon US and shipping to India has never been simpler. This comprehensive guide will walk you through the entire process, from selecting products to receiving them at your doorstep.</p>

<h3>Why Shop from Amazon US?</h3>
<ul>
  <li><strong>Wider Selection:</strong> Access to millions of products not available in India</li>
  <li><strong>Better Prices:</strong> Often cheaper even after shipping and customs</li>
  <li><strong>Latest Products:</strong> Get new releases before they arrive in India</li>
  <li><strong>Authentic Brands:</strong> Direct from manufacturers and authorized sellers</li>
</ul>

<h3>Step-by-Step Process with iwishBag</h3>
<ol>
  <li><strong>Get Your Free US Address:</strong> Sign up with iwishBag to receive your personal US shipping address</li>
  <li><strong>Shop on Amazon.com:</strong> Use your iwishBag US address at checkout</li>
  <li><strong>We Receive Your Package:</strong> Your items arrive at our US warehouse</li>
  <li><strong>Consolidation & Repackaging:</strong> We combine multiple orders to save on shipping</li>
  <li><strong>Customs Documentation:</strong> We handle all paperwork and declarations</li>
  <li><strong>Fast Delivery to India:</strong> Receive your package in 7-10 business days</li>
</ol>

<h3>Understanding Costs</h3>
<p>Your total cost includes:</p>
<ul>
  <li>Product price from Amazon</li>
  <li>US domestic shipping (often free with Prime)</li>
  <li>International shipping charges</li>
  <li>Customs duty (varies by product category)</li>
  <li>iwishBag service fee (transparent pricing)</li>
</ul>

<div class="cta-box">
  <h4>Ready to start shopping?</h4>
  <p>Get an instant quote for your Amazon purchase!</p>
  <a href="/quote" class="btn-primary">Calculate Shipping Cost</a>
</div>

<h3>Pro Tips for Smart Shopping</h3>
<ul>
  <li><strong>Bundle Orders:</strong> Combine multiple items to save on shipping</li>
  <li><strong>Check Restrictions:</strong> Some items like batteries have shipping limitations</li>
  <li><strong>Compare Total Cost:</strong> Use our calculator before purchasing</li>
  <li><strong>Track Everything:</strong> Monitor your package from purchase to delivery</li>
</ul>

<h3>Customs Duty Explained</h3>
<p>Import duties in India vary by product category:</p>
<table>
  <tr><th>Category</th><th>Duty Rate</th></tr>
  <tr><td>Electronics</td><td>18-28%</td></tr>
  <tr><td>Clothing</td><td>20-40%</td></tr>
  <tr><td>Books</td><td>0%</td></tr>
  <tr><td>Toys</td><td>20%</td></tr>
</table>

<p>Our calculator includes estimated customs duties so you know the total cost upfront!</p>', 'https://images.unsplash.com/photo-1556742049-0cfed4f6a45d?w=1200&h=600&fit=crop', 'da7173f4-0104-4b71-b96f-45678a6f00ae', 'published', true, 2, 'Amazon US to India Shipping Guide | iwishBag', 'Complete guide on how to shop from Amazon.com and ship to India. Learn about costs, customs, delivery times and save money with iwishBag.', NULL, '2025-07-10 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('9ee5a7c6-9001-418f-94ac-49191e2d398b', 'How to Ship Flipkart Products Internationally from India', 'flipkart-international-shipping-guide', 'Learn how iwishBag helps you buy from Flipkart and ship to any country worldwide. Perfect for NRIs and international customers.', '<h2>Flipkart International Shipping with iwishBag</h2>
<p>Want to buy from Flipkart but live outside India? iwishBag makes it possible to shop from India''s largest e-commerce platform and ship worldwide!</p>

<h3>Why International Customers Love Flipkart</h3>
<ul>
  <li><strong>Exclusive Indian Products:</strong> Traditional wear, handicrafts, and local brands</li>
  <li><strong>Competitive Prices:</strong> Great deals during Big Billion Days and sales</li>
  <li><strong>Wide Selection:</strong> From electronics to fashion to home decor</li>
  <li><strong>Quality Assurance:</strong> Flipkart Assured products guarantee quality</li>
</ul>

<h3>Countries We Ship To</h3>
<p>iwishBag currently ships Flipkart orders to:</p>
<ul>
  <li>United States & Canada</li>
  <li>United Kingdom & Europe</li>
  <li>Australia & New Zealand</li>
  <li>Middle East (UAE, Saudi Arabia, Qatar)</li>
  <li>Southeast Asia (Singapore, Malaysia)</li>
  <li>And many more!</li>
</ul>

<h3>How It Works</h3>
<ol>
  <li><strong>Share Product Links:</strong> Send us Flipkart product URLs</li>
  <li><strong>Get Instant Quote:</strong> We calculate total cost including shipping</li>
  <li><strong>Approve & Pay:</strong> Review the quote and make payment</li>
  <li><strong>We Handle Everything:</strong> Purchase, quality check, and international shipping</li>
  <li><strong>Track Your Order:</strong> Real-time updates until delivery</li>
</ol>

<h3>Popular Flipkart Categories for International Shipping</h3>
<div class="category-grid">
  <div class="category-item">
    <h4>Fashion & Clothing</h4>
    <p>Sarees, kurtas, ethnic wear, and Indian fashion brands</p>
  </div>
  <div class="category-item">
    <h4>Home & Kitchen</h4>
    <p>Indian cookware, pressure cookers, spice boxes</p>
  </div>
  <div class="category-item">
    <h4>Books & Media</h4>
    <p>Indian literature, regional language books, Bollywood DVDs</p>
  </div>
  <div class="category-item">
    <h4>Health & Beauty</h4>
    <p>Ayurvedic products, Indian cosmetics, herbal supplements</p>
  </div>
</div>

<div class="cta-box">
  <h4>Start Shopping from Flipkart Today!</h4>
  <p>Send us your Flipkart wishlist for a free quote</p>
  <a href="/quote" class="btn-primary">Get Started</a>
</div>', 'https://images.unsplash.com/photo-1563013544-824ae1b704d3?w=1200&h=600&fit=crop', 'da7173f4-0104-4b71-b96f-45678a6f00ae', 'published', false, 2, 'Flipkart International Shipping | Ship from India Worldwide', 'Buy from Flipkart and ship internationally with iwishBag. We help NRIs and global customers shop from India''s largest e-commerce site.', NULL, '2025-07-07 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('3b2ef9c4-5483-4e96-b958-aac3174357df', 'Shipping from eBay to Nepal: Complete Guide 2024', 'ebay-to-nepal-shipping-guide', 'Detailed guide on buying from eBay and shipping to Nepal. Learn about customs, costs, and delivery times.', '<h2>eBay Shopping and Shipping to Nepal</h2>
<p>Nepal''s growing e-commerce market is discovering the vast selection available on eBay. With iwishBag, you can now easily purchase from eBay and have items delivered directly to Nepal.</p>

<h3>Why eBay for Nepal Shoppers?</h3>
<ul>
  <li><strong>Unique Items:</strong> Vintage, collectibles, and hard-to-find products</li>
  <li><strong>Competitive Bidding:</strong> Get great deals through auctions</li>
  <li><strong>Global Marketplace:</strong> Buy from sellers worldwide</li>
  <li><strong>Buyer Protection:</strong> eBay Money Back Guarantee</li>
</ul>

<h3>Nepal Customs Regulations</h3>
<p>Important information for shipping to Nepal:</p>
<ul>
  <li><strong>Duty Threshold:</strong> NPR 5,000 (items below this value may be duty-free)</li>
  <li><strong>Prohibited Items:</strong> Weapons, certain electronics, alcohol</li>
  <li><strong>Documentation:</strong> Invoice, packing list, and customs declaration required</li>
  <li><strong>Duty Rates:</strong> Vary from 5% to 80% depending on product category</li>
</ul>

<h3>Shipping Options to Nepal</h3>
<table>
  <tr>
    <th>Service</th>
    <th>Delivery Time</th>
    <th>Best For</th>
  </tr>
  <tr>
    <td>Express Air</td>
    <td>5-7 days</td>
    <td>Urgent items, electronics</td>
  </tr>
  <tr>
    <td>Standard Air</td>
    <td>10-14 days</td>
    <td>Regular purchases</td>
  </tr>
  <tr>
    <td>Economy</td>
    <td>20-30 days</td>
    <td>Non-urgent, heavy items</td>
  </tr>
</table>

<h3>Cost Breakdown Example</h3>
<p>For a $100 smartphone from eBay to Kathmandu:</p>
<ul>
  <li>Product Cost: $100</li>
  <li>eBay to US Warehouse: $10</li>
  <li>International Shipping: $25</li>
  <li>Nepal Customs Duty (15%): $15</li>
  <li>Service Fee: $10</li>
  <li><strong>Total: $160 (approx NPR 21,000)</strong></li>
</ul>

<h3>Tips for Nepal Shoppers</h3>
<ol>
  <li><strong>Check Seller Ratings:</strong> Buy from reputable eBay sellers</li>
  <li><strong>Understand Total Costs:</strong> Use our calculator before bidding</li>
  <li><strong>Consider Consolidation:</strong> Ship multiple items together</li>
  <li><strong>Track Your Package:</strong> Stay updated on customs clearance</li>
</ol>

<div class="testimonial">
  <p>"iwishBag made it so easy to get my vintage camera collection from eBay to Kathmandu. Great service!" - Rajesh S., Kathmandu</p>
</div>', 'https://images.unsplash.com/photo-1609901336192-6e12b86cc9e0?w=1200&h=600&fit=crop', 'da7173f4-0104-4b71-b96f-45678a6f00ae', 'published', false, 2, 'eBay to Nepal Shipping Guide | iwishBag 2024', 'Complete guide for shipping from eBay to Nepal. Learn about customs duties, shipping costs, and how to save money on international shipping.', NULL, '2025-07-05 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('d5d66840-2620-4d8a-9b9b-514a7f91ee63', 'Buying from Alibaba for Your Business: Small Order Guide', 'alibaba-small-business-buying-guide', 'Learn how to source products from Alibaba for your small business, even with minimum order quantities.', '<h2>Alibaba Sourcing for Small Businesses</h2>
<p>Many small businesses want to source from Alibaba but are deterred by high minimum order quantities (MOQs). iwishBag helps you navigate Alibaba and manage smaller orders efficiently.</p>

<h3>Benefits of Alibaba Sourcing</h3>
<ul>
  <li><strong>Factory Direct Pricing:</strong> Cut out middlemen</li>
  <li><strong>Customization Options:</strong> Private labeling and custom designs</li>
  <li><strong>Quality Suppliers:</strong> Verified manufacturers</li>
  <li><strong>Wide Product Range:</strong> Everything from electronics to textiles</li>
</ul>

<h3>Overcoming MOQ Challenges</h3>
<p>Strategies for small businesses:</p>
<ol>
  <li><strong>Find Low-MOQ Suppliers:</strong> Filter by "Low MOQ" on Alibaba</li>
  <li><strong>Use Alibaba Ready to Ship:</strong> Pre-made items with no MOQ</li>
  <li><strong>Negotiate with Suppliers:</strong> Many are flexible for repeat customers</li>
  <li><strong>Pool Orders:</strong> Combine with other businesses through iwishBag</li>
</ol>

<h3>iwishBag Alibaba Services</h3>
<ul>
  <li><strong>Supplier Verification:</strong> We verify legitimacy before ordering</li>
  <li><strong>Quality Inspection:</strong> Products checked before shipping</li>
  <li><strong>Sample Orders:</strong> Test products before bulk buying</li>
  <li><strong>Payment Protection:</strong> Secure transactions</li>
  <li><strong>Customs Handling:</strong> Complete documentation for smooth clearance</li>
</ul>

<h3>Popular Product Categories</h3>
<div class="product-grid">
  <div class="product-category">
    <h4>Electronics & Accessories</h4>
    <p>Phone cases, chargers, gadgets</p>
    <span>MOQ: 10-50 pieces</span>
  </div>
  <div class="product-category">
    <h4>Fashion & Jewelry</h4>
    <p>Trendy accessories, watches</p>
    <span>MOQ: 20-100 pieces</span>
  </div>
  <div class="product-category">
    <h4>Home & Garden</h4>
    <p>Decor, organizers, tools</p>
    <span>MOQ: 50-200 pieces</span>
  </div>
</div>

<h3>Cost Calculation Example</h3>
<p>For 50 phone cases at $2 each:</p>
<ul>
  <li>Product Cost: $100</li>
  <li>Domestic Shipping in China: $15</li>
  <li>International Shipping: $40</li>
  <li>Customs Duty (20%): $20</li>
  <li>iwishBag Service: $25</li>
  <li><strong>Total: $200 ($4 per piece landed cost)</strong></li>
</ul>

<div class="cta-box">
  <h4>Ready to Source from Alibaba?</h4>
  <p>Let us help you find reliable suppliers and manage your orders</p>
  <a href="/quote" class="btn-primary">Start Sourcing</a>
</div>', 'https://images.unsplash.com/photo-1553413077-190dd305871c?w=1200&h=600&fit=crop', 'da7173f4-0104-4b71-b96f-45678a6f00ae', 'published', false, 2, 'Alibaba Small Business Buying Guide | Source Products with iwishBag', 'Learn how to buy from Alibaba for your small business. Overcome MOQ challenges and source products efficiently with iwishBag.', NULL, '2025-07-02 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00'),
	('3dac2fc5-7386-49fb-88bf-14b16726ae51', 'How Priya Saved 40% on Wedding Shopping from US Stores', 'customer-story-priya-wedding-shopping', 'Real customer story: How a bride-to-be used iwishBag to shop for her wedding from US stores and saved thousands.', '<h2>Priya''s Wedding Shopping Success Story</h2>
<p class="lead">When Priya from Mumbai was planning her wedding, she wanted specific decorations and accessories from US stores that weren''t available in India. Here''s how iwishBag helped make her dream wedding a reality.</p>

<h3>The Challenge</h3>
<p>Priya had her heart set on:</p>
<ul>
  <li>Specific wedding decorations from Michaels and Hobby Lobby</li>
  <li>Bridesmaid gifts from Anthropologie</li>
  <li>Wedding favors from Etsy sellers</li>
  <li>Professional makeup products from Sephora</li>
</ul>
<p>Total budget: ₹2,00,000 (approximately $2,400)</p>

<h3>The iwishBag Solution</h3>
<p>Instead of asking relatives in the US or paying expensive shipping for each store, Priya used iwishBag''s consolidation service:</p>

<ol>
  <li><strong>Virtual US Address:</strong> Used one address for all stores</li>
  <li><strong>Consolidated Shipping:</strong> Combined 12 packages into 2 shipments</li>
  <li><strong>Customs Optimization:</strong> Properly declared items to minimize duties</li>
  <li><strong>Insurance:</strong> Protected high-value items</li>
</ol>

<h3>The Results</h3>
<div class="savings-breakdown">
  <h4>Cost Comparison:</h4>
  <table>
    <tr>
      <th>Method</th>
      <th>Estimated Cost</th>
    </tr>
    <tr>
      <td>Individual Store Shipping</td>
      <td>₹3,20,000</td>
    </tr>
    <tr>
      <td>Freight Forwarder</td>
      <td>₹2,80,000</td>
    </tr>
    <tr>
      <td>iwishBag Service</td>
      <td>₹1,92,000</td>
    </tr>
  </table>
  <p class="highlight">Total Savings: ₹1,28,000 (40% less than individual shipping!)</p>
</div>

<h3>Priya''s Shopping List</h3>
<ul>
  <li>Michaels: Paper flowers, LED lights, craft supplies - $400</li>
  <li>Anthropologie: 6 bridesmaid robes, jewelry - $600</li>
  <li>Etsy: Custom wedding signs, 100 favor boxes - $500</li>
  <li>Sephora: Professional makeup kit - $300</li>
  <li>Amazon: Photo booth props, other decorations - $600</li>
</ul>

<blockquote>
  <p>"iwishBag made my wedding shopping stress-free. I could focus on choosing the perfect items instead of worrying about shipping logistics. The team even helped me track down items that were out of stock!" - Priya M., Mumbai</p>
</blockquote>

<h3>Tips from Priya''s Experience</h3>
<ol>
  <li><strong>Plan Ahead:</strong> Start shopping 3 months before you need items</li>
  <li><strong>Use Sales:</strong> Time purchases with Black Friday or store sales</li>
  <li><strong>Consolidate:</strong> Wait to ship until all items arrive at warehouse</li>
  <li><strong>Communicate:</strong> The iwishBag team helped coordinate with sellers</li>
</ol>

<div class="cta-box">
  <h4>Planning a Special Event?</h4>
  <p>Let iwishBag help you shop internationally and save!</p>
  <a href="/quote" class="btn-primary">Start Shopping</a>
</div>', 'https://images.unsplash.com/photo-1519741497674-611481863552?w=1200&h=600&fit=crop', 'da7173f4-0104-4b71-b96f-45678a6f00ae', 'published', false, 2, 'Customer Success Story: 40% Savings on International Wedding Shopping', 'Read how Priya saved 40% on her wedding shopping from US stores using iwishBag consolidation service. Real customer success story.', NULL, '2025-06-30 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00', '2025-07-12 04:27:02.627047+00');


--
-- Data for Name: blog_comments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: blog_post_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."blog_post_categories" ("post_id", "category_id") VALUES
	('a8576327-58a9-483e-bb01-56f09dceaae1', '0a712d44-9030-4e7e-bd07-88b9f4ec3207'),
	('9ee5a7c6-9001-418f-94ac-49191e2d398b', '0a712d44-9030-4e7e-bd07-88b9f4ec3207'),
	('3b2ef9c4-5483-4e96-b958-aac3174357df', '0a712d44-9030-4e7e-bd07-88b9f4ec3207'),
	('3b2ef9c4-5483-4e96-b958-aac3174357df', '875b0c72-2e25-4525-8d53-18a4030dea4a'),
	('a8576327-58a9-483e-bb01-56f09dceaae1', '8b8127bf-d632-48a7-8326-7a2fa5eb9224'),
	('9ee5a7c6-9001-418f-94ac-49191e2d398b', '8b8127bf-d632-48a7-8326-7a2fa5eb9224'),
	('3b2ef9c4-5483-4e96-b958-aac3174357df', '8b8127bf-d632-48a7-8326-7a2fa5eb9224'),
	('a8576327-58a9-483e-bb01-56f09dceaae1', 'd704a9bf-e991-4d9b-ac36-ec9803bd4969'),
	('d5d66840-2620-4d8a-9b9b-514a7f91ee63', '8b8127bf-d632-48a7-8326-7a2fa5eb9224'),
	('3dac2fc5-7386-49fb-88bf-14b16726ae51', '021ae8b5-4c02-40f7-abba-b17227d6579d'),
	('d5d66840-2620-4d8a-9b9b-514a7f91ee63', '1e4195fe-a866-4a6b-b2ff-0c39290d8e29'),
	('3dac2fc5-7386-49fb-88bf-14b16726ae51', '1e4195fe-a866-4a6b-b2ff-0c39290d8e29'),
	('d5d66840-2620-4d8a-9b9b-514a7f91ee63', 'd704a9bf-e991-4d9b-ac36-ec9803bd4969');


--
-- Data for Name: blog_post_views; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."blog_post_views" ("id", "post_id", "user_id", "ip_address", "user_agent", "created_at") VALUES
	('e5250813-c22b-4a22-9e2c-d718ba181c84', 'a8576327-58a9-483e-bb01-56f09dceaae1', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', NULL, NULL, '2025-07-12 04:29:01.238801+00'),
	('e3274c98-ad9a-407b-93f2-597e670c3190', 'a8576327-58a9-483e-bb01-56f09dceaae1', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', NULL, NULL, '2025-07-12 04:29:32.729303+00');


--
-- Data for Name: payment_gateways; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."payment_gateways" ("id", "name", "code", "is_active", "supported_countries", "supported_currencies", "fee_percent", "fee_fixed", "config", "test_mode", "created_at", "updated_at", "description", "priority") VALUES
	('8fc98078-24cb-4f08-a5a0-7cb17980fec3', 'PayPal', 'paypal', true, '{US,CA,UK,EU,AU,SG,AE,SA,KW,QA,BH,OM,JP,KR,HK,TW,TH,MY,ID,PH,VN,BD,LK,PK}', '{USD,EUR,GBP,CAD,AUD,JPY,SGD,HKD,AED,SAR,KWD,QAR,BHD,OMR,KRW,TWD,THB,MYR,IDR,PHP,VND,BDT,LKR,PKR}', 2.90, 0.30, '{"mode": "sandbox", "priority": 2, "client_id": "", "brand_name": "iwishBag", "cancel_url": "/payment/cancel", "return_url": "/payment/success", "webhook_id": "", "description": "International payment gateway supporting multiple currencies and payment methods including credit/debit cards, bank accounts, and PayPal balance.", "user_action": "PAY_NOW", "landing_page": "BILLING", "client_secret": "", "webhook_endpoint": "/paypal-webhook", "shipping_preference": "SET_PROVIDED_ADDRESS", "currency_specific_limits": {"AED": {"max": 25000.00, "min": 5.00}, "EUR": {"max": 10000.00, "min": 1.00}, "GBP": {"max": 10000.00, "min": 1.00}, "JPY": {"max": 1000000.00, "min": 100.00}, "SAR": {"max": 25000.00, "min": 5.00}, "USD": {"max": 10000.00, "min": 1.00}}}', true, '2025-07-10 11:46:33.757228+00', '2025-07-12 06:36:41.0105+00', 'Global payment platform supporting multiple countries and currencies', 2),
	('92c377cf-4a85-4a35-b82c-672327114ea2', 'Airwallex', 'airwallex', true, '{US,CA,GB,AU,DE,FR,IT,ES,NL,SG,JP,HK,CN}', '{USD,EUR,GBP,CAD,AUD,JPY,SGD,AED,SAR,EGP,TRY}', 1.80, 0.30, '{"api_key": "8327ea1293f04fe717d6e58c4b3eba3ad77daa983782e3b38c83187bf9edd79a74c6b064552e2189e81c8b92b6bf0634", "client_id": "WbLqDfEqRGqS_6f3QE1BRg", "cancel_url": "/payment/cancel", "return_url": "/payment/success", "api_version": "2024-06-14", "environment": "production", "api_base_url": "https://api.airwallex.com", "auto_capture": true, "referrer_type": "iwishbag_integration", "webhook_events": ["payment_intent.succeeded", "payment_intent.failed"], "webhook_secret": "whsec_3bKEfX9yX2i4cQhixsp2SonAUoSQGI7k", "payment_method_types": ["card", "bank_transfer", "alipay", "wechat_pay"]}', false, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Global payments infrastructure for modern businesses', 4),
	('01f4990f-9c16-4679-bed1-734e361536a2', 'PayU', 'payu', true, '{IN}', '{INR}', 2.50, 0.00, '{"salt_key": "VIen2EwWiQbvsILF4Wt9p9Gh5ixOpSMe", "environment": "production", "merchant_id": "8725115", "payment_url": "https://test.payu.in/_payment", "merchant_key": "u7Ui5I"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Leading payment gateway in India supporting cards, UPI, net banking, and wallets', 5),
	('90144426-5a38-40f3-935e-2c5df620b18f', 'UPI', 'upi', true, '{IN}', '{INR}', 0.00, 0.00, NULL, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Unified Payments Interface for instant bank transfers', 6),
	('cd659f8d-57f2-4350-99ea-488af883f408', 'Paytm', 'paytm', true, '{IN}', '{INR}', 1.99, 0.00, NULL, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Leading mobile payments and financial services', 7),
	('ed930107-e39a-49d9-814e-7ab179dc3aea', 'Razorpay', 'razorpay', true, '{IN}', '{INR}', 2.00, 0.00, NULL, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Complete payments solution for Indian businesses', 3),
	('34164a6c-8c57-4a74-87f5-ab30b5cc2704', 'eSewa', 'esewa', true, '{NP}', '{NPR}', 1.50, 0.00, '{"secret_key": "test_esewa_secret", "environment": "test", "merchant_id": "test_esewa_merchant"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Nepal''s most popular digital wallet and payment service', 8),
	('2f0c1630-4612-4931-9f15-13463adca22e', 'Khalti', 'khalti', true, '{NP}', '{NPR}', 2.00, 0.00, '{"public_key": "test_khalti_public", "secret_key": "test_khalti_secret", "environment": "test"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Nepal''s digital wallet service', 9),
	('d75abe81-bf5c-4310-bf25-c59c3d9cab73', 'Cash on Delivery', 'cod', true, '{IN,NP,MY,TH,PH,ID,VN}', '{INR,NPR,MYR,THB,PHP,IDR,VND}', 0.00, 50.00, '{"max_amount_inr": 50000, "max_amount_npr": 80000, "verification_required": true}', false, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Pay with cash upon delivery', 14),
	('04679546-bc8a-47b6-9e81-927caf91de1b', 'Bank Transfer', 'bank_transfer', true, '{US,CA,GB,AU,IN,NP,SG,JP,MY,TH,PH,ID,VN,KR}', '{USD,CAD,GBP,AUD,INR,NPR,SGD,JPY,MYR,THB,PHP,IDR,VND,KRW}', 0.00, 0.00, NULL, false, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Direct bank transfer with manual verification', 13),
	('0f168729-bbcb-4753-b5c3-1251b7fcf702', 'GrabPay', 'grabpay', true, '{SG,MY,TH,PH,VN,ID}', '{SGD,MYR,THB,PHP,VND,IDR}', 1.50, 0.00, NULL, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Southeast Asia''s leading mobile wallet', 11),
	('29e33785-0ee3-414f-854a-a9f34e3157a8', 'Alipay', 'alipay', true, '{CN,HK,SG,MY,TH,PH,ID,IN}', '{CNY,HKD,SGD,MYR,THB,PHP,IDR,INR}', 1.80, 0.00, NULL, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'China''s leading mobile and online payment platform', 12),
	('d6224e3f-5a81-499a-92e9-20ed0f6c15cb', 'Fonepay', 'fonepay', true, '{NP}', '{NPR}', 1.50, 0.00, NULL, true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', 'Nepal''s mobile payment network', 10);


--
-- Data for Name: country_payment_preferences; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."country_payment_preferences" ("id", "country_code", "gateway_code", "priority", "is_active", "created_at", "updated_at") VALUES
	('a83d6a92-3245-4634-ae7e-dfd433894e44', 'GB', 'paypal', 1, true, '2025-07-11 17:42:13.040865+00', '2025-07-11 17:42:13.040865+00'),
	('208790de-e88b-409c-bb0c-ff5e6a209988', 'US', 'airwallex', 2, true, '2025-07-12 01:25:36.986953+00', '2025-07-12 01:25:36.986953+00'),
	('ce5f6117-e5a2-40ad-94f8-3fc8beddc96f', 'JP', 'airwallex', 3, true, '2025-07-12 01:25:36.986953+00', '2025-07-12 01:25:36.986953+00'),
	('d654e1b6-77cb-4d8f-9400-a5cceb542aaf', 'GB', 'airwallex', 2, true, '2025-07-12 01:25:36.986953+00', '2025-07-12 01:25:36.986953+00'),
	('f6bb85df-8686-4c41-90b6-ca8c71dfb52c', 'AU', 'airwallex', 2, true, '2025-07-12 01:25:36.986953+00', '2025-07-12 01:25:36.986953+00'),
	('3a6f84c5-6cd7-4deb-b81c-41e1969e714a', 'US', 'paypal', 1, true, '2025-07-11 17:42:13.040865+00', '2025-07-12 06:36:41.0105+00'),
	('f56b6f63-951f-498e-a06d-933a44912e1c', 'JP', 'paypal', 1, true, '2025-07-11 17:42:13.040865+00', '2025-07-12 06:36:41.0105+00'),
	('eac673f8-053f-49db-8eff-0553be5d1f5a', 'AU', 'paypal', 1, true, '2025-07-11 17:42:13.040865+00', '2025-07-12 06:36:41.0105+00');


--
-- Data for Name: customs_categories; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customs_categories" ("id", "name", "duty_percent", "created_at", "updated_at") VALUES
	('2e01fd62-56c4-440e-ad2a-d67550d8688f', 'Electronics', 5.00, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('f9b4553b-fe5e-4838-bb80-cf9afbfeda28', 'Clothing', 10.00, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('a1ebe2b1-2cb4-49fe-9084-6b86b2fc1367', 'Cosmetics', 15.00, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('cd0c4906-55a0-4bcf-bd19-300b84550cbc', 'Accessories', 20.00, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00');


--
-- Data for Name: customs_rules; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."customs_rules" ("id", "name", "priority", "is_active", "conditions", "actions", "advanced", "created_at", "updated_at", "origin_country", "destination_country") VALUES
	('71eee27f-2560-4635-8566-9c88d2ae4ed6', 'Electronics under 1kg', 1, true, '{"categories": ["electronics"], "priceRange": {"max": 1000, "min": 0}, "weightRange": {"max": 1, "min": 0}}', '{"dutyPercentage": 12.5, "customsCategory": "electronics_light", "requiresDocumentation": false}', '{}', '2025-07-10 11:46:26.719218+00', '2025-07-10 11:46:27.837548+00', 'US', 'US'),
	('1f30c5e3-3b49-454d-96d3-0c5fc7996e28', 'Electronics over 1kg', 2, true, '{"categories": ["electronics"], "weightRange": {"max": 999999, "min": 1}}', '{"dutyPercentage": 18.5, "customsCategory": "electronics_heavy", "requiresDocumentation": true}', '{}', '2025-07-10 11:46:26.719218+00', '2025-07-10 11:46:27.837548+00', 'US', 'US'),
	('6cd38428-cdc8-49d7-a867-743deda486bb', 'Clothing luxury', 3, true, '{"categories": ["clothing", "fashion"], "priceRange": {"max": 999999, "min": 200}}', '{"fixedDuty": 10, "dutyPercentage": 25.0, "customsCategory": "clothing_luxury"}', '{}', '2025-07-10 11:46:26.719218+00', '2025-07-10 11:46:27.837548+00', 'US', 'US'),
	('b8352c6e-6a02-47c9-a01e-6888f91436aa', 'General items', 10, true, '{}', '{"dutyPercentage": 0, "customsCategory": "general"}', '{}', '2025-07-10 11:46:26.719218+00', '2025-07-10 11:46:27.837548+00', 'US', 'US');


--
-- Data for Name: email_queue; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: email_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."email_settings" ("id", "setting_key", "setting_value", "description", "created_at", "updated_at") VALUES
	('3995f9ca-00e1-486b-aec7-3b637687361b', 'email_sending_enabled', 'true', 'Global toggle for enabling/disabling all email sending', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('9fda0156-76dd-4313-b803-abb205cb4800', 'cart_abandonment_enabled', 'true', 'Toggle for cart abandonment emails specifically', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('a3aed699-c45d-419b-8a42-8ce890dd3111', 'quote_notifications_enabled', 'true', 'Toggle for quote notification emails', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('482d961d-2f2a-41f3-98c4-97b0641e3021', 'order_notifications_enabled', 'true', 'Toggle for order notification emails', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('65c92823-11e5-4744-9d97-1815fec17b05', 'status_notifications_enabled', 'true', 'Toggle for status change notification emails', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00');


--
-- Data for Name: email_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."email_templates" ("id", "name", "subject", "html_content", "template_type", "variables", "is_active", "created_at", "updated_at") VALUES
	('1b481441-c352-47ee-b8a4-8c9e6de14b54', 'quote_confirmation', 'Your Quote Request Confirmation', 'Dear {{customer_name}},<br><br>Thank you for your quote request for {{product_name}}.<br><br>We will review your request and get back to you within 24 hours.<br><br>Quote ID: {{quote_id}}<br>Estimated Total: {{estimated_total}}<br><br>Best regards,<br>iWishBag Team', 'quote_notification', '{"quote_id": "string", "product_name": "string", "customer_name": "string", "estimated_total": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('136d8aff-1925-4daa-9c8b-22b1a59e081f', 'order_confirmation', 'Order Confirmation - {{order_id}}', 'Dear {{customer_name}},<br><br>Your order has been confirmed!<br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}}<br>Payment Method: {{payment_method}}<br><br>We will keep you updated on your order status.<br><br>Best regards,<br>iWishBag Team', 'order_notification', '{"order_id": "string", "total_amount": "string", "customer_name": "string", "payment_method": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('a75d8012-fceb-4e1d-b66f-fa718933747a', 'cart_abandonment_recovery', 'Complete Your Purchase - Your Cart is Waiting!', 'Hi there!<br><br>We noticed you left some items in your cart. Don''t let them get away!<br><br>Your cart contains {product_name} worth {cart_value}.<br><br>Complete your purchase now and enjoy your items!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"cart_value": "string", "product_name": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('4cd0ffe1-5314-42ce-bfd8-4319a0a96da6', 'cart_abandonment_discount', 'Special Offer - 10% Off Your Abandoned Cart!', 'Hi there!<br><br>We noticed you left some items in your cart. As a special offer, we''re giving you 10% off!<br><br>Your cart contains {product_name} worth {cart_value}.<br>With your discount: {discounted_value}<br><br>Use code: ABANDON10<br><br>Complete your purchase now!<br><br>Best regards,<br>The Team', 'cart_abandonment', '{"cart_value": "string", "product_name": "string", "discounted_value": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('bca0d055-728f-4658-ad9d-01ad053ac6b5', 'bank_transfer_pending', 'Bank Transfer Instructions - Order {{order_id}}', 'Dear {{customer_name}},<br><br>Thank you for your order! Please complete the bank transfer to process your order.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br><br><strong>Bank Details:</strong><br>{{bank_details}}<br><br><strong>Important:</strong><br>• Please use your Order ID ({{order_id}}) as the payment reference<br>• Send payment confirmation to {{support_email}}<br>• Your order will be processed within 24 hours of payment confirmation<br><br>If you have any questions, please contact us.<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string", "support_email": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('28d7ebb5-e172-46d9-a16c-e53257135db9', 'cod_order_confirmed', 'Cash on Delivery Order Confirmed - {{order_id}}', 'Dear {{customer_name}},<br><br>Your Cash on Delivery order has been confirmed!<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Delivery Address: {{delivery_address}}<br><br><strong>What happens next:</strong><br>• We will process your order within 24 hours<br>• You will receive tracking information once shipped<br>• Payment will be collected upon delivery<br>• Please keep {{total_amount}} {{currency}} ready in cash<br><br>Thank you for choosing iWishBag!<br><br>Best regards,<br>iWishBag Team', 'order_notification', '{"currency": "string", "order_id": "string", "total_amount": "string", "customer_name": "string", "delivery_address": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('1a3268c8-1101-4b38-8fa6-51e187191ee2', 'payment_received', 'Payment Received - Order {{order_id}}', 'Dear {{customer_name}},<br><br>Great news! We have received your payment.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Payment Method: {{payment_method}}<br>Status: {{payment_status}}<br><br>Your order is now being processed and you will receive shipping information soon.<br><br>Thank you for your payment!<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"currency": "string", "order_id": "string", "amount_paid": "string", "customer_name": "string", "payment_method": "string", "payment_status": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('b9146219-0a4c-4ed7-8ead-57ed7dd85d02', 'partial_payment_received', 'Partial Payment Received - Order {{order_id}}', 'Dear {{customer_name}},<br><br>We have received a partial payment for your order.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Remaining Balance: {{remaining_amount}} {{currency}}<br><br><strong>Next Steps:</strong><br>Please pay the remaining balance of {{remaining_amount}} {{currency}} to process your order.<br><br>{{bank_details}}<br><br>If you have any questions about this payment, please contact us.<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"currency": "string", "order_id": "string", "amount_paid": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string", "remaining_amount": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('9d33caba-4f9c-4418-9459-6b928649eb10', 'overpayment_received', 'Overpayment Received - Order {{order_id}}', 'Dear {{customer_name}},<br><br>We have received your payment. However, the amount paid exceeds your order total.<br><br><strong>Payment Details:</strong><br>Order ID: {{order_id}}<br>Order Total: {{total_amount}} {{currency}}<br>Amount Paid: {{amount_paid}} {{currency}}<br>Excess Amount: {{excess_amount}} {{currency}}<br><br><strong>Refund Options:</strong><br>• We can refund the excess amount to your original payment method<br>• Keep as credit for future orders<br>• Apply to another pending order<br><br>Please reply to this email with your preference or contact our support team.<br><br>Best regards,<br>iWishBag Team', 'payment_notification', '{"currency": "string", "order_id": "string", "amount_paid": "string", "total_amount": "string", "customer_name": "string", "excess_amount": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('e2ba6711-6c0c-4b39-aaee-81685aa07e04', 'payment_reminder_1', 'Payment Reminder - Order {{order_id}}', 'Dear {{customer_name}},<br><br>This is a friendly reminder that we are still waiting for your payment.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Days Pending: 3 days<br><br>{{bank_details}}<br><br>Please complete your payment soon to avoid order cancellation.<br><br>If you have already made the payment, please send us the confirmation.<br><br>Best regards,<br>iWishBag Team', 'payment_reminder', '{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('08d9884c-dcf8-4e1c-9574-bc6416a52ab3', 'payment_reminder_2', 'Second Payment Reminder - Order {{order_id}}', 'Dear {{customer_name}},<br><br>We haven''t received your payment yet. Your order has been pending for 7 days.<br><br><strong>Order Details:</strong><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br><br><strong>⚠️ Important:</strong> Your order will be cancelled in 7 days if payment is not received.<br><br>{{bank_details}}<br><br>Please complete your payment as soon as possible.<br><br>Need help? Contact us at {{support_email}}<br><br>Best regards,<br>iWishBag Team', 'payment_reminder', '{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string", "support_email": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('1d516807-f75a-479f-bed0-18b94499bce9', 'payment_reminder_final', 'Final Payment Reminder - Order {{order_id}}', 'Dear {{customer_name}},<br><br><strong>⚠️ FINAL NOTICE: Your order will be cancelled tomorrow if payment is not received.</strong><br><br>Order ID: {{order_id}}<br>Total Amount: {{total_amount}} {{currency}}<br>Days Pending: 14 days<br><br>This is your final reminder. Please make the payment today to keep your order active.<br><br>{{bank_details}}<br><br>After tomorrow, you will need to place a new order.<br><br>If you no longer wish to proceed with this order, please let us know.<br><br>Best regards,<br>iWishBag Team', 'payment_reminder', '{"currency": "string", "order_id": "string", "bank_details": "string", "total_amount": "string", "customer_name": "string"}', true, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00');


--
-- Data for Name: profiles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."profiles" ("id", "full_name", "phone", "country", "preferred_display_currency", "avatar_url", "cod_enabled", "internal_notes", "referral_code", "total_orders", "total_spent", "created_at", "updated_at", "email") VALUES
	('c5d8ea1d-d801-4362-8150-7d605e7765fc', 'Raunak Bohra', '+919311161034', 'US', 'USD', NULL, false, NULL, 'REF66659874', 0, 0.00, '2025-07-11 04:35:13.628621+00', '2025-07-11 17:46:48.449552+00', 'iwbtracking@gmail.com');


--
-- Data for Name: shipping_routes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."shipping_routes" ("id", "origin_country", "destination_country", "base_shipping_cost", "cost_per_kg", "cost_percentage", "weight_tiers", "carriers", "max_weight", "restricted_items", "requires_documentation", "is_active", "created_at", "updated_at", "weight_unit", "delivery_options", "processing_days", "active", "customs_clearance_days", "shipping_per_kg", "exchange_rate") VALUES
	(24, 'US', 'IN', 12.00, 11.00, 2.50, '[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]', '[{"days": "7-10", "name": "DHL", "cost_multiplier": 5.0}]', NULL, NULL, false, true, '2025-07-10 11:46:33.757228', '2025-07-10 11:46:33.757228', 'kg', '[]', 2, true, 3, 0.00, 1.000000),
	(25, 'US', 'NP', 12.00, 11.00, 2.50, '[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]', '[{"days": "10-14", "name": "GSH", "cost_multiplier": 5.0}, {"days": "10-14", "name": "GExpress", "cost_multiplier": 5.0}]', NULL, NULL, false, true, '2025-07-10 11:46:33.757228', '2025-07-10 11:46:33.757228', 'kg', '[]', 2, true, 3, 0.00, 1.000000),
	(26, 'IN', 'NP', 450.00, 400.00, 2.50, '[{"max": 1, "min": 0, "cost": 15.00}, {"max": 3, "min": 1, "cost": 25.00}, {"max": 5, "min": 3, "cost": 35.00}, {"max": null, "min": 5, "cost": 45.00}]', '[{"days": "8-12", "name": "Chain Express", "cost_multiplier": 5.0}]', NULL, NULL, false, true, '2025-07-10 11:46:33.757228', '2025-07-10 11:46:33.757228', 'kg', '[]', 2, true, 3, 0.00, 1.000000);


--
-- Data for Name: quotes; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."quotes" ("id", "display_id", "user_id", "email", "status", "approval_status", "priority", "destination_country", "currency", "items_currency", "product_name", "product_url", "image_url", "options", "quantity", "item_price", "item_weight", "sub_total", "domestic_shipping", "international_shipping", "merchant_shipping_price", "sales_tax_price", "vat", "customs_and_ecs", "handling_charge", "insurance_amount", "payment_gateway_fee", "discount", "final_total", "final_total_local", "final_currency", "exchange_rate", "in_cart", "payment_method", "shipping_carrier", "tracking_number", "current_location", "estimated_delivery_date", "customs_category_name", "rejection_reason_id", "rejection_details", "internal_notes", "order_display_id", "shipping_address", "address_locked", "address_updated_at", "address_updated_by", "payment_reminder_sent_at", "payment_reminder_count", "created_at", "updated_at", "approved_at", "rejected_at", "paid_at", "shipped_at", "last_tracking_update", "amount_paid", "payment_status", "overpayment_amount", "admin_notes", "priority_auto", "origin_country", "shipping_method", "shipping_route_id", "shipping_delivery_days", "breakdown", "customs_percentage", "enabled_delivery_options", "is_anonymous", "social_handle", "quote_source", "share_token", "expires_at", "customer_name", "customer_phone", "sent_at", "calculated_at", "ordered_at", "delivered_at", "customer_notes") VALUES
	('c40d76fd-e891-46af-975f-684ae16fa915', 'Q20250711-87de87', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'ordered', 'pending', 'low', 'IN', 'INR', NULL, '', NULL, NULL, NULL, 1, 1.00, 1.00, 1.03, 0.00, 600.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.03, 600.00, 1.02, 1.02, 'INR', 83.000000, false, 'bank_transfer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', false, NULL, NULL, NULL, 0, '2025-07-11 12:33:12.506678+00', '2025-07-11 13:44:40.822107+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('d0d9e2cf-7375-45ea-a08d-ac133b09db0b', 'Q20250711-6105c5', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'paid', 'pending', 'low', 'IN', 'INR', NULL, 'fda', NULL, NULL, NULL, 1, 1.00, 1.00, 1.00, 0.00, 600.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.02, 600.02, 1.00, 1.00, 'INR', 83.000000, false, 'bank_transfer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', 'ORD-D0D9E2', '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', false, NULL, NULL, NULL, 0, '2025-07-11 12:16:39.149261+00', '2025-07-11 12:31:30.966672+00', NULL, NULL, '2025-07-11 12:24:58.215+00', NULL, NULL, 1.00, 'paid', 0.00, NULL, true, 'IN', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('05f4c2d9-801b-4524-9de6-93f9220fd067', 'Q20250711-1e6f55', NULL, 'rnkbohra@gmail.com', 'sent', 'pending', 'low', 'IN', 'INR', NULL, 'ffff', NULL, NULL, NULL, 1, 111.00, 1.00, 1051.37, 1.00, 852.78, 1.00, 1.00, 1.89, 57.95, 1.00, 1.00, 25.64, 1.00, 1053.26, 1053.26, 'INR', 1.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"destination_country": "NP"}', false, NULL, NULL, NULL, 0, '2025-07-11 03:39:10.120878+00', '2025-07-11 04:36:24.055967+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'route-specific', 26, NULL, NULL, 6.00, '[]', true, NULL, 'website', 'qt_5f03d8a3c793', '2025-07-16 04:36:24.055967+00', NULL, NULL, '2025-07-11 04:36:24.055967+00', NULL, NULL, NULL, NULL),
	('ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'Q20250711-5b0247', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'ordered', 'pending', 'low', 'US', 'USD', NULL, 'iphone', NULL, NULL, NULL, 1, 12.00, 1.00, 24.70, 0.00, 12.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.70, 0.00, 24.70, 24.70, 'USD', 1.000000, false, 'bank_transfer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', false, NULL, NULL, NULL, 0, '2025-07-11 18:25:37.913919+00', '2025-07-12 01:50:06.954568+00', NULL, NULL, '2025-07-12 00:35:36.035682+00', NULL, NULL, 0.00, 'paid', 0.00, NULL, true, 'US', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('874ce0c6-12b1-44a4-9677-4226de669861', 'Q20250711-6e5bbd', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'paid', 'pending', 'low', 'US', 'USD', NULL, 'abc123@abc.com', NULL, NULL, NULL, 1, 1.00, 1.00, 13.38, 0.00, 12.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.38, 0.00, 13.38, 13.38, 'USD', 1.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', false, NULL, NULL, NULL, 0, '2025-07-11 18:13:28.258569+00', '2025-07-12 00:35:36.035682+00', NULL, NULL, '2025-07-12 00:35:36.035682+00', NULL, NULL, 0.00, 'paid', 0.00, NULL, true, 'US', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('ee829559-6e39-4474-9833-ca66f0f9b852', 'Q20250712-f04db9', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'approved', 'pending', 'low', 'US', 'USD', NULL, 'airwallex', NULL, NULL, NULL, 1, 1.00, 1.00, 13.38, 0.00, 12.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.38, 0.00, 13.38, 13.38, 'USD', 1.000000, true, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', false, NULL, NULL, NULL, 0, '2025-07-12 01:56:14.927775+00', '2025-07-12 03:07:20.404852+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'US', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('f496c4d2-91e4-4c0e-84e7-577bd5ae5523', 'Q20250711-5e8e13', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'approved', 'pending', 'low', 'IN', 'INR', NULL, 'http://localhost:8080/admin/quotes', NULL, NULL, NULL, 1, 1.00, 1.00, 616.03, 0.00, 600.00, 0.00, 0.00, 1.11, 0.00, 0.00, 0.00, 15.03, 0.00, 617.14, 617.14, 'INR', 83.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', false, NULL, NULL, NULL, 0, '2025-07-11 13:56:24.895898+00', '2025-07-11 14:01:49.861302+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('3ee5a939-b249-41bb-88ed-033cbbf485fd', 'Q20250711-3d3cd7', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'approved', 'pending', 'low', 'IN', 'INR', NULL, 'TShirt', NULL, NULL, NULL, 1, 1.00, 1.00, 616.03, 0.00, 600.00, 0.00, 0.00, 1.11, 0.00, 0.00, 0.00, 15.03, 0.00, 617.14, 617.14, 'INR', 83.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"destination_country": "IN"}', false, NULL, NULL, NULL, 0, '2025-07-11 13:50:57.499462+00', '2025-07-11 14:01:50.484002+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('4337bcd2-7897-4a93-bdb3-aebe0aac9a20', 'Q20250711-7268c4', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'approved', 'pending', 'low', 'IN', 'INR', NULL, 'fds', NULL, NULL, NULL, 1, 1.00, 1.00, 872.31, 0.00, 850.03, 0.00, 0.00, 1.57, 0.00, 0.00, 0.00, 21.28, 0.00, 873.88, 873.88, 'INR', 1.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"destination_country": "NP"}', false, NULL, NULL, NULL, 0, '2025-07-11 13:49:43.075069+00', '2025-07-11 14:01:50.796953+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'route-specific', 26, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('ec2dd22c-7427-406b-bd25-0244e2887bce', 'Q20250711-06ef33', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'approved', 'pending', 'low', 'IN', 'INR', NULL, 'fdas', NULL, NULL, NULL, 1, 1.00, 1.00, 616.03, 0.00, 600.00, 0.00, 0.00, 1.11, 0.00, 0.00, 0.00, 15.03, 0.00, 617.14, 617.14, 'INR', 83.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', false, NULL, NULL, NULL, 0, '2025-07-11 13:45:53.256592+00', '2025-07-11 14:01:51.172263+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('d2d7d0a4-23eb-447c-8c4f-7e7081009bdc', 'Q20250711-401180', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'approved', 'pending', 'low', 'IN', 'INR', NULL, 'last_payment_transaction_id', NULL, NULL, NULL, 1, 1.00, 1.00, 616.03, 0.00, 600.00, 0.00, 0.00, 1.11, 0.00, 0.00, 0.00, 15.03, 0.00, 617.14, 617.14, 'INR', 83.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', false, NULL, NULL, NULL, 0, '2025-07-11 14:01:08.645122+00', '2025-07-11 17:46:53.378969+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('f356fc0c-be0f-48d8-9415-997d97648c3d', 'Q20250711-a3f058', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'approved', 'pending', 'low', 'IN', 'INR', NULL, 'TShirt', NULL, NULL, NULL, 1, 1.00, 1.00, 616.03, 0.00, 600.00, 0.00, 0.00, 1.11, 0.00, 0.00, 0.00, 15.03, 0.00, 617.14, 617.14, 'INR', 83.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"destination_country": "IN"}', false, NULL, NULL, NULL, 0, '2025-07-11 14:23:30.943237+00', '2025-07-11 17:46:52.952375+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'IN', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3', 'Q20250711-76c783', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'ordered', 'pending', 'low', 'US', 'USD', NULL, 'https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/paypal-webhook', NULL, NULL, NULL, 1, 1.00, 1.00, 13.38, 0.00, 12.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.38, 0.00, 13.38, 13.38, 'USD', 1.000000, false, 'bank_transfer', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', false, NULL, NULL, NULL, 0, '2025-07-11 17:45:41.897741+00', '2025-07-11 18:11:56.312904+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'US', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
	('012ba558-994d-402f-a855-d33967607db3', 'Q20250712-215275', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'iwbtracking@gmail.com', 'sent', 'pending', 'low', 'US', 'USD', NULL, 'invoice paypal', NULL, NULL, NULL, 1, 11.00, 1.00, 23.67, 0.00, 12.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.00, 0.67, 0.00, 23.67, 23.67, 'USD', 1.000000, false, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', false, NULL, NULL, NULL, 0, '2025-07-12 03:08:32.997267+00', '2025-07-12 03:08:43.120527+00', NULL, NULL, NULL, NULL, NULL, 0.00, 'unpaid', 0.00, NULL, true, 'US', 'country_settings', NULL, NULL, NULL, NULL, '[]', false, NULL, 'website', NULL, '2025-07-17 03:08:43.120527+00', NULL, NULL, '2025-07-12 03:08:43.120527+00', NULL, NULL, NULL, NULL);


--
-- Data for Name: guest_checkout_sessions; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: manual_analysis_tasks; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: messages; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."messages" ("id", "sender_id", "recipient_id", "subject", "content", "message_type", "quote_id", "reply_to_message_id", "attachment_file_name", "attachment_url", "sender_email", "sender_name", "is_read", "created_at", "updated_at", "verification_status", "admin_notes", "verified_amount", "verified_by", "verified_at") VALUES
	('fd3fe1a4-d53c-44c9-a7f8-0711459b909b', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', NULL, 'Payment Proof for Order Q20250711-6105c5', 'Payment proof uploaded for Order #Q20250711-6105c5', 'payment_proof', 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', NULL, 'Invoice_1875948235.pdf', 'https://grgvlrvywsfmnmkxrecd.supabase.co/storage/v1/object/public/message-attachments/payment-proof-c5d8ea1d-d801-4362-8150-7d605e7765fc-1752236662509.pdf', NULL, NULL, false, '2025-07-11 12:24:23.047939+00', '2025-07-11 12:24:23.047939+00', 'verified', 'Payment verified: INR 1.00 received', 1.00, 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:24:47.929+00');


--
-- Data for Name: payment_records; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."payment_records" ("id", "quote_id", "amount", "payment_method", "reference_number", "notes", "recorded_by", "created_at", "updated_at") VALUES
	('9a2fd568-af88-44ab-9031-06123cf39aa6', 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', 1.00, 'bank_transfer', NULL, '', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:24:58.187131+00', '2025-07-11 12:24:58.187131+00');


--
-- Data for Name: payment_reminders; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: payment_transactions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."payment_transactions" ("id", "user_id", "quote_id", "amount", "currency", "status", "payment_method", "gateway_response", "created_at", "updated_at", "paypal_order_id", "paypal_capture_id", "paypal_payer_id", "paypal_payer_email", "total_refunded", "refund_count", "is_fully_refunded", "last_refund_at") VALUES
	('b8bfbe6f-5184-47bb-b862-5a608fb83c94', NULL, '874ce0c6-12b1-44a4-9677-4226de669861', 38.08, 'USD', 'completed', 'paypal', '{"id": "07U030480N7117439", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/07U030480N7117439", "method": "GET"}], "payer": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "payer_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com"}, "status": "COMPLETED", "payment_source": {"paypal": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "account_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com", "account_status": "VERIFIED"}}, "purchase_units": [{"payments": {"captures": [{"id": "87H15595T5203281N", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/payments/captures/87H15595T5203281N", "method": "GET"}, {"rel": "refund", "href": "https://api.sandbox.paypal.com/v2/payments/captures/87H15595T5203281N/refund", "method": "POST"}, {"rel": "up", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/07U030480N7117439", "method": "GET"}], "amount": {"value": "38.08", "currency_code": "USD"}, "status": "COMPLETED", "custom_id": "{\"quoteIds\":[\"874ce0c6-12b1-44a4-9677-4226de669861\",\"ff107c51-ef2f-4340-b35b-a38bde8cb87b\"],\"guestSessionToken\":\"\"}", "create_time": "2025-07-12T00:01:06Z", "update_time": "2025-07-12T00:01:06Z", "final_capture": true, "seller_protection": {"status": "ELIGIBLE", "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"]}, "seller_receivable_breakdown": {"net_amount": {"value": "36.49", "currency_code": "USD"}, "paypal_fee": {"value": "1.59", "currency_code": "USD"}, "gross_amount": {"value": "38.08", "currency_code": "USD"}, "exchange_rate": {"value": "1.24410975", "source_currency": "USD", "target_currency": "SGD"}, "receivable_amount": {"value": "45.40", "currency_code": "SGD"}}}]}, "shipping": {"name": {"full_name": "Customer"}, "address": {"postal_code": "10001", "admin_area_1": "New Delhi", "admin_area_2": "New Delhi", "country_code": "US", "address_line_1": "Address"}}, "reference_id": "874ce0c6-12b1-44a4-9677-4226de669861,ff107c51-ef2f-4340-b35b-a38bde8cb87b"}]}', '2025-07-12 00:00:27.929893+00', '2025-07-12 00:01:06.737+00', NULL, '87H15595T5203281N', NULL, NULL, 0.00, 0, false, NULL),
	('3b0d288b-6493-4b25-92cc-15ebd98054de', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 38.08, 'USD', 'completed', 'paypal', '{"id": "24Y38709A8379120J", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/24Y38709A8379120J", "method": "GET"}], "payer": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "payer_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com"}, "status": "COMPLETED", "payment_source": {"paypal": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "account_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com", "account_status": "VERIFIED"}}, "purchase_units": [{"payments": {"captures": [{"id": "55782122F16642350", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/payments/captures/55782122F16642350", "method": "GET"}, {"rel": "refund", "href": "https://api.sandbox.paypal.com/v2/payments/captures/55782122F16642350/refund", "method": "POST"}, {"rel": "up", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/24Y38709A8379120J", "method": "GET"}], "amount": {"value": "38.08", "currency_code": "USD"}, "status": "COMPLETED", "custom_id": "{\"quoteIds\":[\"ff107c51-ef2f-4340-b35b-a38bde8cb87b\",\"874ce0c6-12b1-44a4-9677-4226de669861\"],\"guestSessionToken\":\"\"}", "create_time": "2025-07-12T00:03:48Z", "update_time": "2025-07-12T00:03:48Z", "final_capture": true, "seller_protection": {"status": "ELIGIBLE", "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"]}, "seller_receivable_breakdown": {"net_amount": {"value": "36.49", "currency_code": "USD"}, "paypal_fee": {"value": "1.59", "currency_code": "USD"}, "gross_amount": {"value": "38.08", "currency_code": "USD"}, "exchange_rate": {"value": "1.24410975", "source_currency": "USD", "target_currency": "SGD"}, "receivable_amount": {"value": "45.40", "currency_code": "SGD"}}}]}, "shipping": {"name": {"full_name": "Customer"}, "address": {"postal_code": "10001", "admin_area_1": "New Delhi", "admin_area_2": "New Delhi", "country_code": "US", "address_line_1": "Address"}}, "reference_id": "ff107c51-ef2f-4340-b35b-a38bde8cb87b,874ce0c6-12b1-44a4-9677-4226de669861"}]}', '2025-07-12 00:03:26.225357+00', '2025-07-12 00:03:49.328+00', NULL, '55782122F16642350', NULL, NULL, 0.00, 0, false, NULL),
	('3f87d4e4-d521-41b5-a985-750a25d2a46b', NULL, '874ce0c6-12b1-44a4-9677-4226de669861', 13.38, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "5LN19148PN554584G", "origin_url": "http://localhost:8080", "full_response": {"id": "5LN19148PN554584G", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/5LN19148PN554584G", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=5LN19148PN554584G", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "5LN19148PN554584G", "internal_order_id": "PAYPAL_1752260814545_5ma2232fr", "guest_session_token": ""}', '2025-07-11 19:06:56.134786+00', '2025-07-12 00:31:39.415093+00', '5LN19148PN554584G', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('b1935934-6fe5-4f06-9cc5-a1de80b5bf35', NULL, '874ce0c6-12b1-44a4-9677-4226de669861', 13.38, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "33N11286UP381134X", "origin_url": "http://localhost:8080", "full_response": {"id": "33N11286UP381134X", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/33N11286UP381134X", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=33N11286UP381134X", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "33N11286UP381134X", "internal_order_id": "PAYPAL_1752258046900_2ugus9g5o", "guest_session_token": ""}', '2025-07-11 18:20:48.159551+00', '2025-07-12 00:35:36.035682+00', '33N11286UP381134X', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('66e1b87c-ba61-46a3-b2d6-c305bbe2e281', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 26.76, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "9NA33528AL1882359", "origin_url": "http://localhost:8080", "full_response": {"id": "9NA33528AL1882359", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/9NA33528AL1882359", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=9NA33528AL1882359", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "9NA33528AL1882359", "internal_order_id": "PAYPAL_1752258365581_o016uyn6g", "guest_session_token": ""}', '2025-07-11 18:26:06.811704+00', '2025-07-12 00:35:36.035682+00', '9NA33528AL1882359', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('e7bfa9bf-8338-4a6a-8972-3fd3ad25d250', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 24.70, 'USD', 'completed', 'paypal', '{"id": "0MY06115F8412022X", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/0MY06115F8412022X", "method": "GET"}], "payer": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "payer_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com"}, "status": "COMPLETED", "payment_source": {"paypal": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "account_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com", "account_status": "VERIFIED"}}, "purchase_units": [{"payments": {"captures": [{"id": "3VX25032AU4623829", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/payments/captures/3VX25032AU4623829", "method": "GET"}, {"rel": "refund", "href": "https://api.sandbox.paypal.com/v2/payments/captures/3VX25032AU4623829/refund", "method": "POST"}, {"rel": "up", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/0MY06115F8412022X", "method": "GET"}], "amount": {"value": "24.70", "currency_code": "USD"}, "status": "COMPLETED", "custom_id": "{\"quoteIds\":[\"ff107c51-ef2f-4340-b35b-a38bde8cb87b\"],\"guestSessionToken\":\"\"}", "create_time": "2025-07-12T00:17:56Z", "update_time": "2025-07-12T00:17:56Z", "final_capture": true, "seller_protection": {"status": "ELIGIBLE", "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"]}, "seller_receivable_breakdown": {"net_amount": {"value": "23.56", "currency_code": "USD"}, "paypal_fee": {"value": "1.14", "currency_code": "USD"}, "gross_amount": {"value": "24.70", "currency_code": "USD"}, "exchange_rate": {"value": "1.24410975", "source_currency": "USD", "target_currency": "SGD"}, "receivable_amount": {"value": "29.31", "currency_code": "SGD"}}}]}, "shipping": {"name": {"full_name": "Customer"}, "address": {"postal_code": "10001", "admin_area_1": "New Delhi", "admin_area_2": "New Delhi", "country_code": "US", "address_line_1": "Address"}}, "reference_id": "ff107c51-ef2f-4340-b35b-a38bde8cb87b"}]}', '2025-07-12 00:17:44.97753+00', '2025-07-12 00:17:57.035+00', '0MY06115F8412022X', '3VX25032AU4623829', NULL, NULL, 0.00, 0, false, NULL),
	('b4a3fc0c-8e3a-4c2f-95d3-b53749cebeee', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 26.76, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "2C828872UK7664506", "origin_url": "http://localhost:8080", "full_response": {"id": "2C828872UK7664506", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/2C828872UK7664506", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=2C828872UK7664506", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "2C828872UK7664506", "internal_order_id": "PAYPAL_1752258711142_3ar5hoxes", "guest_session_token": ""}', '2025-07-11 18:31:52.734568+00', '2025-07-12 00:35:36.035682+00', '2C828872UK7664506', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('cfccf681-f118-43bb-9048-cab202065de3', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 26.76, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "0G6502008M622552G", "origin_url": "http://localhost:8080", "full_response": {"id": "0G6502008M622552G", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/0G6502008M622552G", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=0G6502008M622552G", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "0G6502008M622552G", "internal_order_id": "PAYPAL_1752259628528_v38pcms9w", "guest_session_token": ""}', '2025-07-11 18:47:09.859749+00', '2025-07-12 00:35:36.035682+00', '0G6502008M622552G', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('8272cb48-b0f6-46ae-942c-f71b80b76298', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 26.76, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "3TG453763V0362259", "origin_url": "http://localhost:8080", "full_response": {"id": "3TG453763V0362259", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/3TG453763V0362259", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=3TG453763V0362259", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "3TG453763V0362259", "internal_order_id": "PAYPAL_1752259710342_ehu90sc22", "guest_session_token": ""}', '2025-07-11 18:48:31.682517+00', '2025-07-12 00:35:36.035682+00', '3TG453763V0362259', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('24768db8-5401-46c1-94b2-61ad90810b34', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 26.76, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "9HB02603BR255450P", "origin_url": "http://localhost:8080", "full_response": {"id": "9HB02603BR255450P", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/9HB02603BR255450P", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=9HB02603BR255450P", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "9HB02603BR255450P", "internal_order_id": "PAYPAL_1752259942691_7lcaecf3i", "guest_session_token": ""}', '2025-07-11 18:52:24.444135+00', '2025-07-12 00:35:36.035682+00', '9HB02603BR255450P', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('454bb717-26e1-4ace-b783-bba1edbe961e', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 26.76, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "3EA355195J3732316", "origin_url": "http://localhost:8080", "full_response": {"id": "3EA355195J3732316", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/3EA355195J3732316", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=3EA355195J3732316", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "3EA355195J3732316", "internal_order_id": "PAYPAL_1752260116292_k9pcu8pt4", "guest_session_token": ""}', '2025-07-11 18:55:17.692392+00', '2025-07-12 00:35:36.035682+00', '3EA355195J3732316', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('c50745bf-afef-48d4-ba23-423f7f4d7ef4', NULL, '874ce0c6-12b1-44a4-9677-4226de669861', 13.38, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "9D618437PU075562A", "origin_url": "http://localhost:8080", "full_response": {"id": "9D618437PU075562A", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/9D618437PU075562A", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=9D618437PU075562A", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "9D618437PU075562A", "internal_order_id": "PAYPAL_1752260212217_fvgtgqmaq", "guest_session_token": ""}', '2025-07-11 18:56:53.620364+00', '2025-07-12 00:35:36.035682+00', '9D618437PU075562A', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('ea4756eb-8b26-4d6a-99aa-12a034c3d9fc', NULL, '874ce0c6-12b1-44a4-9677-4226de669861', 13.38, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "5TJ81334W6556204M", "origin_url": "http://localhost:8080", "full_response": {"id": "5TJ81334W6556204M", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/5TJ81334W6556204M", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=5TJ81334W6556204M", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "5TJ81334W6556204M", "internal_order_id": "PAYPAL_1752260340086_0c0hzykdx", "guest_session_token": ""}', '2025-07-11 18:59:01.552731+00', '2025-07-12 00:35:36.035682+00', '5TJ81334W6556204M', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('2c0b9862-b130-4e73-a020-e3fb6068f459', NULL, '874ce0c6-12b1-44a4-9677-4226de669861', 13.38, 'USD', 'completed', 'paypal', '{"status": "PAYER_ACTION_REQUIRED", "order_id": "7S4937942B180252S", "origin_url": "http://localhost:8080", "full_response": {"id": "7S4937942B180252S", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/7S4937942B180252S", "method": "GET"}, {"rel": "payer-action", "href": "https://www.sandbox.paypal.com/checkoutnow?token=7S4937942B180252S", "method": "GET"}], "status": "PAYER_ACTION_REQUIRED", "payment_source": {"paypal": {}}}, "paypal_order_id": "7S4937942B180252S", "internal_order_id": "PAYPAL_1752260623421_ywqn7thyn", "guest_session_token": ""}', '2025-07-11 19:03:45.611257+00', '2025-07-12 00:35:36.035682+00', '7S4937942B180252S', NULL, NULL, NULL, 0.00, 0, false, NULL),
	('4b66c652-db07-4c38-8f0d-e66f004d21d3', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 24.70, 'USD', 'completed', 'paypal', '{"id": "4GU349791T059640G", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/4GU349791T059640G", "method": "GET"}], "payer": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "payer_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com"}, "status": "COMPLETED", "payment_source": {"paypal": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "account_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com", "account_status": "VERIFIED"}}, "purchase_units": [{"payments": {"captures": [{"id": "21L68524749167701", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/payments/captures/21L68524749167701", "method": "GET"}, {"rel": "refund", "href": "https://api.sandbox.paypal.com/v2/payments/captures/21L68524749167701/refund", "method": "POST"}, {"rel": "up", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/4GU349791T059640G", "method": "GET"}], "amount": {"value": "24.70", "currency_code": "USD"}, "status": "COMPLETED", "custom_id": "{\"quoteIds\":[\"ff107c51-ef2f-4340-b35b-a38bde8cb87b\"],\"guestSessionToken\":\"\"}", "create_time": "2025-07-12T01:03:48Z", "update_time": "2025-07-12T01:03:48Z", "final_capture": true, "seller_protection": {"status": "ELIGIBLE", "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"]}, "seller_receivable_breakdown": {"net_amount": {"value": "23.56", "currency_code": "USD"}, "paypal_fee": {"value": "1.14", "currency_code": "USD"}, "gross_amount": {"value": "24.70", "currency_code": "USD"}, "exchange_rate": {"value": "1.24410975", "source_currency": "USD", "target_currency": "SGD"}, "receivable_amount": {"value": "29.31", "currency_code": "SGD"}}}]}, "shipping": {"name": {"full_name": "Customer"}, "address": {"postal_code": "10001", "admin_area_1": "New Delhi", "admin_area_2": "New Delhi", "country_code": "US", "address_line_1": "Address"}}, "reference_id": "ff107c51-ef2f-4340-b35b-a38bde8cb87b"}]}', '2025-07-12 01:02:39.122386+00', '2025-07-12 02:25:16.262124+00', '4GU349791T059640G', '21L68524749167701', NULL, NULL, 24.70, 2, true, '2025-07-12 02:25:16.158+00'),
	('8b6e5b62-83d8-4a2d-804c-0278858ad243', NULL, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 24.70, 'USD', 'completed', 'paypal', '{"id": "33R575105K9780931", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/33R575105K9780931", "method": "GET"}], "payer": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "payer_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com"}, "status": "COMPLETED", "payment_source": {"paypal": {"name": {"surname": "Bohra", "given_name": "Raunak"}, "address": {"country_code": "US"}, "account_id": "DK295WH4YSSAE", "email_address": "rnkbohra@gmail.com", "account_status": "VERIFIED"}}, "purchase_units": [{"payments": {"captures": [{"id": "55U12006B79507434", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/payments/captures/55U12006B79507434", "method": "GET"}, {"rel": "refund", "href": "https://api.sandbox.paypal.com/v2/payments/captures/55U12006B79507434/refund", "method": "POST"}, {"rel": "up", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/33R575105K9780931", "method": "GET"}], "amount": {"value": "24.70", "currency_code": "USD"}, "status": "COMPLETED", "custom_id": "{\"quoteIds\":[\"ff107c51-ef2f-4340-b35b-a38bde8cb87b\"],\"guestSessionToken\":\"\"}", "create_time": "2025-07-12T00:37:05Z", "update_time": "2025-07-12T00:37:05Z", "final_capture": true, "seller_protection": {"status": "ELIGIBLE", "dispute_categories": ["ITEM_NOT_RECEIVED", "UNAUTHORIZED_TRANSACTION"]}, "seller_receivable_breakdown": {"net_amount": {"value": "23.56", "currency_code": "USD"}, "paypal_fee": {"value": "1.14", "currency_code": "USD"}, "gross_amount": {"value": "24.70", "currency_code": "USD"}, "exchange_rate": {"value": "1.24410975", "source_currency": "USD", "target_currency": "SGD"}, "receivable_amount": {"value": "29.31", "currency_code": "SGD"}}}]}, "shipping": {"name": {"full_name": "Customer"}, "address": {"postal_code": "10001", "admin_area_1": "New Delhi", "admin_area_2": "New Delhi", "country_code": "US", "address_line_1": "Address"}}, "reference_id": "ff107c51-ef2f-4340-b35b-a38bde8cb87b"}]}', '2025-07-12 00:36:29.05659+00', '2025-07-12 03:24:51.797817+00', '33R575105K9780931', '55U12006B79507434', NULL, NULL, 2.00, 2, false, '2025-07-12 03:24:50+00');


--
-- Data for Name: paypal_invoices; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."paypal_invoices" ("id", "quote_id", "paypal_invoice_id", "invoice_number", "title", "description", "note", "terms_and_conditions", "amount", "currency", "tax_amount", "shipping_amount", "discount_amount", "merchant_info", "billing_info", "shipping_info", "payment_due_date", "minimum_amount_due", "allow_partial_payment", "logo_url", "template_id", "status", "payment_date", "payment_method", "paid_amount", "sent_to_email", "last_sent_date", "view_count", "last_viewed_date", "paypal_response", "paypal_links", "created_by", "created_at", "updated_at", "sent_at", "paid_at", "cancelled_at") VALUES
	('5fa48118-a804-468b-ad45-a77f3fd71295', 'ee829559-6e39-4474-9833-ca66f0f9b852', 'INV2-XNT7-VZM4-4U6V-DA8J', 'INV-2025-289976', 'Invoice for Quote Q20250712-f04db9', 'Professional invoice for approved quote Q20250712-f04db9', 'hello sir ji', 'pay fast', 13.00, 'USD', 0.00, 0.00, 0.00, '{"name": "WhyteClub Team", "email": "billing@whyteclub.com", "address": {"city": "Business City", "state": "Business State", "country": "US", "postal_code": "12345", "address_line_1": "123 Business Street"}}', '{"name": "Raunak Bohra", "email": "iwbtracking@gmail.com", "address": {"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}}', NULL, '2025-08-11', NULL, false, NULL, NULL, 'draft', NULL, NULL, 0.00, 'iwbtracking@gmail.com', NULL, 0, NULL, '{"id": "INV2-XNT7-VZM4-4U6V-DA8J", "items": [{"id": "ITEM-2NC74814203086215", "name": "airwallex", "quantity": "1", "description": "Order for Q20250712-f04db9", "unit_amount": {"value": "1.00", "currency_code": "USD"}, "unit_of_measure": "QUANTITY"}, {"id": "ITEM-2SU240716P9607427", "name": "International Shipping", "quantity": "1", "description": "International shipping cost", "unit_amount": {"value": "12.00", "currency_code": "USD"}, "unit_of_measure": "QUANTITY"}], "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J", "method": "GET"}, {"rel": "send", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J/send", "method": "POST"}, {"rel": "replace", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J", "method": "PUT"}, {"rel": "delete", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J", "method": "DELETE"}, {"rel": "record-payment", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J/payments", "method": "POST"}], "amount": {"value": "25.00", "breakdown": {"discount": {"item_discount": {"value": "0.00", "currency_code": "USD"}, "invoice_discount": {"amount": {"value": "0.00", "currency_code": "USD"}}}, "shipping": {"amount": {"value": "12.00", "currency_code": "USD"}}, "tax_total": {"value": "0.00", "currency_code": "USD"}, "item_total": {"value": "13.00", "currency_code": "USD"}}, "currency_code": "USD"}, "detail": {"note": "hello sir ji", "archived": false, "metadata": {"spam_info": {}, "caller_type": "API_V2_INVOICE", "create_time": "2025-07-12T03:12:58Z", "created_by_flow": "REGULAR_SINGLE", "last_update_time": "2025-07-12T03:12:58Z", "invoicer_view_url": "https://www.sandbox.paypal.com/invoice/details/INV2-XNT7-VZM4-4U6V-DA8J", "recipient_view_url": "https://www.sandbox.paypal.com/invoice/p/#XNT7VZM44U6VDA8J"}, "reference": "Q20250712-f04db9", "group_draft": false, "invoice_date": "2025-07-12", "payment_term": {"due_date": "2025-08-11", "term_type": "DUE_ON_DATE_SPECIFIED"}, "category_code": "SHIPPABLE", "currency_code": "USD", "invoice_number": "INV-2025-289976", "viewed_by_recipient": false, "terms_and_conditions": "pay fast"}, "status": "DRAFT", "invoicer": {"name": {"surname": "Team", "full_name": "WhyteClub Team", "given_name": "WhyteClub"}, "address": {"postal_code": "12345", "admin_area_1": "Business State", "admin_area_2": "Business City", "country_code": "US", "address_line_1": "123 Business Street"}, "logo_url": "https://whyteclub.com/logo.png", "email_address": "billing@whyteclub.com"}, "due_amount": {"value": "25.00", "currency_code": "USD"}, "unilateral": false, "configuration": {"allow_tip": false, "template_id": "TEMP-16820603SF579845C", "tax_inclusive": false, "allow_only_pay_by_bank": false, "tax_calculated_after_discount": true}, "primary_recipients": [{"billing_info": {"name": {"surname": "Bohra", "full_name": "Raunak Bohra", "given_name": "Raunak"}, "address": {"postal_code": "12345", "admin_area_1": "New Delhi", "admin_area_2": "New Delhi", "country_code": "US", "address_line_1": "123 Customer Street"}, "email_address": "iwbtracking@gmail.com", "additional_info": "Customer ID: c5d8ea1d-d801-4362-8150-7d605e7765fc"}}]}', '[{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J", "method": "GET"}, {"rel": "send", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J/send", "method": "POST"}, {"rel": "replace", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J", "method": "PUT"}, {"rel": "delete", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J", "method": "DELETE"}, {"rel": "record-payment", "href": "https://api.sandbox.paypal.com/v2/invoicing/invoices/INV2-XNT7-VZM4-4U6V-DA8J/payments", "method": "POST"}]', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 03:12:58.379541+00', '2025-07-12 03:12:58.545278+00', NULL, NULL, NULL);


--
-- Data for Name: paypal_invoice_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."paypal_invoice_items" ("id", "invoice_id", "name", "description", "quantity", "unit_price", "tax_rate", "discount_amount", "item_code", "category", "created_at", "updated_at") VALUES
	('0de497d1-57c6-470f-a0c9-6a928494ce43', '5fa48118-a804-468b-ad45-a77f3fd71295', 'airwallex', 'Order for Q20250712-f04db9', 1.00, 1.00, 0.00, 0.00, NULL, 'product', '2025-07-12 03:12:58.464368+00', '2025-07-12 03:12:58.464368+00'),
	('3adfd0f6-aac2-4020-b901-e1b0368ac4fd', '5fa48118-a804-468b-ad45-a77f3fd71295', 'International Shipping', 'International shipping cost', 1.00, 12.00, 0.00, 0.00, NULL, 'shipping', '2025-07-12 03:12:58.545278+00', '2025-07-12 03:12:58.545278+00');


--
-- Data for Name: paypal_payment_links; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."paypal_payment_links" ("id", "link_code", "paypal_link_id", "title", "description", "amount", "currency", "quote_id", "user_id", "created_by", "expires_at", "max_uses", "current_uses", "allow_partial_payment", "minimum_payment_amount", "payment_note", "status", "is_public", "custom_redirect_url", "webhook_url", "metadata", "paypal_response", "created_at", "updated_at", "completed_at", "cancelled_at") VALUES
	('bb8c5bd8-c0a1-4329-98d1-54708c00a2d2', 'PAY892E44E2', '67G52161NS722544M', 'quote 222', 'hello', 100.00, 'USD', NULL, NULL, 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-14 02:49:55.654+00', 1, 0, true, NULL, NULL, 'active', true, NULL, NULL, NULL, '{"id": "67G52161NS722544M", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/67G52161NS722544M", "method": "GET"}, {"rel": "approve", "href": "https://www.sandbox.paypal.com/checkoutnow?token=67G52161NS722544M", "method": "GET"}, {"rel": "update", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/67G52161NS722544M", "method": "PATCH"}, {"rel": "capture", "href": "https://api.sandbox.paypal.com/v2/checkout/orders/67G52161NS722544M/capture", "method": "POST"}], "intent": "CAPTURE", "status": "CREATED", "create_time": "2025-07-12T02:49:55Z", "purchase_units": [{"payee": {"merchant_id": "Z7G83UERTB682", "display_data": {"brand_name": "iwishBag"}, "email_address": "sb-vospt44619937@business.example.com"}, "amount": {"value": "100.00", "currency_code": "USD"}, "custom_id": "PAY892E44E2", "invoice_id": "LINK_PAY892E44E2_1752288594218", "description": "hello", "reference_id": "default"}]}', '2025-07-12 02:49:55.658616+00', '2025-07-12 02:49:55.658616+00', NULL, NULL);


--
-- Data for Name: paypal_link_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: paypal_refund_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."paypal_refund_reasons" ("code", "description", "customer_friendly_description", "is_active", "display_order", "created_at") VALUES
	('DUPLICATE', 'Duplicate transaction', 'This appears to be a duplicate payment', true, 1, '2025-07-12 02:03:00.122512+00'),
	('FRAUDULENT', 'Fraudulent transaction', 'Transaction was marked as fraudulent', true, 2, '2025-07-12 02:03:00.122512+00'),
	('SUBSCRIPTION_CANCELED', 'Subscription canceled', 'Your subscription has been canceled', true, 3, '2025-07-12 02:03:00.122512+00'),
	('PRODUCT_UNSATISFACTORY', 'Product unsatisfactory', 'Product did not meet expectations', true, 4, '2025-07-12 02:03:00.122512+00'),
	('PRODUCT_NOT_RECEIVED', 'Product not received', 'Product was not received', true, 5, '2025-07-12 02:03:00.122512+00'),
	('PRODUCT_UNACCEPTABLE', 'Product unacceptable', 'Product was not as described', true, 6, '2025-07-12 02:03:00.122512+00'),
	('REFUND_REQUESTED', 'Customer requested refund', 'Refund requested by customer', true, 7, '2025-07-12 02:03:00.122512+00'),
	('ORDER_CANCELED', 'Order canceled', 'Order was canceled', true, 8, '2025-07-12 02:03:00.122512+00'),
	('MERCHANT_ERROR', 'Merchant error', 'Error on our end - sorry for the inconvenience', true, 9, '2025-07-12 02:03:00.122512+00'),
	('CUSTOMER_SERVICE', 'Customer service gesture', 'Refund as a customer service gesture', true, 10, '2025-07-12 02:03:00.122512+00'),
	('OTHER', 'Other reason', 'Other reason', true, 99, '2025-07-12 02:03:00.122512+00'),
	('PAYMENT_LINK', 'Payment via shared link', 'Payment processed through shared payment link', true, 50, '2025-07-12 02:37:08.406729+00');


--
-- Data for Name: paypal_refunds; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."paypal_refunds" ("id", "refund_id", "original_transaction_id", "payment_transaction_id", "quote_id", "user_id", "refund_amount", "original_amount", "currency", "refund_type", "reason_code", "reason_description", "admin_notes", "customer_note", "status", "paypal_status", "processed_by", "paypal_response", "error_details", "refund_date", "completed_at", "created_at", "updated_at") VALUES
	('f8fe552c-d69e-4eac-9507-e2e795d8d1a8', 'MOCK_REFUND_1752286935074_6stdwj56g', '21L68524749167701', '4b66c652-db07-4c38-8f0d-e66f004d21d3', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', NULL, 22.00, 24.70, 'USD', 'PARTIAL', 'DUPLICATE', 'Duplicate transaction', '', 'Your refund has been processed and will appear in your account within 3-5 business days.', 'COMPLETED', 'COMPLETED', NULL, '{"id": "MOCK_REFUND_1752286935074_6stdwj56g", "mock": true, "amount": {"value": "22.00", "currency_code": "USD"}, "status": "COMPLETED", "create_time": "2025-07-12T02:22:15.074Z", "update_time": "2025-07-12T02:22:15.074Z"}', NULL, '2025-07-12 02:22:15.074+00', '2025-07-12 02:22:15.074+00', '2025-07-12 02:22:15.199063+00', '2025-07-12 02:22:15.199063+00'),
	('ac4d57ea-9ae1-46f6-82b3-97724209a544', 'MOCK_REFUND_1752287116158_yt5ls7ev1', '21L68524749167701', '4b66c652-db07-4c38-8f0d-e66f004d21d3', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', NULL, 2.70, 24.70, 'USD', 'PARTIAL', 'FRAUDULENT', 'Fraudulent transaction', '', 'Your refund has been processed and will appear in your account within 3-5 business days.', 'COMPLETED', 'COMPLETED', NULL, '{"id": "MOCK_REFUND_1752287116158_yt5ls7ev1", "mock": true, "amount": {"value": "2.70", "currency_code": "USD"}, "status": "COMPLETED", "create_time": "2025-07-12T02:25:16.158Z", "update_time": "2025-07-12T02:25:16.158Z"}', NULL, '2025-07-12 02:25:16.158+00', '2025-07-12 02:25:16.158+00', '2025-07-12 02:25:16.262124+00', '2025-07-12 02:25:16.262124+00'),
	('ecf0409e-e1c3-41b9-9631-9f52b74469f1', '4KR066594R388424R', '55U12006B79507434', '8b6e5b62-83d8-4a2d-804c-0278858ad243', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', NULL, 1.00, 24.70, 'USD', 'PARTIAL', 'DUPLICATE', 'Duplicate transaction', '', 'Your refund has been processed and will appear in your account within 3-5 business days.', 'COMPLETED', 'COMPLETED', NULL, '{"id": "4KR066594R388424R", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/payments/refunds/4KR066594R388424R", "method": "GET"}, {"rel": "up", "href": "https://api.sandbox.paypal.com/v2/payments/captures/55U12006B79507434", "method": "GET"}], "amount": {"value": "1.00", "currency_code": "USD"}, "status": "COMPLETED", "custom_id": "{\"quoteIds\":[\"ff107c51-ef2f-4340-b35b-a38bde8cb87b\"],\"guestSessionToken\":\"\"}", "invoice_id": "REFUND_1752287293640_q6ez32tfy", "create_time": "2025-07-11T19:28:15-07:00", "update_time": "2025-07-11T19:28:15-07:00", "note_to_payer": "Your refund has been processed and will appear in your account within 3-5 business days.", "seller_payable_breakdown": {"net_amount": {"value": "1.00", "currency_code": "USD"}, "paypal_fee": {"value": "0.00", "currency_code": "USD"}, "gross_amount": {"value": "1.00", "currency_code": "USD"}, "net_amount_breakdown": [{"exchange_rate": {"value": "0.779854791037909", "source_currency": "SGD", "target_currency": "USD"}, "payable_amount": {"value": "1.28", "currency_code": "SGD"}, "converted_amount": {"value": "1.00", "currency_code": "USD"}}], "total_refunded_amount": {"value": "1.00", "currency_code": "USD"}}}', NULL, '2025-07-12 02:28:15+00', '2025-07-12 02:28:15+00', '2025-07-12 02:28:16.136133+00', '2025-07-12 02:28:16.136133+00'),
	('3a5ca1a3-ff9b-4ccf-8b97-bbd4becf7ebe', '70P356945U136825Y', '55U12006B79507434', '8b6e5b62-83d8-4a2d-804c-0278858ad243', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', NULL, 1.00, 24.70, 'USD', 'PARTIAL', 'SUBSCRIPTION_CANCELED', 'Subscription canceled', '', 'Your refund has been processed and will appear in your account within 3-5 business days.', 'COMPLETED', 'COMPLETED', NULL, '{"id": "70P356945U136825Y", "links": [{"rel": "self", "href": "https://api.sandbox.paypal.com/v2/payments/refunds/70P356945U136825Y", "method": "GET"}, {"rel": "up", "href": "https://api.sandbox.paypal.com/v2/payments/captures/55U12006B79507434", "method": "GET"}], "amount": {"value": "1.00", "currency_code": "USD"}, "status": "COMPLETED", "custom_id": "{\"quoteIds\":[\"ff107c51-ef2f-4340-b35b-a38bde8cb87b\"],\"guestSessionToken\":\"\"}", "invoice_id": "REFUND_1752290689183_zitjur6a3", "create_time": "2025-07-11T20:24:50-07:00", "update_time": "2025-07-11T20:24:50-07:00", "note_to_payer": "Your refund has been processed and will appear in your account within 3-5 business days.", "seller_payable_breakdown": {"net_amount": {"value": "1.00", "currency_code": "USD"}, "paypal_fee": {"value": "0.00", "currency_code": "USD"}, "gross_amount": {"value": "1.00", "currency_code": "USD"}, "net_amount_breakdown": [{"exchange_rate": {"value": "0.779854791037909", "source_currency": "SGD", "target_currency": "USD"}, "payable_amount": {"value": "1.28", "currency_code": "SGD"}, "converted_amount": {"value": "1.00", "currency_code": "USD"}}], "total_refunded_amount": {"value": "2.00", "currency_code": "USD"}}}', NULL, '2025-07-12 03:24:50+00', '2025-07-12 03:24:50+00', '2025-07-12 03:24:51.797817+00', '2025-07-12 03:24:51.797817+00');


--
-- Data for Name: paypal_subscription_plans; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."paypal_subscription_plans" ("id", "paypal_plan_id", "plan_name", "plan_description", "plan_type", "currency", "amount", "setup_fee", "frequency", "frequency_interval", "cycles", "features", "limits", "discount_percentage", "is_active", "is_public", "requires_approval", "trial_days", "trial_amount", "paypal_product_id", "paypal_links", "paypal_response", "created_by", "created_at", "updated_at") VALUES
	('baf0885a-edd8-434a-aaf3-a945406afe1b', 'TEMP-BASIC-91902a72-d757-42a0-b8a8-0fb5a3535dca', 'Basic Plan', 'Basic shopping plan with essential features', 'premium_shopping', 'USD', 9.99, 0.00, 'monthly', 1, NULL, '["Priority support", "Express processing"]', '{"max_quotes": 10}', 0.00, true, true, false, 7, 0.00, NULL, NULL, NULL, NULL, '2025-07-12 04:01:31.786683+00', '2025-07-12 04:01:31.786683+00'),
	('a49b2b21-c791-4609-9ff9-c82ee5969b7f', 'TEMP-PREMIUM-6074b6bd-6b34-40a9-b99d-6a875af61899', 'Premium Plan', 'Premium shopping plan with advanced features', 'personal_shopper', 'USD', 24.99, 0.00, 'monthly', 1, NULL, '["Personal shopper", "Free consolidation", "Priority \n  shipping"]', '{"max_quotes": 50}', 0.00, true, true, false, 14, 0.00, NULL, NULL, NULL, NULL, '2025-07-12 04:01:31.786683+00', '2025-07-12 04:01:31.786683+00'),
	('7770b247-171f-4a4c-9089-1642e7e307c3', 'TEMP-EXPRESS-d51e9430-9123-4703-98bd-263130d11e5c', 'Express Plan', 'Express shipping plan for urgent orders', 'express_handling', 'USD', 19.99, 0.00, 'monthly', 1, NULL, '["Express processing", "Priority shipping", "Real-time\n   tracking"]', '{"max_quotes": 25}', 0.00, true, true, false, 0, 0.00, NULL, NULL, NULL, NULL, '2025-07-12 04:01:31.786683+00', '2025-07-12 04:01:31.786683+00');


--
-- Data for Name: paypal_subscriptions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."paypal_subscriptions" ("id", "user_id", "plan_id", "paypal_subscription_id", "paypal_subscriber_id", "status", "start_date", "next_billing_date", "last_payment_date", "end_date", "currency", "amount", "setup_fee", "total_cycles", "completed_cycles", "current_usage", "usage_reset_date", "trial_end_date", "trial_amount", "total_paid", "failed_payments", "last_payment_amount", "admin_notes", "cancellation_reason", "paypal_links", "paypal_response", "webhook_last_update", "webhook_events_count", "created_at", "updated_at") VALUES
	('f634b220-a596-4890-b95e-8942c90f4dc5', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'baf0885a-edd8-434a-aaf3-a945406afe1b', 'TEST_SUB_1752293024393', NULL, 'approval_pending', NULL, NULL, NULL, NULL, 'USD', 9.99, 0.00, NULL, 0, '{}', NULL, '2025-07-19 04:03:44.393+00', 0.00, 0.00, 0, NULL, NULL, NULL, '[{"rel": "approve", "href": "https://www.sandbox.paypal.com/checkoutnow?token=TEST_SUB_1752293024393", "method": "GET"}, {"rel": "return", "href": "https://whyteclub.com/dashboard?subscription=success?subscription_id=TEST_SUB_1752293024393&test_mode=true", "method": "GET"}]', '{"id": "TEST_SUB_1752293024393", "links": [{"rel": "approve", "href": "https://www.sandbox.paypal.com/checkoutnow?token=TEST_SUB_1752293024393", "method": "GET"}, {"rel": "return", "href": "https://whyteclub.com/dashboard?subscription=success?subscription_id=TEST_SUB_1752293024393&test_mode=true", "method": "GET"}], "status": "APPROVAL_PENDING", "plan_id": "TEMP-BASIC-91902a72-d757-42a0-b8a8-0fb5a3535dca", "quantity": "1", "start_time": "2025-07-12T04:04:44.393Z", "subscriber": {"email_address": "iwbtracking@gmail.com"}, "create_time": "2025-07-12T04:03:44.393Z", "update_time": "2025-07-12T04:03:44.393Z", "status_update_time": "2025-07-12T04:03:44.393Z"}', NULL, 0, '2025-07-12 04:03:44.49748+00', '2025-07-12 04:03:44.49748+00');


--
-- Data for Name: paypal_subscription_payments; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: paypal_webhook_events; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: pending_confirmations; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quote_address_history; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."quote_address_history" ("id", "quote_id", "old_address", "new_address", "changed_by", "changed_at", "change_reason", "change_type") VALUES
	(1, '05f4c2d9-801b-4524-9de6-93f9220fd067', NULL, '{"destination_country": "NP"}', NULL, '2025-07-11 03:39:10.120878+00', 'Address updated via INSERT', 'create'),
	(2, 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', NULL, '2025-07-11 12:16:39.149261+00', 'Address updated via INSERT', 'create'),
	(3, 'c40d76fd-e891-46af-975f-684ae16fa915', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', NULL, '2025-07-11 12:33:12.506678+00', 'Address updated via INSERT', 'create'),
	(4, 'ec2dd22c-7427-406b-bd25-0244e2887bce', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', NULL, '2025-07-11 13:45:53.256592+00', 'Address updated via INSERT', 'create'),
	(5, '4337bcd2-7897-4a93-bdb3-aebe0aac9a20', NULL, '{"destination_country": "NP"}', NULL, '2025-07-11 13:49:43.075069+00', 'Address updated via INSERT', 'create'),
	(6, '3ee5a939-b249-41bb-88ed-033cbbf485fd', NULL, '{"destination_country": "IN"}', NULL, '2025-07-11 13:50:57.499462+00', 'Address updated via INSERT', 'create'),
	(7, 'f496c4d2-91e4-4c0e-84e7-577bd5ae5523', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', NULL, '2025-07-11 13:56:24.895898+00', 'Address updated via INSERT', 'create'),
	(8, 'd2d7d0a4-23eb-447c-8c4f-7e7081009bdc', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "India", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "India"}', NULL, '2025-07-11 14:01:08.645122+00', 'Address updated via INSERT', 'create'),
	(9, 'f356fc0c-be0f-48d8-9415-997d97648c3d', NULL, '{"destination_country": "IN"}', NULL, '2025-07-11 14:23:30.943237+00', 'Address updated via INSERT', 'create'),
	(10, '3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', NULL, '2025-07-11 17:45:41.897741+00', 'Address updated via INSERT', 'create'),
	(11, '874ce0c6-12b1-44a4-9677-4226de669861', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', NULL, '2025-07-11 18:13:28.258569+00', 'Address updated via INSERT', 'create'),
	(12, 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', NULL, '2025-07-11 18:25:37.913919+00', 'Address updated via INSERT', 'create'),
	(13, 'ee829559-6e39-4474-9833-ca66f0f9b852', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', NULL, '2025-07-12 01:56:14.927775+00', 'Address updated via INSERT', 'create'),
	(14, '012ba558-994d-402f-a855-d33967607db3', NULL, '{"city": "New Delhi", "email": "iwbtracking@gmail.com", "phone": "+919311161034", "state": "New Delhi", "country": "United States", "fullName": "raunak", "postalCode": "110005", "streetAddress": "1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid", "destination_country": "United States"}', NULL, '2025-07-12 03:08:32.997267+00', 'Address updated via INSERT', 'create');


--
-- Data for Name: quote_documents; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: quote_items; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."quote_items" ("id", "quote_id", "product_name", "product_url", "image_url", "category", "item_price", "item_weight", "quantity", "options", "created_at", "updated_at") VALUES
	('05448c01-2e25-45aa-8f4c-50e0defe4c8e', '05f4c2d9-801b-4524-9de6-93f9220fd067', 'ffff', 'https://iwishbag.com/terms-of-use', NULL, NULL, 111.00, 1.00, 1, NULL, '2025-07-11 03:39:10.314253+00', '2025-07-11 03:39:10.314253+00'),
	('475796a4-0e8d-48a0-8408-4861c77929be', 'ee829559-6e39-4474-9833-ca66f0f9b852', 'airwallex', 'http://localhost:8080/quote', '', NULL, 1.00, 1.00, 1, '', '2025-07-12 01:56:15.093349+00', '2025-07-12 01:56:15.093349+00'),
	('0835d249-ccd9-4069-bd02-58744af9eea6', '012ba558-994d-402f-a855-d33967607db3', 'invoice paypal', 'http://localhost:8080/quote', '', NULL, 11.00, 1.00, 1, '', '2025-07-12 03:08:33.14385+00', '2025-07-12 03:08:33.14385+00'),
	('c5fc31e0-eae4-44d1-bd25-8394cd03ffa9', 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', 'fda', 'https://yourdomain.com/payment-failure?gateway=payu', '', NULL, 1.00, 1.00, 1, '', '2025-07-11 12:16:39.33313+00', '2025-07-11 12:16:39.33313+00'),
	('7fff944c-9369-4496-aaca-2c81377aeb7f', 'c40d76fd-e891-46af-975f-684ae16fa915', '', 'https://whyteclub.com/quote', '', NULL, 1.00, 1.00, 1, '', '2025-07-11 12:33:12.689372+00', '2025-07-11 12:33:12.689372+00'),
	('b42ac05d-8735-4cdd-b9d7-074a42c03416', 'ec2dd22c-7427-406b-bd25-0244e2887bce', 'fdas', 'http://localhost:8080/quote', '', NULL, 1.00, 1.00, 1, '', '2025-07-11 13:45:53.409735+00', '2025-07-11 13:45:53.409735+00'),
	('ec63780f-ce71-482e-af06-c7c1e5a6b7d4', '4337bcd2-7897-4a93-bdb3-aebe0aac9a20', 'fds', 'http://localhost:8080/admin/quotes', NULL, NULL, 1.00, 1.00, 1, NULL, '2025-07-11 13:49:43.215075+00', '2025-07-11 13:49:43.215075+00'),
	('41918c35-3ca1-4e4e-86f2-59ed7a24c509', '3ee5a939-b249-41bb-88ed-033cbbf485fd', 'TShirt', 'https://www.amazon.com/dp/B09V3BS25N', NULL, NULL, 1.00, 1.00, 1, NULL, '2025-07-11 13:50:57.620945+00', '2025-07-11 13:50:57.620945+00'),
	('1d36b03c-b251-44ed-b75e-b5f1516f9790', 'f496c4d2-91e4-4c0e-84e7-577bd5ae5523', 'http://localhost:8080/admin/quotes', 'http://localhost:8080/admin/quotes', '', NULL, 1.00, 1.00, 1, '', '2025-07-11 13:56:25.042547+00', '2025-07-11 13:56:25.042547+00'),
	('143c7ec6-a046-46ad-9174-3d1356695eea', 'd2d7d0a4-23eb-447c-8c4f-7e7081009bdc', 'last_payment_transaction_id', 'https://whyteclub.com/quote', '', NULL, 1.00, 1.00, 1, '', '2025-07-11 14:01:08.801403+00', '2025-07-11 14:01:08.801403+00'),
	('31b7a847-c594-47fd-9688-e71d8cc94bba', 'f356fc0c-be0f-48d8-9415-997d97648c3d', 'TShirt', 'https://iwishbag.com/terms-of-use', NULL, NULL, 1.00, 1.00, 1, NULL, '2025-07-11 14:23:31.059275+00', '2025-07-11 14:23:31.059275+00'),
	('a0cac607-9c28-4848-ace4-3ca765b75d99', '3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3', 'https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/paypal-webhook', 'https://grgvlrvywsfmnmkxrecd.supabase.co/functions/v1/paypal-webhook', '', NULL, 1.00, 1.00, 1, '', '2025-07-11 17:45:42.096587+00', '2025-07-11 17:45:42.096587+00'),
	('478c2268-97cb-48b4-867b-cee2c612b72d', '874ce0c6-12b1-44a4-9677-4226de669861', 'abc123@abc.com', 'http://localhost:8080/quote', '', NULL, 1.00, 1.00, 1, '', '2025-07-11 18:13:28.444042+00', '2025-07-11 18:13:28.444042+00'),
	('628cc2e6-4bc6-42ee-bf33-a27c43bd6e6d', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'iphone', 'https://www.amazon.in/iPhone-16-128-GB-Control/dp/B0DGJHBX5Y/ref=sr_1_1_sspa?crid=5ONI7SBVI3ES&dib=eyJ2IjoiMSJ9.8-aKrERwPzdGyJWfWOa56ASJQLi7J0SyZSX21hJkz_2GTrZaFQyF0HCto_wNjctm2NgwOvY8UtrOLM7B9ndhfpDIznzHcz2tVATsKSDXDQOgwbGI7wi4djKlOxK0n_EVegZyhXZpQlrk_GjVGjxvjuNRjFwPSb028PwrRRlnM_6WZWrulz-mOJr8e1gqN8MVVA1GOvUC7XiZvD-_ODZEtvJVyFvYDMH4xUGkimcH_ag.He7VUzGs3v84bRTg3srxKnMcyiQPL3wjUn9gs2F6yXg&dib_tag=se&keywords=iphone&qid=1752258329&sprefix=ipho%2Caps%2C275&sr=8-1-spons&sp_csd=d2lkZ2V0TmFtZT1zcF9hdGY&psc=1', '', NULL, 12.00, 1.00, 1, '', '2025-07-11 18:25:38.078934+00', '2025-07-11 18:25:38.078934+00');


--
-- Data for Name: quote_statuses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."quote_statuses" ("id", "value", "label", "color", "icon", "is_active") VALUES
	(1, 'pending', 'Pending', '#fbbf24', 'clock', true),
	(2, 'sent', 'Sent', '#3b82f6', 'send', true),
	(3, 'approved', 'Approved', '#22c55e', 'check-circle', true),
	(4, 'rejected', 'Rejected', '#ef4444', 'x-circle', true),
	(5, 'expired', 'Expired', '#6b7280', 'hourglass', true);


--
-- Data for Name: quote_templates; Type: TABLE DATA; Schema: public; Owner: postgres
--



--
-- Data for Name: rejection_reasons; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."rejection_reasons" ("id", "reason", "category", "is_active", "created_at", "updated_at") VALUES
	('bd24ffa0-7069-469c-b2e6-7f3a8ff7e98c', 'Item not available', 'availability', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('3dbbc6dd-4d1d-4f60-aa6f-2ae201c30416', 'Price too high', 'pricing', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('319ad22d-b09b-41fc-9088-ed8b598a8f8e', 'Shipping restrictions', 'shipping', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('f8659120-2cb4-4067-b6d2-937e0c2fa328', 'Customs restrictions', 'customs', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('5891582d-25a1-4aca-bfc5-24dcfc12f1e7', 'Quality concerns', 'quality', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('92d566de-ff34-4f72-bb8e-e51a99a57223', 'Customer request', 'customer', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('33986c91-7688-4e7a-a266-9578d6389f6e', 'Payment issues', 'payment', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('67ff1efb-d93e-4ac1-950f-21791222887d', 'Duplicate request', 'administrative', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('c3de8909-8fd8-45b5-8c5b-ac62ca9f244d', 'Insufficient information', 'administrative', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00'),
	('f04b1875-ea88-40c8-80bc-c0bf4418bf2f', 'Other', 'general', true, '2025-07-11 12:13:40.130209+00', '2025-07-11 12:13:40.130209+00');


--
-- Data for Name: route_customs_tiers; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."route_customs_tiers" ("id", "origin_country", "destination_country", "rule_name", "price_min", "price_max", "weight_min", "weight_max", "logic_type", "customs_percentage", "vat_percentage", "priority_order", "is_active", "description", "created_at", "updated_at") VALUES
	('b499c7b0-b21a-49e3-91cb-6f8a633b2d4b', 'US', 'IN', 'Low Value Items', 0.00, 100.00, 0.000, 1.000, 'AND', 5.00, 18.00, 1, true, 'Low value items under $100 and 1kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('ebf77136-7eb0-493b-b3ed-e858c9c8ff3a', 'US', 'IN', 'Medium Value Items', 100.00, 500.00, 1.000, 5.000, 'OR', 10.00, 18.00, 2, true, 'Medium value items $100-500 OR 1-5kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('ee59961b-8166-41c9-8f3a-f673e536b74d', 'US', 'IN', 'High Value Items', 500.00, NULL, 5.000, NULL, 'AND', 15.00, 18.00, 3, true, 'High value items over $500 and 5kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('cf6ec886-4067-44aa-904f-b15b598407ca', 'CN', 'IN', 'Low Value Items', 0.00, 50.00, 0.000, 0.500, 'AND', 3.00, 18.00, 1, true, 'Low value items under $50 and 0.5kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('42e933ae-09c8-46f5-bb00-0a26b3bb5236', 'CN', 'IN', 'Medium Value Items', 50.00, 200.00, 0.500, 2.000, 'OR', 8.00, 18.00, 2, true, 'Medium value items $50-200 OR 0.5-2kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('809bbf4b-f163-4c3e-9d35-3c18424d8953', 'CN', 'IN', 'High Value Items', 200.00, NULL, 2.000, NULL, 'AND', 12.00, 18.00, 3, true, 'High value items over $200 and 2kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('d6d0a1df-154d-411a-9a39-7ee9865a71f7', 'GB', 'IN', 'Low Value Items', 0.00, 75.00, 0.000, 1.000, 'AND', 6.00, 18.00, 1, true, 'Low value items under £75 and 1kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('56a16ad6-0005-49ea-8e2c-864222fc19ad', 'GB', 'IN', 'Medium Value Items', 75.00, 300.00, 1.000, 3.000, 'OR', 11.00, 18.00, 2, true, 'Medium value items £75-300 OR 1-3kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00'),
	('88e410fe-ce6a-45ae-ad6b-c7a75d9f3b5a', 'GB', 'IN', 'High Value Items', 300.00, NULL, 3.000, NULL, 'AND', 16.00, 18.00, 3, true, 'High value items over £300 and 3kg', '2025-07-10 11:46:27.917544+00', '2025-07-10 11:46:27.917544+00');


--
-- Data for Name: status_transitions; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."status_transitions" ("id", "quote_id", "from_status", "to_status", "trigger", "metadata", "changed_by", "changed_at") VALUES
	('38ef4c8e-2701-4096-94e0-f6bd3d73d3f2', '05f4c2d9-801b-4524-9de6-93f9220fd067', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 04:36:24.055967+00'),
	('46d4ffed-376d-4ca8-9da3-6ce4478537eb', 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:17:20.420577+00'),
	('88975fba-0c02-4473-81d1-4e21609de167', 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:17:34.66851+00'),
	('4db92834-c4f5-414d-acab-879458301bf4', 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', 'approved', 'ordered', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:23:50.867175+00'),
	('917484e5-de96-4ad3-a352-8d14ff761570', 'd0d9e2cf-7375-45ea-a08d-ac133b09db0b', 'ordered', 'paid', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:24:58.310394+00'),
	('7d34c7cd-c891-464b-b916-5203bd5f4f74', 'c40d76fd-e891-46af-975f-684ae16fa915', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:33:27.034895+00'),
	('8ed280c3-374d-434a-88b3-cff4e7f27c46', 'c40d76fd-e891-46af-975f-684ae16fa915', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:33:35.716723+00'),
	('388c0681-c846-42d7-a65b-3b4a0a7eebef', 'c40d76fd-e891-46af-975f-684ae16fa915', 'approved', 'ordered', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:44:40.822107+00'),
	('e84cf77e-e984-445f-8549-1e1473f674df', 'ec2dd22c-7427-406b-bd25-0244e2887bce', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:46:23.175639+00'),
	('ff6eb8c4-c73b-4353-8b6e-88f9e51ae5d7', 'ec2dd22c-7427-406b-bd25-0244e2887bce', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:46:27.118097+00'),
	('4dd070c4-09d5-443b-ae94-b29991ea62f4', '4337bcd2-7897-4a93-bdb3-aebe0aac9a20', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:50:05.656009+00'),
	('9dc200c5-2549-47d5-88a0-9430af822962', '4337bcd2-7897-4a93-bdb3-aebe0aac9a20', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:50:11.14853+00'),
	('68737192-c2a8-45dd-bc99-47aa8ddc59cc', '3ee5a939-b249-41bb-88ed-033cbbf485fd', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:51:02.395977+00'),
	('d05b9fd8-ed7f-4e3b-85bd-a3e26c2fcbd0', '3ee5a939-b249-41bb-88ed-033cbbf485fd', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:51:11.396422+00'),
	('a2fd9041-5249-433b-a56c-247f40052567', '3ee5a939-b249-41bb-88ed-033cbbf485fd', 'approved', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:53:00.462901+00'),
	('aa076cb4-37af-471f-973d-ded3ce72aa33', '3ee5a939-b249-41bb-88ed-033cbbf485fd', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:53:14.023841+00'),
	('052ff67a-953f-4dfb-8cf9-97939771562c', 'f496c4d2-91e4-4c0e-84e7-577bd5ae5523', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:56:38.073726+00'),
	('8b48ea18-49f6-4d14-8cac-6cd64b81224f', 'f496c4d2-91e4-4c0e-84e7-577bd5ae5523', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 13:56:45.356135+00'),
	('e1269f16-c781-4b54-af16-a47b11322f7d', 'd2d7d0a4-23eb-447c-8c4f-7e7081009bdc', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 14:01:29.405946+00'),
	('17599f18-6348-425d-a475-c477cf7b5fe6', 'd2d7d0a4-23eb-447c-8c4f-7e7081009bdc', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 14:01:38.600202+00'),
	('e5a5b596-5f9c-47ca-952f-c5f576a82c8f', 'f356fc0c-be0f-48d8-9415-997d97648c3d', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 14:23:34.533324+00'),
	('22b8e294-f2ea-412d-9d7e-1ccf90516e8f', 'f356fc0c-be0f-48d8-9415-997d97648c3d', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 14:23:42.549303+00'),
	('0099b9e7-82b2-4f91-90c3-477568b744bd', '3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 17:46:04.596715+00'),
	('70f31157-9683-400f-b9cd-248bb2174773', '3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 17:46:11.471782+00'),
	('dbaca2bd-68ed-4b24-b47c-8ee57ddd91b6', '3781d2ec-0f3e-4c72-ba0e-acf37f01b8f3', 'approved', 'ordered', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 18:11:56.312904+00'),
	('d2b5700f-ccbb-4484-b6b1-7924436f14ee', '874ce0c6-12b1-44a4-9677-4226de669861', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 18:14:02.822397+00'),
	('7a1a8e35-5afe-4b71-b8ca-c7acf053b680', '874ce0c6-12b1-44a4-9677-4226de669861', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 18:14:04.799241+00'),
	('cb54dcbe-d6fb-4aa9-837f-9904f7848cfb', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 18:25:50.791806+00'),
	('f452b7bd-f49d-4d14-98da-efe683e4218a', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 18:25:58.172203+00'),
	('90b25330-a4bb-4946-8b04-070790ee0070', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'approved', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 00:00:07.276794+00'),
	('d4ff30e5-bcd5-4a2e-8fd0-89dbb298c2e8', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 00:00:16.786899+00'),
	('58972fed-d2b4-428e-bf15-fc5e3ed36f1d', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'approved', 'paid', 'manual', '{}', NULL, '2025-07-12 00:35:36.035682+00'),
	('c42f8a78-d138-433e-93eb-d5462cead4eb', '874ce0c6-12b1-44a4-9677-4226de669861', 'approved', 'paid', 'manual', '{}', NULL, '2025-07-12 00:35:36.035682+00'),
	('0ec76448-7126-4a38-9571-9170edcfe741', 'ff107c51-ef2f-4340-b35b-a38bde8cb87b', 'paid', 'ordered', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 01:50:06.954568+00'),
	('82aac1fd-66f9-453d-abc9-a43d38abbd97', 'ee829559-6e39-4474-9833-ca66f0f9b852', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 01:56:29.377807+00'),
	('9ec315ae-27a8-48d5-8f7e-e252bce27e61', 'ee829559-6e39-4474-9833-ca66f0f9b852', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 01:56:42.766551+00'),
	('85de1a81-263c-43e6-a368-b21beb2eb87f', 'ee829559-6e39-4474-9833-ca66f0f9b852', 'approved', 'pending', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 03:07:06.901893+00'),
	('37d2a1d4-610e-4f4a-880e-a66a61bde638', 'ee829559-6e39-4474-9833-ca66f0f9b852', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 03:07:10.695967+00'),
	('f815d37e-5aae-42ff-abfc-d4bd76c21dfb', 'ee829559-6e39-4474-9833-ca66f0f9b852', 'sent', 'approved', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 03:07:19.064942+00'),
	('3c3db021-6103-44f4-8628-68b80c9a8c8c', '012ba558-994d-402f-a855-d33967607db3', 'pending', 'sent', 'manual', '{}', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-12 03:08:43.120527+00');


--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."system_settings" ("id", "setting_key", "setting_value", "description", "created_at", "updated_at") VALUES
	('04737d57-a0f8-4ed8-b3bc-469d0ba73b5c', 'site_name', 'iWishBag', 'Website name', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('7257566c-7903-4c25-9871-126c1e6b7b48', 'site_description', 'Shop internationally and get anything delivered to your doorstep', 'Website description', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('4d77297e-1a4c-4983-a555-2e51e6293cae', 'default_currency', 'USD', 'Default currency for the platform', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('ce0dec9a-d192-45db-92cd-b9398fbd22d6', 'support_email', 'info@iwishbag.com', 'Customer support email', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('a70ec1c7-fdd9-4f83-af64-9b43faaf3a4e', 'max_quote_amount', '1000000', 'Maximum quote amount in USD', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('5311ad47-97a7-4472-b71a-682405385ee0', 'auto_approval_limit', '100', 'Auto-approval limit for quotes in USD', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('43bd8132-3b82-4f81-ab5b-41de0c8b7f5c', 'quote_statuses', '[
  {
    "id": "pending",
    "name": "pending",
    "label": "Pending",
    "description": "Quote request is awaiting review",
    "color": "secondary",
    "icon": "Clock",
    "isActive": true,
    "order": 1,
    "allowedTransitions": ["sent", "rejected"],
    "isTerminal": false,
    "category": "quote"
  },
   {
    "id": "calculated",
    "name": "calculated",
    "label": "Calculated",
    "description": "Quote has been calculated and is ready for review",
    "color": "secondary",
    "icon": "Calculator",
    "isActive": true,
    "order": 6,
    "allowedTransitions": ["sent", "approved", "rejected"],
    "isTerminal": false,
    "category": "quote"
  },
  {
    "id": "sent",
    "name": "sent",
    "label": "Sent",
    "description": "Quote has been sent to customer",
    "color": "outline",
    "icon": "FileText",
    "isActive": true,
    "order": 2,
    "allowedTransitions": ["approved", "rejected", "expired"],
    "autoExpireHours": 168,
    "isTerminal": false,
    "category": "quote"
  },
  {
    "id": "approved",
    "name": "approved",
    "label": "Approved",
    "description": "Customer has approved the quote",
    "color": "default",
    "icon": "CheckCircle",
    "isActive": true,
    "order": 3,
    "allowedTransitions": ["rejected"],
    "isTerminal": false,
    "category": "quote"
  },
  {
    "id": "rejected",
    "name": "rejected",
    "label": "Rejected",
    "description": "Quote has been rejected",
    "color": "destructive",
    "icon": "XCircle",
    "isActive": true,
    "order": 4,
    "allowedTransitions": ["approved"],
    "isTerminal": true,
    "category": "quote"
  },
  {
    "id": "expired",
    "name": "expired",
    "label": "Expired",
    "description": "Quote has expired",
    "color": "destructive",
    "icon": "AlertTriangle",
    "isActive": true,
    "order": 5,
    "allowedTransitions": ["approved"],
    "isTerminal": true,
    "category": "quote"
  }
 
]', 'Quote status configuration', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('06149297-b2dc-4fb4-9614-e83ec290e049', 'order_statuses', '[
  {
    "id": "payment_pending",
    "name": "payment_pending",
    "label": "Payment Pending",
    "description": "Awaiting bank transfer payment confirmation",
    "color": "secondary",
    "icon": "Clock",
    "isActive": true,
    "order": 1,
    "allowedTransitions": ["partial_payment", "paid", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "bank_transfer_pending",
    "requiresAction": true,
    "showsInQuotesList": true,
    "showsInOrdersList": false,
    "canBePaid": false
  },
  {
    "id": "partial_payment",
    "name": "partial_payment",
    "label": "Partial Payment",
    "description": "Partial payment received",
    "color": "warning",
    "icon": "AlertTriangle",
    "isActive": true,
    "order": 2,
    "allowedTransitions": ["paid", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": false,
    "requiresAction": true,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "processing",
    "name": "processing",
    "label": "Processing",
    "description": "Order is being processed (Cash on Delivery)",
    "color": "default",
    "icon": "Package",
    "isActive": true,
    "order": 3,
    "allowedTransitions": ["ordered", "shipped", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "cod_order_confirmed",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "paid",
    "name": "paid",
    "label": "Paid",
    "description": "Payment has been received",
    "color": "default",
    "icon": "DollarSign",
    "isActive": true,
    "order": 4,
    "allowedTransitions": ["ordered", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "payment_received",
    "requiresAction": true,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "ordered",
    "name": "ordered",
    "label": "Ordered",
    "description": "Order has been placed with merchant",
    "color": "default",
    "icon": "ShoppingCart",
    "isActive": true,
    "order": 5,
    "allowedTransitions": ["shipped", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_placed",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "shipped",
    "name": "shipped",
    "label": "Shipped",
    "description": "Order has been shipped",
    "color": "secondary",
    "icon": "Truck",
    "isActive": true,
    "order": 6,
    "allowedTransitions": ["completed", "cancelled"],
    "isTerminal": false,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_shipped",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "completed",
    "name": "completed",
    "label": "Completed",
    "description": "Order has been delivered",
    "color": "outline",
    "icon": "CheckCircle",
    "isActive": true,
    "order": 7,
    "allowedTransitions": [],
    "isTerminal": true,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_completed",
    "requiresAction": false,
    "showsInQuotesList": false,
    "showsInOrdersList": true,
    "canBePaid": false
  },
  {
    "id": "cancelled",
    "name": "cancelled",
    "label": "Cancelled",
    "description": "Quote or order has been cancelled",
    "color": "destructive",
    "icon": "XCircle",
    "isActive": true,
    "order": 8,
    "allowedTransitions": [],
    "isTerminal": true,
    "category": "order",
    "triggersEmail": true,
    "emailTemplate": "order_cancelled",
    "requiresAction": false,
    "showsInQuotesList": true,
    "showsInOrdersList": true,
    "canBePaid": false
  }
]', 'Order status configuration', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('0367ab19-ade6-41db-b372-f62a05097c37', 'exchange_rate_markup_percentage', '2.5', 'Exchange rate markup percentage applied to all currency conversions', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('ff87ea97-68be-4774-a4f2-126b82afa16f', 'auto_exchange_rate_enabled', 'true', 'Enable automatic exchange rate updates', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('ed4cbef6-ac08-4181-9785-fac69acbfdb7', 'exchange_rate_update_interval_hours', '24', 'Interval in hours for automatic exchange rate updates', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('ddb49271-2e9b-4472-821f-0340d2affc93', 'wishlist_enabled', 'true', 'Enable wishlist feature for users', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('14096210-c607-45ac-af68-3d9c161f4849', 'email_notifications_enabled', 'true', 'Enable system-wide email notifications', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('7ac34401-a527-4877-bb74-5af64097dc3b', 'payment_reminder_intervals', '[3, 7, 14]', 'Days after order to send payment reminders', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('cee71cc8-b9dd-4123-9ca0-9e720642b857', 'partial_payment_allowed', 'true', 'Whether to accept partial payments', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('be58ce43-825a-4470-946b-a4afd09d4621', 'overpayment_handling', 'refund', 'How to handle overpayments: refund, credit, or manual', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('fc940b94-b5a6-417a-8052-686b2f6cc752', 'bank_transfer_timeout_days', '15', 'Days before cancelling unpaid bank transfer orders', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('df760f75-62a6-4d57-a076-61a4917fefbf', 'cod_available_countries', '["IN", "NP"]', 'Countries where COD is available', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00'),
	('bee5c13c-ff05-402b-b748-ca64e757a96f', 'default_payment_instructions', '{"bank_transfer": "Please use your Order ID as the payment reference. Send payment confirmation to info@iwishbag.com", "cod": "Please keep the exact amount ready in cash. Our delivery partner will collect the payment upon delivery."}', 'Default payment instructions by method', '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00');


--
-- Data for Name: user_addresses; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_addresses" ("id", "user_id", "address_line1", "address_line2", "city", "state_province_region", "postal_code", "country", "country_code", "is_default", "created_at", "updated_at", "phone", "recipient_name", "destination_country") VALUES
	('b326dd9f-85d4-4607-839f-79f037bb081d', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '1st floor, 16/194 Faiz Road, Karol Bagh, Gully 7, Lal Masjid', NULL, 'New Delhi', 'New Delhi', '110005', 'United States', NULL, true, '2025-07-11 12:16:37.777484+00', '2025-07-11 12:16:37.777484+00', '+919311161034', 'raunak', 'US');


--
-- Data for Name: user_roles; Type: TABLE DATA; Schema: public; Owner: postgres
--

INSERT INTO "public"."user_roles" ("id", "user_id", "role", "created_at", "created_by") VALUES
	('83bebba1-e4aa-4b18-9af9-4ae7d05e7f59', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', 'admin', '2025-07-11 04:35:13.628621+00', 'c5d8ea1d-d801-4362-8150-7d605e7765fc');


--
-- Data for Name: buckets; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."buckets" ("id", "name", "owner", "created_at", "updated_at", "public", "avif_autodetection", "file_size_limit", "allowed_mime_types", "owner_id") VALUES
	('product-images', 'product-images', NULL, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', true, false, 10485760, '{image/jpeg,image/png,image/webp,image/gif}', NULL),
	('message-attachments', 'message-attachments', NULL, '2025-07-10 11:46:33.757228+00', '2025-07-10 11:46:33.757228+00', true, false, 10485760, '{image/jpeg,image/png,image/webp,image/gif,application/pdf}', NULL);


--
-- Data for Name: objects; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--

INSERT INTO "storage"."objects" ("id", "bucket_id", "name", "owner", "created_at", "updated_at", "last_accessed_at", "metadata", "version", "owner_id", "user_metadata") VALUES
	('91258473-91ee-4a91-b9b1-bf6385e79566', 'message-attachments', 'payment-proof-c5d8ea1d-d801-4362-8150-7d605e7765fc-1752236662509.pdf', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '2025-07-11 12:24:22.895607+00', '2025-07-11 12:24:22.895607+00', '2025-07-11 12:24:22.895607+00', '{"eTag": "\"aa7aed34d8217346cade9ffb15d3f596\"", "size": 59469, "mimetype": "application/pdf", "cacheControl": "max-age=3600", "lastModified": "2025-07-11T12:24:23.000Z", "contentLength": 59469, "httpStatusCode": 200}', '4929c22e-2a64-4fee-9eee-2eb59d11c4e1', 'c5d8ea1d-d801-4362-8150-7d605e7765fc', '{}');


--
-- Data for Name: s3_multipart_uploads; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Data for Name: s3_multipart_uploads_parts; Type: TABLE DATA; Schema: storage; Owner: supabase_storage_admin
--



--
-- Name: refresh_tokens_id_seq; Type: SEQUENCE SET; Schema: auth; Owner: supabase_auth_admin
--

SELECT pg_catalog.setval('"auth"."refresh_tokens_id_seq"', 69, true);


--
-- Name: quote_address_history_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."quote_address_history_id_seq"', 14, true);


--
-- Name: quote_statuses_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."quote_statuses_id_seq"', 5, true);


--
-- Name: shipping_routes_id_seq; Type: SEQUENCE SET; Schema: public; Owner: postgres
--

SELECT pg_catalog.setval('"public"."shipping_routes_id_seq"', 26, true);


--
-- PostgreSQL database dump complete
--

RESET ALL;
