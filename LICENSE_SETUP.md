# GuestManagementApp — License System Setup Guide

## Architecture (Local Server)

```
┌──────────────────────────────────────────────────────────────┐
│                    Single Windows Server                       │
│                                                              │
│  ┌─────────────────────┐      ┌──────────────────────────┐  │
│  │  IIS (port 80)      │      │  Node.js (port 5000)     │  │
│  │                     │      │                          │  │
│  │  GuestManagementApp │◄────►│  GMP Backend API         │  │
│  │  React frontend     │      │  (server.js)             │  │
│  │  (dist/ folder)     │      │                          │  │
│  └─────────────────────┘      └──────────┬───────────────┘  │
│                                          │ POST /api/v1/     │
│  ┌─────────────────────┐                 │ license/validate  │
│  │  IIS (same port 80) │                 │                   │
│  │  or separate port   │◄────────────────┘                   │
│  │                     │                                     │
│  │  FSQTAR Licence Mgr │                                     │
│  │  Laravel PHP app    │                                     │
│  │  D:\FSQTAR-PROJECTS │                                     │
│  │  \license           │                                     │
│  └─────────────────────┘                                     │
│                                                              │
│  MySQL (port 3306) ← shared by both apps                    │
└──────────────────────────────────────────────────────────────┘
```

---

## Step 1: Set Up Laravel Licence Manager in IIS

The `D:\FSQTAR-PROJECTS\license` Laravel app must be served by IIS (or PHP's built-in server).

### Option A — IIS with PHP (Recommended for local server)

1. Install PHP 8.x for IIS (use Web Platform Installer or manually)
2. Add a new IIS site or virtual directory:
   - Physical path: `D:\FSQTAR-PROJECTS\license\public`
   - Port: `80` on a different hostname, OR `8080` on localhost
3. Ensure `web.config` exists in `public/` (Laravel provides it)
4. Set `LICENSE_SERVER_URL=http://localhost` (if on port 80) in GMP backend `.env`

### Option B — PHP CLI (Quick test/dev)

```cmd
cd D:\FSQTAR-PROJECTS\license
php artisan serve --port=8080
```
Then set `LICENSE_SERVER_URL=http://localhost:8080` in GMP backend `.env`

### Option C — WAMP Apache (if WAMP is installed)

1. Copy/symlink `D:\FSQTAR-PROJECTS\license` into `C:\wamp64\www\license`
2. Access via `http://localhost/license/public/`
3. Set `LICENSE_SERVER_URL=http://localhost/license/public`

---

## Step 2: Run Laravel Migrations

```cmd
cd D:\FSQTAR-PROJECTS\license
php artisan migrate
```

---

## Step 3: Create GuestManagementApp Product in Licence Manager

```cmd
cd D:\FSQTAR-PROJECTS\license
php artisan tinker
```

Then run:
```php
App\Models\Product::create([
    'product_id'  => 'salon_pro',
    'name'        => 'GuestManagementApp',
    'description' => 'On-premises salon & guest management SaaS',
    'is_active'   => true,
]);
```

---

## Step 4: Create a License Key

**Via API:**
```cmd
curl -X POST http://localhost/api/v1/license/create ^
  -H "Content-Type: application/json" ^
  -d "{\"salon_name\": \"My Salon\", \"domain\": \"localhost\", \"expires_at\": \"2027-12-31\"}"
```
Copy the `license_key` from the response (format: `SALON-XXXXX-XXXXX-XXXXX`).

**Via Tinker:**
```php
App\Models\License::create([
    'license_key'   => App\Models\License::generateKey(),
    'product_id'    => 'salon_pro',
    'salon_name'    => 'My Salon Name',
    'domain'        => 'localhost',
    'status'        => 'active',
    'expires_at'    => '2027-12-31',
    'secret_token'  => Str::random(32),
]);
```

---

## Step 5: Configure GMP Backend

Edit `D:\GuestManagementApp\backend\.env`:

```env
# URL where Laravel licence manager is served
LICENSE_SERVER_URL=http://localhost

# The SALON-XXXXX-XXXXX-XXXXX key from Step 4
LICENSE_KEY=SALON-XXXXX-XXXXX-XXXXX

# Auto-filled after first activation — do not edit
LICENSE_SECRET_TOKEN=
```

---

## Step 6: Restart GMP Backend

Run as Administrator:
```cmd
D:\GuestManagementApp\restart-gmp-backend.bat
```

The backend will:
1. Check self-integrity seal
2. POST to `{LICENSE_SERVER_URL}/api/v1/license/validate`
3. Log `✅ Valid` or `❌ Invalid`
4. Store the `secret_token` in `.env` for future validations

---

## Step 7: Apply File Protection

After first successful start, run as Administrator:
```cmd
D:\GuestManagementApp\protect-license.bat
```
This sets NTFS Deny-Delete on `license.js`, `.lic`, and `.lic_integrity`.

---

## How Validation Works

| Scenario | Result |
|----------|--------|
| License valid | App unlocks, frontend shows main app |
| License invalid/expired | Frontend shows LicenseGate lock screen |
| `license.js` modified | Integrity seal mismatch → all API routes 403 |
| `license.js` deleted | Node.js `require()` error → backend crashes → frontend shows "Checking license..." |
| Licence server offline | 7-day grace period from cached validation |
| Grace period expired | App locks, all routes return 403 |

---

## URL Management

| Environment | LICENSE_SERVER_URL |
|------------|-------------------|
| Same server, port 80 | `http://localhost` |
| Same server, port 8080 | `http://localhost:8080` |
| LAN, different machine | `http://192.168.1.100` |
| Cloud/Production | `https://license.yourdomain.com` |

The URL is read from `.env` at runtime, so no code changes are needed when deploying to production — just update the `.env` value.
