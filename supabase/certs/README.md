# Supabase TLS certificate

The public CA certificate in this directory is **not a secret**. It was fetched
from Supabase's certificate distribution endpoint over HTTPS:

https://supabase-downloads.s3-ap-southeast-1.amazonaws.com/prod/ssl/prod-ca-2021.crt

- Subject / issuer: Supabase Root 2021 CA (Supabase Inc)
- Expires: 2031-04-26
- SHA-256: `80:70:25:AD:50:D4:ED:21:9D:2C:9C:7D:29:9C:00:4F:82:4E:B0:0C:F7:F6:5A:FE:F6:07:D0:7B:72:E6:CA:FA`

For a different or rotated Supabase certificate, download the current certificate
from your project dashboard: **Database Settings > SSL Configuration**. Set
`SUPABASE_DB_CA_PATH` for the migration helper. Never turn off hostname or CA
verification to make a connection succeed.

Reference: https://supabase.com/docs/guides/platform/ssl-enforcement
