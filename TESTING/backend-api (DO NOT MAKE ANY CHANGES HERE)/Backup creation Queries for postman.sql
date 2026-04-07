USE test_db;
INSERT INTO users (name, password_hash, role)
VALUES ('Backend Tester', 'hash123', 'tester');
INSERT INTO species_en (scientific_name, common_name, leaf_type, fruit_type)
VALUES ('Mangifera indica', 'Mango', 'Simple', 'Drupe');
INSERT INTO species_tet (scientific_name, common_name, leaf_type, fruit_type)
VALUES ('Mangifera indica', 'Manga', 'Simples', 'Drupe');
INSERT INTO media (species_id, streaming_link, download_link, alt_text)
VALUES (1, 'http://example.com/stream', 'http://example.com/download', 'Mango image');
INSERT INTO analytics (user_id, login_time, duration, location)
VALUES (1, NOW(), 15, 'Melbourne');
INSERT INTO changelog (version, entity_id, entity_type, operation)
VALUES (1, 1, 'species_en', 'INSERT');
Select * from users;
Select * from species_en;
Select * from species_tet;
Select * from media;
Select * from analytics;
Select * from changelog;