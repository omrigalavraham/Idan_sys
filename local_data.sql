--
-- PostgreSQL database dump
--

\restrict T5Oxok69fktoV94ygub0s2Pf2r7sRwiixtStgDaiKOv5N92ncv0mnIFKMiwcpa6

-- Dumped from database version 14.19 (Homebrew)
-- Dumped by pg_dump version 14.19 (Homebrew)

SET statement_timeout = 0;
SET lock_timeout = 0;
SET idle_in_transaction_session_timeout = 0;
SET client_encoding = 'UTF8';
SET standard_conforming_strings = on;
SELECT pg_catalog.set_config('search_path', '', false);
SET check_function_bodies = false;
SET xmloption = content;
SET client_min_messages = warning;
SET row_security = off;

--
-- Data for Name: system_clients; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.system_clients VALUES (7, 'דני כהן', 'דני כהן בע״מ', '#3b82f6', '#1e40af', NULL, true, '[{"id": "new", "name": "חדש", "color": "#10b981", "order": 1, "isFinal": false, "isDefault": true}, {"id": "contacted", "name": "יצרתי קשר", "color": "#3b82f6", "order": 2, "isFinal": false, "isDefault": false}, {"id": "qualified", "name": "מתאים", "color": "#f59e0b", "order": 3, "isFinal": false, "isDefault": false}, {"id": "converted", "name": "התקבל", "color": "#10b981", "order": 4, "isFinal": true, "isDefault": false}, {"id": "rejected", "name": "נדחה", "color": "#ef4444", "order": 5, "isFinal": true, "isDefault": false}, {"id": "e83d740c-31a3-4afe-93c1-3c05ab202ef3", "name": "חרטטן", "color": "#6b7280", "order": 999, "isFinal": false}, {"id": "ab5e6e66-9b6f-4641-b61f-447cd3c9a766", "name": "עסקה נסגרה", "color": "#6b7280", "order": 999, "isFinal": false}]', '[{"id": "active", "name": "פעיל", "color": "#10b981", "order": 1}, {"id": "inactive", "name": "לא פעיל", "color": "#6b7280", "order": 2}, {"id": "suspended", "name": "מושעה", "color": "#f59e0b", "order": 3}, {"id": "cd0377dc-851e-451d-9d73-7591fb3275df", "name": "סטטוס חדש", "color": "#6b7280", "order": 999, "isFinal": false}]', '[{"id": "pending", "name": "ממתין לתשלום", "color": "#f59e0b", "order": 1}, {"id": "paid", "name": "שולם", "color": "#10b981", "order": 2}, {"id": "overdue", "name": "באיחור", "color": "#ef4444", "order": 3}]', '2025-09-15 22:51:26.554812', '2025-09-16 20:56:03.031913', '{"leads": {"name": "לידים", "enabled": true, "settings": {}}, "tasks": {"name": "משימות", "enabled": true, "settings": {}}, "dialer": {"name": "חייגן", "enabled": false, "settings": {}}, "reports": {"name": "דוחות", "enabled": false, "settings": {}}, "calendar": {"name": "יומן", "enabled": true, "settings": {}}, "customers": {"name": "מעקב לקוחות", "enabled": true, "settings": {}}, "reminders": {"name": "תזכורות", "enabled": true, "settings": {}}, "attendance": {"name": "נוכחות", "enabled": true, "settings": {}}, "userManagement": {"name": "ניהול משתמשים", "enabled": true, "settings": {}}}', '[{"id": 1757972650126, "content": "מה קורה?", "subject": "היי", "is_active": true, "variables": [], "template_name": "תבנית חדשה", "template_type": "email"}]', NULL);
INSERT INTO public.system_clients VALUES (10, 'עידן ', 'עידן  - חברה', '#3b82f6', '#1e40af', NULL, true, '[{"id": "new", "name": "חדש", "color": "#10b981", "order": 1, "isFinal": false, "isDefault": true}, {"id": "contacted", "name": "יצרתי קשר", "color": "#3b82f6", "order": 2, "isFinal": false, "isDefault": false}, {"id": "qualified", "name": "מתאים", "color": "#f59e0b", "order": 3, "isFinal": false, "isDefault": false}, {"id": "converted", "name": "התקבל", "color": "#10b981", "order": 4, "isFinal": true, "isDefault": false}, {"id": "rejected", "name": "נדחה", "color": "#ef4444", "order": 5, "isFinal": true, "isDefault": false}]', '[{"id": "active", "name": "פעיל", "color": "#10b981", "order": 1}, {"id": "inactive", "name": "לא פעיל", "color": "#6b7280", "order": 2}, {"id": "suspended", "name": "מושעה", "color": "#f59e0b", "order": 3}]', '[{"id": "pending", "name": "ממתין לתשלום", "color": "#f59e0b", "order": 1}, {"id": "paid", "name": "שולם", "color": "#10b981", "order": 2}, {"id": "overdue", "name": "באיחור", "color": "#ef4444", "order": 3}]', '2025-09-16 21:26:33.405574', '2025-09-17 13:41:39.326956', '{"leads": true, "tasks": true, "dialer": true, "reports": true, "calendar": true, "customers": true, "attendance": true}', '[]', NULL);
INSERT INTO public.system_clients VALUES (6, 'עדי ג׳אנו', 'עדי ג׳אנו - חברה', '#3b82f6', '#1e40af', NULL, true, '[{"id": "new", "name": "חדש", "color": "#10b981", "order": 1, "isFinal": false, "isDefault": true}, {"id": "contacted", "name": "יצרתי קשר", "color": "#3b82f6", "order": 2, "isFinal": false, "isDefault": false}, {"id": "qualified", "name": "מתאים", "color": "#f59e0b", "order": 3, "isFinal": false, "isDefault": false}, {"id": "converted", "name": "התקבל", "color": "#10b981", "order": 4, "isFinal": true, "isDefault": false}, {"id": "rejected", "name": "נדחה", "color": "#ef4444", "order": 5, "isFinal": true, "isDefault": false}, {"id": "1c412a22-2045-4979-98d8-0f4b9eedf91f", "name": "ניראל ג׳אנו", "color": "#6b7280", "order": 999, "isFinal": false, "isDefault": false}]', '[{"id": "active", "name": "פעיל", "color": "#10b981", "order": 1}, {"id": "inactive", "name": "לא פעיל", "color": "#6b7280", "order": 2}, {"id": "suspended", "name": "מושעה!!", "color": "#f50a70", "order": 3}]', '[{"id": "pending", "name": "ממתין לתשלום", "color": "#f59e0b", "order": 1}, {"id": "paid", "name": "שולם", "color": "#10b981", "order": 2}, {"id": "overdue", "name": "באיחור", "color": "#ef4444", "order": 3}]', '2025-09-15 22:23:05.790389', '2025-09-16 00:26:00.443307', '{"leads": {"name": "לידים", "enabled": true, "settings": {}}, "tasks": {"name": "משימות", "enabled": true, "settings": {}}, "dialer": {"name": "חייגן", "enabled": true, "settings": {}}, "reports": {"name": "דוחות", "enabled": true, "settings": {}}, "calendar": {"name": "יומן", "enabled": true, "settings": {}}, "customers": {"name": "מעקב לקוחות", "enabled": true, "settings": {}}, "reminders": {"name": "תזכורות", "enabled": true, "settings": {}}, "attendance": {"name": "נוכחות", "enabled": true, "settings": {}}, "userManagement": {"name": "ניהול משתמשים", "enabled": true, "settings": {}}}', '[{"id": 1757966460575, "content": "היי לא ענית תחזור אליי", "is_active": true, "variables": [], "template_name": "לקוח לא עונה", "template_type": "whatsapp"}]', NULL);
INSERT INTO public.system_clients VALUES (9, 'df ', 'df  - חברה', '#3b82f6', '#1e40af', NULL, true, '[{"id": "new", "name": "חדש", "color": "#10b981", "order": 1, "isFinal": false, "isDefault": true}, {"id": "contacted", "name": "יצרתי קשר", "color": "#3b82f6", "order": 2, "isFinal": false, "isDefault": false}, {"id": "qualified", "name": "מתאים", "color": "#f59e0b", "order": 3, "isFinal": false, "isDefault": false}, {"id": "converted", "name": "התקבל", "color": "#10b981", "order": 4, "isFinal": true, "isDefault": false}, {"id": "rejected", "name": "נדחה", "color": "#ef4444", "order": 5, "isFinal": true, "isDefault": false}]', '[{"id": "active", "name": "פעיל", "color": "#10b981", "order": 1}, {"id": "inactive", "name": "לא פעיל", "color": "#6b7280", "order": 2}, {"id": "suspended", "name": "מושעה", "color": "#f59e0b", "order": 3}]', '[{"id": "pending", "name": "ממתין לתשלום", "color": "#f59e0b", "order": 1}, {"id": "paid", "name": "שולם", "color": "#10b981", "order": 2}, {"id": "overdue", "name": "באיחור", "color": "#ef4444", "order": 3}]', '2025-09-16 20:51:05.586353', '2025-09-16 20:51:05.586353', '{"leads": true, "tasks": true, "dialer": true, "reports": true, "calendar": true, "customers": true, "attendance": true}', '[]', NULL);
INSERT INTO public.system_clients VALUES (12, 'amit ', 'amit  - חברה', '#3b82f6', '#1e40af', NULL, true, '[{"id": "new", "name": "חדש", "color": "#10b981", "order": 1, "isFinal": false, "isDefault": true}, {"id": "contacted", "name": "יצרתי קשר", "color": "#3b82f6", "order": 2, "isFinal": false, "isDefault": false}, {"id": "qualified", "name": "מתאים", "color": "#f59e0b", "order": 3, "isFinal": false, "isDefault": false}, {"id": "converted", "name": "התקבל", "color": "#10b981", "order": 4, "isFinal": true, "isDefault": false}, {"id": "rejected", "name": "נדחה", "color": "#ef4444", "order": 5, "isFinal": true, "isDefault": false}]', '[{"id": "active", "name": "פעיל", "color": "#10b981", "order": 1}, {"id": "inactive", "name": "לא פעיל", "color": "#6b7280", "order": 2}, {"id": "suspended", "name": "מושעה", "color": "#f59e0b", "order": 3}]', '[{"id": "pending", "name": "ממתין לתשלום", "color": "#f59e0b", "order": 1}, {"id": "paid", "name": "שולם", "color": "#10b981", "order": 2}, {"id": "overdue", "name": "באיחור", "color": "#ef4444", "order": 3}]', '2025-09-17 13:21:23.905983', '2025-09-17 13:21:23.905983', '{"leads": true, "tasks": true, "dialer": true, "reports": true, "calendar": true, "customers": true, "attendance": true}', '[]', NULL);
INSERT INTO public.system_clients VALUES (13, 'רון ישראלי', 'רון ישראלי', '#3b82f6', '#1e40af', '', true, '[{"id": "new", "name": "חדש", "color": "#10b981", "order": 1, "isFinal": false, "isDefault": true}, {"id": "contacted", "name": "יצרתי קשר", "color": "#3b82f6", "order": 2, "isFinal": false, "isDefault": false}, {"id": "qualified", "name": "מתאים", "color": "#f59e0b", "order": 3, "isFinal": false, "isDefault": false}, {"id": "converted", "name": "התקבל", "color": "#10b981", "order": 4, "isFinal": true, "isDefault": false}, {"id": "rejected", "name": "נדחה", "color": "#ef4444", "order": 5, "isFinal": true, "isDefault": false}]', '[{"id": "active", "name": "פעיל", "color": "#10b981", "order": 1}, {"id": "inactive", "name": "לא פעיל", "color": "#6b7280", "order": 2}, {"id": "suspended", "name": "מושעה", "color": "#f59e0b", "order": 3}]', '[{"id": "pending", "name": "ממתין לתשלום", "color": "#f59e0b", "order": 1}, {"id": "paid", "name": "שולם", "color": "#10b981", "order": 2}, {"id": "overdue", "name": "באיחור", "color": "#ef4444", "order": 3}]', '2025-09-17 13:27:42.783234', '2025-09-17 13:31:51.472678', '{"leads": {"name": "לידים", "enabled": true, "settings": {}}, "tasks": {"name": "משימות", "enabled": true, "settings": {}}, "dialer": {"name": "חייגן", "enabled": true, "settings": {}}, "reports": {"name": "דוחות", "enabled": true, "settings": {}}, "calendar": {"name": "יומן", "enabled": true, "settings": {}}, "customers": {"name": "מעקב לקוחות", "enabled": true, "settings": {}}, "reminders": {"name": "תזכורות", "enabled": true, "settings": {}}, "attendance": {"name": "נוכחות", "enabled": true, "settings": {}}, "userManagement": {"name": "ניהול משתמשים", "enabled": true, "settings": {}}}', '[]', NULL);
INSERT INTO public.system_clients VALUES (15, 'Test Lead', 'Test Lead - חברה', '#3b82f6', '#1e40af', NULL, true, '[{"id": "new", "name": "חדש", "color": "#10b981", "order": 1, "isFinal": false, "isDefault": true}, {"id": "contacted", "name": "יצרתי קשר", "color": "#3b82f6", "order": 2, "isFinal": false, "isDefault": false}, {"id": "qualified", "name": "מתאים", "color": "#f59e0b", "order": 3, "isFinal": false, "isDefault": false}, {"id": "converted", "name": "התקבל", "color": "#10b981", "order": 4, "isFinal": true, "isDefault": false}, {"id": "rejected", "name": "נדחה", "color": "#ef4444", "order": 5, "isFinal": true, "isDefault": false}, {"id": "deal_closed", "name": "עסקה נסגרה", "color": "#059669", "order": 6, "isFinal": true, "isDefault": false}]', '[{"id": "active", "name": "פעיל", "color": "#10b981", "order": 1}, {"id": "inactive", "name": "לא פעיל", "color": "#6b7280", "order": 2}, {"id": "suspended", "name": "מושעה", "color": "#f59e0b", "order": 3}]', '[{"id": "pending", "name": "ממתין לתשלום", "color": "#f59e0b", "order": 1}, {"id": "paid", "name": "שולם", "color": "#10b981", "order": 2}, {"id": "overdue", "name": "באיחור", "color": "#ef4444", "order": 3}]', '2025-09-17 14:03:21.516141', '2025-09-17 14:03:21.516141', '{"leads": true, "tasks": true, "dialer": true, "reports": true, "calendar": true, "customers": true, "attendance": true}', '[]', NULL);


