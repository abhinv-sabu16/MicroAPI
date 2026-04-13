-- Runs once on first container boot
CREATE DATABASE auth_db WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;
CREATE DATABASE user_db WITH OWNER = postgres ENCODING = 'UTF8' TEMPLATE = template0;

GRANT ALL PRIVILEGES ON DATABASE auth_db TO postgres;
GRANT ALL PRIVILEGES ON DATABASE user_db TO postgres;

\c gateway_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c auth_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

\c user_db;
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
