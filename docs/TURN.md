# Voice chat — server TURN

Voice chat ChemUno (WebRTC P2P) butuh **TURN server** kalau pemain lintas
jaringan (mis. HP data seluler + laptop WiFi). STUN saja gagal karena
Carrier-Grade NAT operator seluler biasanya "symmetric NAT".

Gejala butuh TURN (dari "Salin diagnosa" di popup mic):

```
"ice": "checking"            ← mentok, tak pernah "connected"
"gather": "complete"
"kandidat": ["host","srflx"] ← tak ada "relay"
```

Setelah TURN aktif, `kandidat` akan berisi `"relay"` dan `ice` jadi
`"connected"`.

## Cara pasang (pilih salah satu)

Isi 3 env var di **Vercel → Project → Settings → Environment Variables**,
lalu **Redeploy**. Tak ada perubahan kode.

```
VITE_TURN_URL          = turn:host:port?transport=udp,turn:host:port?transport=tcp
VITE_TURN_USERNAME     = ...
VITE_TURN_CREDENTIAL   = ...
```

`VITE_TURN_URL` boleh berisi > 1 URL dipisah koma.

---

### A. Metered.ca — termudah, tanpa kelola server ⭐

Gratis 50 GB/bulan (jauh lebih dari cukup untuk 1 kelas).

1. Daftar di <https://dashboard.metered.ca/> (gratis).
2. Buat app → menu **TURN Server** → salin kredensial. Contoh:
   ```
   VITE_TURN_URL        = turn:a.relay.metered.ca:80,turn:a.relay.metered.ca:443,turns:a.relay.metered.ca:443?transport=tcp
   VITE_TURN_USERNAME   = <dari dashboard>
   VITE_TURN_CREDENTIAL = <dari dashboard>
   ```
3. Tempel di env Vercel → Redeploy.

---

### B. coturn di Fly.io — self-host, UDP (kualitas terbaik)

Fly.io mendukung UDP → TURN relay UDP → latensi rendah. Ada allowance gratis.

`Dockerfile`:

```dockerfile
FROM coturn/coturn:4.6
```

`fly.toml`:

```toml
app = "chemuno-turn"          # ganti nama unik
primary_region = "sin"        # Singapura, dekat Indonesia

[build]

[[services]]
  protocol = "udp"
  internal_port = 3478
  [[services.ports]]
    port = 3478

[[services]]
  protocol = "tcp"
  internal_port = 3478
  [[services.ports]]
    port = 3478

[experimental]
  cmd = [
    "-n",
    "--no-cli",
    "--no-tls",
    "--no-dtls",
    "--min-port=49160", "--max-port=49200",
    "--lt-cred-mech",
    "--user=chemuno:GANTI_PASSWORD_KUAT",
    "--realm=chemuno",
    "--external-ip=$(detect-external-ip)"
  ]
```

```bash
fly launch --no-deploy      # ikuti prompt, pakai fly.toml di atas
fly deploy
fly ips list                # catat IP publik (mis. 137.66.x.x)
```

Env Vercel:

```
VITE_TURN_URL        = turn:<IP-FLY>:3478?transport=udp,turn:<IP-FLY>:3478?transport=tcp
VITE_TURN_USERNAME   = chemuno
VITE_TURN_CREDENTIAL = GANTI_PASSWORD_KUAT
```

---

### C. coturn di Railway — self-host, TCP saja

Railway hanya expose TCP publik → TURN jalan lewat TCP (audio bisa sedikit
patah saat jaringan jelek, tapi tetap fungsional).

1. New Project → Deploy from Docker Image → `coturn/coturn:4.6`.
2. **Settings → Networking → Generate Domain / TCP Proxy** → catat `host:port`.
3. **Settings → Deploy → Custom Start Command**:
   ```
   turnserver -n --no-cli --no-tls --no-dtls --lt-cred-mech --user=chemuno:GANTI_PASSWORD --realm=chemuno --listening-port=3478
   ```
   (sesuaikan `--listening-port` dengan port internal yang di-proxy Railway)
4. Env Vercel:
   ```
   VITE_TURN_URL        = turn:<host-railway>:<port>?transport=tcp
   VITE_TURN_USERNAME   = chemuno
   VITE_TURN_CREDENTIAL = GANTI_PASSWORD
   ```

---

## Uji

Setelah redeploy: buka voice, tunggu ~10 dtk, ketuk "Salin diagnosa".
`kandidat` harus memuat `"relay"` dan `ice` jadi `"connected"`.