--
-- Data for Name: users; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.users VALUES (67, 'adi@gmail.com', '$2b$12$HG2YYeLDOnB.6tFCMRtfr.SPfCbmp5/rMtJ2Ks4/SBBB11MjkvVEy', 'עדי', 'ג׳אנו', 'manager', true, false, '2025-09-15 22:23:05.787171', '2025-09-15 22:23:05.791356', '', '0541234567', '', 6, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (7, 'admin@example.com', '$2b$12$hgA1eVw7jNUU7XwJ36jdVuVWlL4lZ.U7vSPdVd.EdZobjPmjNPpWy', 'Admin', 'User', 'admin', true, false, '2025-09-12 23:11:28.818048', '2025-09-15 00:23:51.829956', NULL, '0526689225', NULL, NULL, NULL, NULL, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (58, 'aa@aa.com', '$2b$12$W82KR0eZyUsi9.KtPC6XRud52WVaOzNbNkwGWT.RPRWQNT2ZjaqLi', '23424', '', 'agent', true, false, '2025-09-14 23:50:52.473063', '2025-09-15 23:05:08.277678', '', '0564987987', '', NULL, NULL, 7, 68, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (68, 'danny@example.com', '$2b$12$kJgG0Z9A3g67n0wxJ9F9b.RXeX3.aakM7G.HNMt4ohRVwa08h3DgG', 'דני', 'כהן', 'manager', true, false, '2025-09-15 22:51:26.546135', '2025-09-15 23:26:44.562023', '', '0505111111', '', 7, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (69, 'email@mail.com', '$2b$12$ItfSoUtIm9hn9foF0sdHGeYiy5Zgjxsg0LhR4hKNpiPda1RyThmny', 'יוסי', '', 'agent', true, false, '2025-09-16 00:06:36.902764', '2025-09-16 00:06:36.902764', '', '0526689225', '', NULL, NULL, 67, 67, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (54, 'aaa@aaa.com', '$2b$12$cqjVc1MGqxaTn7EE1UdH9.ylgNheo4/.JXZzub3/NTI8l7qQnjsZ.', 'יוסי', '', 'agent', true, false, '2025-09-14 23:43:37.039597', '2025-09-16 13:10:45.802649', '', '0521568726', '', NULL, '2025-09-15 01:12:18.672362', NULL, 68, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (70, 'dfdfh@sdg', '$2b$12$83FhHo6nXKRMscucFnykCuoQCnnpeBaXiH4nBOIM.pQ1VxGNQjeZi', 'df', '', 'manager', true, false, '2025-09-16 20:51:05.576429', '2025-09-16 20:51:05.591001', '', '0526689224', '', 9, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (73, 'idanavraham5@gmail.com', '$2b$12$f8H/pHLVSutWzgNkqvaW.uH7Sl9Fy8rq.G7VxUaIN0z9K.FIJ/atu', 'עידן', 'אברהם', 'admin', true, false, '2025-09-16 21:34:48.237731', '2025-09-16 21:34:48.237731', '', '0533464288', '', NULL, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (75, 'amit@gmail.com', '$2b$12$g8WL1kaLsayO2RUy8G7mTO3OdbMNKCUjzQCv93xdLaj0mFDuj7IcW', 'amit', '', 'manager', true, false, '2025-09-17 13:21:23.892324', '2025-09-17 13:21:23.90857', '', '0523333333', '', 12, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (76, 'ron@example.com', '$2b$12$l7hmQkLhH1JvQmOwXPLWf.uFTdc1S7tEZNTUuhaAE8Z3mnI7y7yj.', 'רון', 'ישראלי', 'manager', true, false, '2025-09-17 13:27:42.77627', '2025-09-17 13:27:42.785222', '', '0543333333', '', 13, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (72, 'dfdfh@sdgf', '$2b$12$OAoiivI.YMw6LaGRx7s07.I0dIyMYolZxNGu.9VJWMYrjZoIO4Fpu', 'עידן', '', 'manager', true, false, '2025-09-16 21:26:33.398739', '2025-09-17 13:41:53.017928', '', '0526689224', '', 10, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');
INSERT INTO public.users VALUES (79, 'test@example.com', '$2b$12$BIDgLeSDjjkFHBFSV2oxcukepPWIu06yoqXph9JwCfDE5l9La5pA6', 'Test', 'Lead', 'manager', true, false, '2025-09-17 14:03:21.505019', '2025-09-17 14:03:21.522914', '', '0501234567', '', 15, NULL, 7, NULL, '[]', '[]', '{}', '{}', '{"autoRecord": false, "showCallerId": true, "blockUnknownNumbers": false, "defaultCallDuration": 0}');


--
-- Data for Name: activity_logs; Type: TABLE DATA; Schema: public; Owner: idan
--



--
-- Data for Name: attendance_records; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.attendance_records VALUES (13, 7, '2025-09-13', '2025-09-13 15:22:58.232', '2025-09-13 15:33:55.448', 0.18, NULL, '2025-09-13 15:22:58.232513');
INSERT INTO public.attendance_records VALUES (14, 7, '2025-09-14', '2025-09-14 17:37:00', '2025-09-14 22:37:11', 5.00, NULL, '2025-09-14 22:37:09.602373');
INSERT INTO public.attendance_records VALUES (15, 7, '2025-09-16', '2025-09-16 20:45:52.536', '2025-09-16 20:55:23.996', 0.16, NULL, '2025-09-16 20:45:52.536543');
INSERT INTO public.attendance_records VALUES (16, 7, '2025-09-17', '2025-09-17 13:49:25.652', '2025-09-17 13:49:27.789', 0.00, NULL, '2025-09-17 13:49:25.653367');
INSERT INTO public.attendance_records VALUES (17, 7, '2025-09-17', '2025-09-17 13:50:09.029', '2025-09-17 13:50:10.121', 0.00, NULL, '2025-09-17 13:50:09.029962');


--
-- Data for Name: customers; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.customers VALUES (32, 'nirel', '05264649862', 'bsdsg@gmailasas.com', 'פעיל', NULL, NULL, NULL, NULL, NULL, 10, 2, NULL, NULL, 'ממתין לתשלום', 'חודשי', '2025-09-11', NULL, NULL, '{}', '2025-09-11 15:05:42.950795', '2025-09-11 15:05:42.950795', 0.00);
INSERT INTO public.customers VALUES (34, '‪Nirel Jano‬‏', '0526689225', 'nireljano@gmail.com', 'פעיל', NULL, NULL, NULL, NULL, NULL, 9, 2, NULL, NULL, 'תשלום חלקי', 'חד פעמי', '2025-09-11', NULL, NULL, '{}', '2025-09-11 15:10:59.979559', '2025-09-11 15:10:59.979559', 0.00);
INSERT INTO public.customers VALUES (36, 'yosi', '0523334344', 'yosi@yahoo.com', 'פעיל', NULL, NULL, NULL, NULL, NULL, 13, 2, NULL, NULL, 'ממתין לתשלום', 'חד פעמי', '2025-09-11', NULL, NULL, '{}', '2025-09-11 20:42:25.682383', '2025-09-11 20:42:25.682383', 118.00);
INSERT INTO public.customers VALUES (38, 'amit', '0523333333', 'amit@gmail.com', 'פעיל', 'יוסף קארו 4', 'תימנים', NULL, NULL, 'עסקה גדולה', 12, 2, NULL, '233432', 'תשלום חלקי', 'חד פעמי', '2025-10-01', NULL, NULL, '{}', '2025-09-11 22:19:30.759609', '2025-09-11 22:19:30.759609', 50000.00);
INSERT INTO public.customers VALUES (37, 'עדי ג׳אנו', '0541234567', 'adi@gmail.com', 'פעיל', 'ההסתדרות 22345', 'ג׳אנו בע״מ', NULL, 'ניראל', 'נסגר בטלפון', 16, 2, NULL, '1234456', 'שולם', 'חד פעמי', '2025-09-16', '{"monthlyAmount": "333.33", "firstPaymentDate": "2025-09-17T21:00:00.000Z", "numberOfPayments": 3}', '{}', '{}', '2025-09-11 21:18:27.805313', '2025-09-11 22:17:16.721818', 1500.00);
INSERT INTO public.customers VALUES (39, '‪Nirel Jano‬‏', '0531562195', 'no-reply@hazard.com', 'פעיל', NULL, NULL, NULL, NULL, NULL, 17, 2, NULL, NULL, 'שולם', 'חד פעמי', '2025-10-14', '{"monthlyAmount": "12000.00", "firstPaymentDate": "2025-10-14T21:00:00.000Z", "numberOfPayments": 1}', '{}', '{}', '2025-09-12 15:38:20.91315', '2025-09-12 15:38:35.182574', 12000.00);
INSERT INTO public.customers VALUES (51, 'Test Lead', '050-1234567', 'test@example.com', 'פעיל', NULL, NULL, NULL, NULL, 'Test notes', 19, 7, NULL, NULL, 'תשלום חלקי', 'חד פעמי', '2025-09-14', NULL, NULL, '{}', '2025-09-14 22:44:59.85969', '2025-09-14 22:44:59.85969', 513.30);
INSERT INTO public.customers VALUES (53, 'מיכל לוי', '052-2222222', 'michal@example.com', 'active', NULL, 'Unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ממתין לתשלום', 'חודשי', NULL, NULL, NULL, '{}', '2025-09-14 22:47:59.834417', '2025-09-14 22:47:59.834417', 0.00);
INSERT INTO public.customers VALUES (54, 'רון ישראלי', '054-3333333', 'ron@example.com', 'active', NULL, 'Unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ממתין לתשלום', 'חודשי', NULL, NULL, NULL, '{}', '2025-09-14 22:47:59.834417', '2025-09-14 22:47:59.834417', 0.00);
INSERT INTO public.customers VALUES (55, 'df', '0526689224', 'dfdfh@sdg', 'active', NULL, 'Unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ממתין לתשלום', 'חודשי', NULL, NULL, NULL, '{}', '2025-09-14 23:07:46.918974', '2025-09-14 23:07:46.918974', 0.00);
INSERT INTO public.customers VALUES (52, 'דני כהן', '050-1111111', 'danny@example.com', 'active', NULL, 'Unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ממתין לתשלום', 'חודשי', NULL, 'null', '{}', '{}', '2025-09-14 22:47:59.834417', '2025-09-15 19:32:11.240986', 0.01);
INSERT INTO public.customers VALUES (56, 'עידן', '0526689224', 'dfdfh@sdg', 'פעיל', NULL, NULL, NULL, NULL, NULL, 234, 7, NULL, NULL, 'ממתין לתשלום', 'חד פעמי', '2025-09-15', '{"monthlyAmount": "14.16", "firstPaymentDate": "2025-09-15T21:00:00.000Z", "numberOfPayments": 1}', '{}', '{}', '2025-09-16 20:50:29.724257', '2025-09-16 21:18:48.366527', 14.16);
INSERT INTO public.customers VALUES (57, 'כעעכ', '0526689225', 'gsgd@gmail.com', 'פעיל', NULL, NULL, NULL, NULL, NULL, 259, 68, 7, NULL, 'ממתין לתשלום', 'חד פעמי', '2025-09-17', NULL, NULL, '{}', '2025-09-17 13:35:24.971789', '2025-09-17 13:35:24.971789', 118.00);
INSERT INTO public.customers VALUES (58, 'איציק', '0522344564', 'izik@gmail.com', 'active', NULL, 'Unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ממתין לתשלום', 'חודשי', NULL, NULL, NULL, '{}', '2025-09-17 14:44:16.212128', '2025-09-17 14:44:16.212128', 0.00);
INSERT INTO public.customers VALUES (59, 'ddd', '0313131313', 'hazard.reporter@outlook.com', 'active', NULL, 'Unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ממתין לתשלום', 'חודשי', NULL, NULL, NULL, '{}', '2025-09-17 15:11:19.706261', '2025-09-17 15:11:19.706261', 0.00);
INSERT INTO public.customers VALUES (60, 'dfg', '0526262626', '', 'active', NULL, 'Unknown', NULL, NULL, NULL, NULL, NULL, NULL, NULL, 'ממתין לתשלום', 'חודשי', NULL, NULL, NULL, '{}', '2025-09-17 15:11:19.706261', '2025-09-17 15:11:19.706261', 0.00);


--
-- Data for Name: customer_services; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.customer_services VALUES (4, 32, 'טלפונייה', 250.00, 'included', 250.00, 'חודשי');
INSERT INTO public.customer_services VALUES (7, 34, 'ענן', 1599.00, 'included', 1599.00, 'חד פעמי');
INSERT INTO public.customer_services VALUES (9, 36, 'שירותי ענן', 118.00, 'plus', 118.00, 'חד פעמי');
INSERT INTO public.customer_services VALUES (19, 37, 'שירותי ענן וטלפוניה', 1500.00, 'plus', 1500.00, 'חד פעמי');
INSERT INTO public.customer_services VALUES (20, 38, 'פיצרייה', 50000.00, 'included', 50000.00, 'חד פעמי');
INSERT INTO public.customer_services VALUES (22, 39, 'ענן', 12000.00, 'plus', 12000.00, 'חד פעמי');
INSERT INTO public.customer_services VALUES (23, 51, 'ג', 513.30, 'plus', 513.30, 'חד פעמי');
INSERT INTO public.customer_services VALUES (25, 56, 'ענן', 14.16, 'plus', 14.16, 'חד פעמי');
INSERT INTO public.customer_services VALUES (26, 57, 'ענן', 118.00, 'plus', 118.00, 'חד פעמי');


--
-- Data for Name: leads; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.leads VALUES (236, 53, 'מיכל לוי', '052-2222222', 'michal@example.com', 'נשלחה הצעת מחיר', 'גוגל', NULL, NULL, 'מעוניינת באינטרנט עסקי', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:28:28.119107', '2025-09-14 23:28:28.119107');
INSERT INTO public.leads VALUES (237, 54, 'רון ישראלי', '054-3333333', 'ron@example.com', 'חדש', 'המלצות', NULL, NULL, 'מעוניין בשירותי ענן', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:28:28.119107', '2025-09-14 23:28:28.119107');
INSERT INTO public.leads VALUES (251, NULL, 'כעי', '0511565489', NULL, 'חדש', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 67, 6, '2025-09-15 23:52:27.741777', '2025-09-15 23:52:27.741777');
INSERT INTO public.leads VALUES (259, 57, 'כעעכ', '0526689225', '', 'לקוח קיים', NULL, NULL, NULL, 'הלקוח לא עונה מספר פעמים אני לא חושב שהוא רלוונטי', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 68, 7, '2025-09-16 20:56:22.38948', '2025-09-17 13:35:25.06787');
INSERT INTO public.leads VALUES (27, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:07:46.918974', '2025-09-14 23:07:46.918974');
INSERT INTO public.leads VALUES (28, 52, 'דני כהן', '050-1111111', 'danny@example.com', 'חדש', 'פייסבוק', NULL, NULL, 'מעוניין במערכת טלפוניה', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:07:51.597952', '2025-09-14 23:07:51.597952');
INSERT INTO public.leads VALUES (29, 53, 'מיכל לוי', '052-2222222', 'michal@example.com', 'נשלחה הצעת מחיר', 'גוגל', NULL, NULL, 'מעוניינת באינטרנט עסקי', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:07:51.597952', '2025-09-14 23:07:51.597952');
INSERT INTO public.leads VALUES (30, 54, 'רון ישראלי', '054-3333333', 'ron@example.com', 'חדש', 'המלצות', NULL, NULL, 'מעוניין בשירותי ענן', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:07:51.597952', '2025-09-14 23:07:51.597952');
INSERT INTO public.leads VALUES (263, 58, 'איציק', '0522344564', 'izik@gmail.com', 'חדש', 'excel_import', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:03:11.76202', '2025-09-17 15:03:11.76202');
INSERT INTO public.leads VALUES (269, 60, 'ty', '6666', '', 'חדש', 'excel_import', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:11:29.964271', '2025-09-17 15:11:29.964271');
INSERT INTO public.leads VALUES (255, NULL, 'ddd', '0313131313', 'hazard.reporter@outlook.com', 'חרטטן', 'פייסבוק', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 58, 7, '2025-09-16 00:37:45.712323', '2025-09-16 02:03:33.978779');
INSERT INTO public.leads VALUES (270, 52, 'דני כהן', '050-1111111', 'danny@example.com', 'חדש', 'פייסבוק', NULL, NULL, 'מעוניין במערכת טלפוניה', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:11:29.964271', '2025-09-17 15:11:29.964271');
INSERT INTO public.leads VALUES (271, 53, 'מיכל לוי', '052-2222222', 'michal@example.com', 'נשלחה הצעת מחיר', 'גוגל', NULL, NULL, 'מעוניינת באינטרנט עסקי', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:11:29.964271', '2025-09-17 15:11:29.964271');
INSERT INTO public.leads VALUES (272, 54, 'רון ישראלי', '054-3333333', 'ron@example.com', 'חדש', 'המלצות', NULL, NULL, 'מעוניין בשירותי ענן', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:11:29.964271', '2025-09-17 15:11:29.964271');
INSERT INTO public.leads VALUES (238, 52, 'דני כהן', '050-1111111', 'danny@example.com', 'חדש', 'פייסבוק', NULL, NULL, 'מעוניין במערכת טלפוניה', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:28:51.244056', '2025-09-14 23:28:51.244056');
INSERT INTO public.leads VALUES (239, 53, 'מיכל לוי', '052-2222222', 'michal@example.com', 'נשלחה הצעת מחיר', 'גוגל', NULL, NULL, 'מעוניינת באינטרנט עסקי', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:28:51.244056', '2025-09-14 23:28:51.244056');
INSERT INTO public.leads VALUES (240, 54, 'רון ישראלי', '054-3333333', 'ron@example.com', 'חדש', 'המלצות', NULL, NULL, 'מעוניין בשירותי ענן', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:28:51.244056', '2025-09-14 23:28:51.244056');
INSERT INTO public.leads VALUES (252, NULL, 'רא', '0526689225', NULL, 'חדש', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 58, NULL, '2025-09-16 00:02:05.045816', '2025-09-16 00:02:05.045816');
INSERT INTO public.leads VALUES (256, NULL, '‪Nirel Jano‬‏', '3453453453', 'nireljano@gmail.com', 'חדש', NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 69, NULL, '2025-09-16 00:41:24.432694', '2025-09-16 11:53:29.269453');
INSERT INTO public.leads VALUES (260, NULL, 'איציק', '0522344564', 'izik@gmail.com', 'חדש', NULL, NULL, NULL, 'איציק עונה רוצה שיחזרו אליו', '2025-09-19', '16:51:00', NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 13:51:34.911968', '2025-09-17 15:40:54.083508');
INSERT INTO public.leads VALUES (264, 58, 'איציק', '0522344564', '', 'חדש', 'excel_import', NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:05:29.522743', '2025-09-17 15:05:48.173882');
INSERT INTO public.leads VALUES (313, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:11:29.964271', '2025-09-17 15:11:29.964271');
INSERT INTO public.leads VALUES (261, 58, 'איציק', '0522344564', 'izik@gmail.com', 'חדש', 'excel_import', NULL, NULL, 'איציק לא עונה', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 14:44:16.212128', '2025-09-17 14:44:16.212128');
INSERT INTO public.leads VALUES (242, 53, 'מיכל לוי', '052-2222222', 'michal@example.com', 'נשלחה הצעת מחיר', 'גוגל', NULL, NULL, 'מעוניינת באינטרנט עסקי', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:41:07.195784', '2025-09-14 23:41:07.195784');
INSERT INTO public.leads VALUES (243, 54, 'רון ישראלי', '054-3333333', 'ron@example.com', 'חדש', 'המלצות', NULL, NULL, 'מעוניין בשירותי ענן', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:41:07.195784', '2025-09-14 23:41:07.195784');
INSERT INTO public.leads VALUES (265, 58, 'איציק', '0522344564', '', 'new', 'excel_import', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:10:05.927225', '2025-09-17 15:10:05.927225');
INSERT INTO public.leads VALUES (266, 58, 'איציק', '0522344564', '', 'new', 'excel_import', NULL, NULL, 'שכשדכ', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:10:19.4479', '2025-09-17 15:10:19.4479');
INSERT INTO public.leads VALUES (253, NULL, 'df', '0526565656', 'nireljano@gmail.com', 'ניראל ג׳אנו', NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 69, NULL, '2025-09-16 00:23:25.646946', '2025-09-16 00:23:49.153294');
INSERT INTO public.leads VALUES (257, NULL, 'ert', '0526689224', 'no-reply@hazard.com', 'אין מענה', NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 58, NULL, '2025-09-16 00:41:54.294935', '2025-09-16 11:53:22.014243');
INSERT INTO public.leads VALUES (181, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (182, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (183, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (184, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (185, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (186, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (187, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (188, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (189, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (190, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (191, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (192, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (193, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (194, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (195, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (262, NULL, 'ג', '0234234234', NULL, 'חדש', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:00:58.810814', '2025-09-17 15:00:58.810814');
INSERT INTO public.leads VALUES (267, 59, 'ddd', '0313131313', 'hazard.reporter@outlook.com', 'מתאים', 'פייסבוק', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:11:19.706261', '2025-09-17 15:11:19.706261');
INSERT INTO public.leads VALUES (268, 60, 'dfg', '0526262626', '', 'חדש', 'excel_import', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 7, NULL, '2025-09-17 15:11:19.706261', '2025-09-17 15:11:19.706261');
INSERT INTO public.leads VALUES (229, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (231, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (232, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (233, 55, 'df', '0526689224', 'dfdfh@sdg', 'עסקה נסגרה', 'manual', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:10:16.704882', '2025-09-14 23:10:16.704882');
INSERT INTO public.leads VALUES (245, 53, 'מיכל לוי', '052-2222222', 'michal@example.com', 'נשלחה הצעת מחיר', 'גוגל', NULL, NULL, 'מעוניינת באינטרנט עסקי', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', NULL, NULL, '2025-09-14 23:42:26.921646', '2025-09-14 23:42:26.921646');
INSERT INTO public.leads VALUES (254, NULL, 'dfg', '0526262626', '', 'חדש', NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 58, 7, '2025-09-16 00:35:51.528358', '2025-09-16 20:27:35.318489');
INSERT INTO public.leads VALUES (258, NULL, 'גכי', '0526689225', '', 'התקבל', NULL, NULL, NULL, '', NULL, NULL, NULL, NULL, NULL, NULL, NULL, '[]', 58, NULL, '2025-09-16 20:28:50.129274', '2025-09-16 20:33:36.300732');


--
-- Data for Name: payments; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.payments VALUES (3, 32, 250.00, 'ממתין לתשלום', '2025-09-11', 1, 250.00, 'תשלום עבור: טלפונייה');
INSERT INTO public.payments VALUES (5, 34, 1599.00, 'תשלום חלקי', '2025-09-11', 1, 1599.00, 'תשלום עבור: ענן');
INSERT INTO public.payments VALUES (7, 36, NULL, 'ממתין לתשלום', '2025-09-11', 1, 118.00, 'תשלום עבור: שירותי ענן');
INSERT INTO public.payments VALUES (10, 37, 1500.00, 'תשלום חלקי', '2025-09-18', 3, 500.00, 'תשלום עבור: שירותי ענן וטלפונייה');
INSERT INTO public.payments VALUES (11, 38, NULL, 'תשלום חלקי', '2025-10-01', 1, 50000.00, 'תשלום עבור: פיצרייה');
INSERT INTO public.payments VALUES (13, 51, NULL, 'תשלום חלקי', '2025-09-14', 1, 513.30, 'תשלום עבור: ג');
INSERT INTO public.payments VALUES (14, 52, 0.01, 'ממתין לתשלום', '2025-09-15', 1, 0.01, 'תשלום עבור: שירות');
INSERT INTO public.payments VALUES (16, 56, 14.16, 'ממתין לתשלום', '2025-09-16', 1, 14.16, 'תשלום עבור: ענן');
INSERT INTO public.payments VALUES (17, 57, 118.00, 'ממתין לתשלום', '2025-09-17', 1, 118.00, 'תשלום עבור: ענן');


--
-- Data for Name: persistent_notifications; Type: TABLE DATA; Schema: public; Owner: idan
--



--
-- Data for Name: saved_reports; Type: TABLE DATA; Schema: public; Owner: idan
--



--
-- Data for Name: system_settings; Type: TABLE DATA; Schema: public; Owner: idan
--



--
-- Data for Name: tasks; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.tasks VALUES (13, 'כ', 'כ', 'ממתין', 'בינוני', '2025-09-22 04:00:00', 68, 254, NULL, 68, '2025-09-16 13:26:28.463782', '2025-09-17 13:17:15.876119', false, NULL);
INSERT INTO public.tasks VALUES (12, 'כעי', 'כעי', 'ממתין', 'בינוני', '2025-09-18 05:00:00', 58, NULL, NULL, 68, '2025-09-16 13:11:06.762804', '2025-09-17 13:17:20.620448', false, NULL);
INSERT INTO public.tasks VALUES (15, 'כע', 'כע', 'ממתין', 'בינוני', '2025-09-17 19:10:00', 7, NULL, NULL, 7, '2025-09-17 19:10:16.840011', '2025-09-17 19:10:16.840011', false, NULL);
INSERT INTO public.tasks VALUES (14, 'להתקשר לניראל', 'ניראל', 'בביצוע', 'גבוה', '2025-09-17 15:58:00', 7, NULL, NULL, 7, '2025-09-17 12:59:03.811315', '2025-09-17 19:10:46.483911', false, NULL);
INSERT INTO public.tasks VALUES (16, 'אט', 'אט', 'הושלם', 'בינוני', '2025-09-17 19:14:00', 68, NULL, NULL, 68, '2025-09-17 19:14:20.793305', '2025-09-17 19:14:20.793305', false, NULL);


--
-- Data for Name: unified_events; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.unified_events VALUES (25, 'השם שלי זה ניראל', '', 'reminder', '2025-09-14 22:08:00', '2025-09-13 18:11:00', 15, true, true, NULL, '', NULL, NULL, 7, '2025-09-14 20:54:47.39719', '2025-09-14 21:55:22.157709');
INSERT INTO public.unified_events VALUES (26, 'כעי', NULL, 'reminder', '2025-09-17 13:08:00', '2025-09-17 13:08:00', 1440, true, true, NULL, NULL, 254, NULL, 68, '2025-09-16 13:08:47.804207', '2025-09-16 13:08:50.542731');
INSERT INTO public.unified_events VALUES (27, 'הי', NULL, 'reminder', '2025-09-16 20:41:00', '2025-09-16 20:41:00', 15, false, false, NULL, NULL, NULL, NULL, 58, '2025-09-16 20:32:41.096787', '2025-09-16 20:32:54.762772');
INSERT INTO public.unified_events VALUES (28, 'כע', '', 'reminder', '2025-09-16 21:03:00', '2025-09-16 17:40:00', 15, true, true, 55, 'df', NULL, NULL, 7, '2025-09-16 20:41:08.19674', '2025-09-16 20:48:18.233993');


--
-- Data for Name: user_profiles; Type: TABLE DATA; Schema: public; Owner: idan
--



--
-- Data for Name: user_sessions; Type: TABLE DATA; Schema: public; Owner: idan
--

INSERT INTO public.user_sessions VALUES (172, 7, '51b93936-611b-4da0-ad0a-e5c0f092b63b', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 13:35:34.434', '2025-09-17 13:35:34.434637');
INSERT INTO public.user_sessions VALUES (173, 7, '36c1d5d0-854d-4b23-979e-650e8d9dd056', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 13:38:08.866', '2025-09-17 13:38:08.866494');
INSERT INTO public.user_sessions VALUES (189, 7, '23242d2c-7f99-410e-ab53-720af99989b3', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 19:34:42.125', '2025-09-17 19:34:42.125622');
INSERT INTO public.user_sessions VALUES (190, 7, '00ee6e33-2bc4-4fa1-8445-a3453fe49a2a', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 19:41:19.597', '2025-09-17 19:41:19.647614');
INSERT INTO public.user_sessions VALUES (191, 7, 'b9a774ba-3637-4a52-be20-dad2c7c78f58', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 19:42:48.362', '2025-09-17 19:42:48.36775');
INSERT INTO public.user_sessions VALUES (192, 7, 'e94e217b-ecd1-4aa9-b2c3-65a16faba33f', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 19:46:31.332', '2025-09-17 19:46:31.333611');
INSERT INTO public.user_sessions VALUES (193, 7, '6823a35b-1736-4b3a-84aa-1890d79de0b9', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 19:50:43.443', '2025-09-17 19:50:43.457311');
INSERT INTO public.user_sessions VALUES (194, 7, '338ee753-cf3f-42d8-a297-590ef223be2e', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 20:10:07.543', '2025-09-17 20:10:07.543935');
INSERT INTO public.user_sessions VALUES (195, 7, '01e05f88-5ab3-438e-b418-9440af2f5dac', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 20:34:12.632', '2025-09-17 20:34:12.632791');
INSERT INTO public.user_sessions VALUES (196, 7, '44fd10ff-8250-4035-826f-34f800ae703a', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 20:35:04.552', '2025-09-17 20:35:04.553338');
INSERT INTO public.user_sessions VALUES (197, 7, 'ef071199-92ef-4d31-bf86-72568cc84a73', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 20:56:44.574', '2025-09-17 20:56:44.584528');
INSERT INTO public.user_sessions VALUES (199, 7, '22bd5b5d-05bc-45c3-ac26-4afe283208f3', NULL, '127.0.0.1', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/139.0.0.0 Safari/537.36', '2025-09-18 21:08:03.181', '2025-09-17 21:08:03.181858');


--
-- Data for Name: whatsapp_connections; Type: TABLE DATA; Schema: public; Owner: idan
--



--
-- Name: activity_logs_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.activity_logs_id_seq', 1, false);


--
-- Name: attendance_records_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.attendance_records_id_seq', 17, true);


--
-- Name: customer_services_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.customer_services_id_seq', 26, true);


--
-- Name: customers_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.customers_id_seq', 60, true);


--
-- Name: leads_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.leads_id_seq', 523, true);


--
-- Name: payments_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.payments_id_seq', 17, true);


--
-- Name: persistent_notifications_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.persistent_notifications_id_seq', 1, false);


--
-- Name: saved_reports_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.saved_reports_id_seq', 1, false);


--
-- Name: system_clients_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.system_clients_id_seq', 15, true);


--
-- Name: system_settings_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.system_settings_id_seq', 1, false);


--
-- Name: tasks_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.tasks_id_seq', 16, true);


--
-- Name: unified_events_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.unified_events_id_seq', 28, true);


--
-- Name: user_profiles_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.user_profiles_id_seq', 1, false);


--
-- Name: user_sessions_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.user_sessions_id_seq', 199, true);


--
-- Name: users_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.users_id_seq', 79, true);


--
-- Name: whatsapp_connections_id_seq; Type: SEQUENCE SET; Schema: public; Owner: idan
--

SELECT pg_catalog.setval('public.whatsapp_connections_id_seq', 1, false);


--
-- PostgreSQL database dump complete
--

\unrestrict T5Oxok69fktoV94ygub0s2Pf2r7sRwiixtStgDaiKOv5N92ncv0mnIFKMiwcpa6

