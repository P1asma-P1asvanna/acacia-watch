# Acacia Watch: คู่มือขึ้นเว็บจริง

ใช้ Python 3.8 ขึ้นไป โครงสร้างโปรเจกต์ดูที่หัวข้อ "โครงสร้างไฟล์" ด้านล่าง
- รันในเครื่อง: ไม่ต้องติดตั้งอะไรเพิ่ม เก็บข้อมูลเป็นไฟล์ SQLite
- ขึ้นเว็บจริง: ตั้งตัวแปร `DATABASE_URL` เพื่อใช้ PostgreSQL (เช่น Neon) ต้องติดตั้ง `psycopg` ผ่าน `requirements.txt` (Render ติดตั้งให้เองตอน build)

---

## ทางที่แนะนำ: GitHub + Render + Neon (ฟรีทั้งหมด)

### ขั้นที่ 1: เก็บโค้ดไว้บน GitHub
1. สมัคร/เข้าสู่ระบบ github.com แล้วสร้าง repository ใหม่ ตั้งเป็น **Private**
2. กด **Add file → Upload files** แล้วลากโฟลเดอร์และไฟล์ทั้งหมดขึ้นไป (`backend/`, `frontend/`, `tools/`, `render.yaml`, `Dockerfile`, `.gitignore`, `README.md`) — หรือใช้ `git push` จาก VS Code ก็ได้ แล้วกด Commit
3. **ห้ามเอารหัสผ่านฐานข้อมูลใส่ไฟล์ใดบน GitHub** (ในขั้นถัดไปจะใส่ที่ Render เท่านั้น)

### ขั้นที่ 2: สร้างฐานข้อมูลบน Neon
1. สมัคร neon.com สร้างโปรเจกต์ใหม่ (เลือกภูมิภาคใกล้ผู้เล่น เช่น สิงคโปร์)
2. ในหน้า Dashboard กดปุ่ม **Connect** แล้วคัดลอก **Connection string** ที่ขึ้นต้นด้วย `postgresql://` (ใส่รหัสผ่านมาให้แล้ว)
3. เก็บไว้ชั่วคราว เดี๋ยวใช้ในขั้นที่ 3 ไม่ต้องสร้างตารางเอง เซิร์ฟเวอร์สร้างให้ตอนเริ่มทำงานครั้งแรก

### ขั้นที่ 3: ขึ้นเซิร์ฟเวอร์บน Render
1. สมัคร render.com แล้วผูกกับบัญชี GitHub
2. กด **New → Blueprint** เลือก repository ที่สร้างไว้ Render จะอ่าน `render.yaml` ให้
   (หรือกด **New → Web Service** เลือก repo, Runtime = Python, Build Command = `pip install -r backend/requirements.txt`, Start Command = `python backend/server.py`, Plan = Free, Health Check Path = `/healthz`)
3. ตอนที่ถามค่า `DATABASE_URL` ให้วาง Connection string จาก Neon
4. ตัวแปรเหล่านี้ต้องมี: `DD_COOKIE_SECURE=1` และ `DD_TRUST_PROXY=1` (ใน `render.yaml` ใส่ไว้แล้ว ถ้าสร้างแบบ Web Service ให้เพิ่มเอง)
5. รอ Deploy เสร็จ แล้วเปิดที่อยู่ `https://ชื่อ.onrender.com`
6. **สมัครบัญชีแรกทันที** บัญชีแรกจะเป็นผู้ดูแล (ถ้าปล่อยไว้ คนอื่นอาจสมัครตัดหน้าได้) จากนั้นส่งลิงก์ให้ผู้เล่นสมัครบัญชีเอง

อัปเดตเว็บภายหลัง: แก้ไฟล์บน GitHub แล้ว Commit Render จะ deploy ใหม่เอง

### ข้อจำกัดของแผนฟรี
- Render หลับหลังไม่มีคนใช้ 15 นาที ตื่นช้าราว 1 นาที วิธีแก้เบาๆ: ให้ GM เปิดเว็บทิ้งไว้ก่อนเริ่มเล่น 1-2 นาที
- Neon หลับหลังไม่มีการใช้ 5 นาที คนแรกที่ใช้อาจรอเพิ่มเล็กน้อย
- ถ้าอยากให้ตื่นตลอด: ใช้บริการตรวจเว็บฟรี (เช่น UptimeRobot หรือ cron-job.org) ตั้งให้เปิด `https://ชื่อ.onrender.com/healthz` ทุก 5-10 นาที (ชั่วโมงฟรีของ Render 750 ชม./เดือน พอสำหรับเว็บเดียวที่เปิดตลอด) ปล่อยให้ Neon หลับต่อไป เพราะ `/healthz` ไม่แตะฐานข้อมูล

---

## ตัวแปรที่ตั้งได้
| ตัวแปร | ความหมาย | ค่าเริ่มต้น |
|---|---|---|
| `DATABASE_URL` | ใช้ PostgreSQL ตามที่อยู่นี้ | ไม่ตั้ง = ใช้ SQLite |
| `DD_DB` | ที่เก็บไฟล์ SQLite (เมื่อไม่ตั้ง DATABASE_URL) | `backend/acacia_watch.sqlite3` |
| `PORT` | พอร์ต | 8080 (Render ตั้งให้เอง) |
| `HOST` | ที่อยู่ที่ฟัง | 0.0.0.0 |
| `DD_COOKIE_SECURE=1` | ใช้เมื่อเปิดผ่าน https (บนเว็บจริงควรเปิดเสมอ) | ปิด |
| `DD_TRUST_PROXY=1` | ใช้เมื่ออยู่หลัง reverse proxy ของคุณเอง | ปิด |

## รันทดลองในเครื่อง
```
python3 backend/server.py
```
เปิด http://localhost:8080

## ทางเลือกอื่น
- **VPS:** อัปโหลดไฟล์ รัน `python3 backend/server.py` ด้วย systemd ใส่ Caddy/nginx ด้านหน้าเพื่อทำ https ใช้ SQLite ได้ (ตั้ง `DD_DB` ไปที่โฟลเดอร์ที่สำรองข้อมูลไว้)
- **Docker:** `docker build -t acacia-watch .` แล้ว `docker run -d -p 8080:8080 -v dd-data:/data acacia-watch` (หรือส่ง `-e DATABASE_URL=...` เพื่อใช้ Postgres)
- **Render แบบเสียเงินพร้อมดิสก์ถาวร:** ผูกดิสก์ไปที่ `/data` ใช้ SQLite เดิมได้เลย ไม่ต้องใช้ Neon

## รหัสผ่านผู้ดูแลหาย
รันบนเครื่องที่ตั้งค่าเดียวกับเซิร์ฟเวอร์ (บน Render ใช้แท็บ Shell ของบริการ ซึ่งอาจเป็นฟีเจอร์ของแผนเสียเงิน ถ้าไม่มี ให้รันในเครื่องตัวเองโดยตั้ง `DATABASE_URL` เป็นของ Neon)
```
python3 backend/server.py list-users
python3 backend/server.py reset-password ชื่อผู้ใช้
python3 backend/server.py make-admin ชื่อผู้ใช้
```
ผู้ดูแลตั้งรหัสใหม่ให้ผู้เล่นได้จากหน้าข้อมูลผู้เล่น (ช่อง "รหัสผ่านใหม่")

## ย้ายข้อมูลจากเว็บเวอร์ชันเก็บในเบราว์เซอร์
1. เวอร์ชันเดิม: ตั้งค่าเว็บ → สำรองข้อมูล → ดาวน์โหลดไฟล์ .json
2. เว็บใหม่: สมัครบัญชีแรก (ผู้ดูแล) → ตั้งค่าเว็บ → นำเข้า → เลือกไฟล์
บัญชีเดิมของผู้เล่นใช้รหัสผ่านเดิมได้ (ระบบแปลงเป็นรูปแบบที่ปลอดภัยกว่าตอนล็อกอินครั้งแรก)

## สำรองข้อมูล
- ในเว็บ: ตั้งค่าเว็บ → สำรองข้อมูล (ไม่รวมรหัสผ่าน) ควรทำเป็นประจำ
- Neon: มีระบบกู้คืนย้อนหลังตามแผนของบริการ ดูในเมนู Backup/Restore ของโปรเจกต์
- SQLite: ก็อปปี้ไฟล์ฐานข้อมูลเก็บไว้

## สิ่งที่เซิร์ฟเวอร์บังคับให้ (กันโกง)
- รหัสผ่านแฮช PBKDF2 ที่เซิร์ฟเวอร์ คุกกี้ HttpOnly ล็อกอินผิดซ้ำถูกชะลอ
- ผู้เล่นเห็น/แก้ได้เฉพาะตัวละครของตัวเอง ตัวละคร GM และห้อง Adventure เป็นของผู้ดูแล
- HP สูงสุดและ AC ถูกคำนวณซ้ำที่เซิร์ฟเวอร์ทุกครั้งที่บันทึก ผู้เล่นตั้งโหมดพิมพ์เองไม่ได้
- ผู้เล่นยังปรับเลเวล ค่าพลัง และเพิ่มไอเท็ม/เกราะเองได้ ผู้ดูแลควรตรวจดู

## ข้อจำกัดตอนนี้
- แคตตาล็อก/ตั้งค่า/ห้อง ใช้หลักการ "บันทึกล่าสุดชนะ" ถ้าผู้ดูแลสองคนแก้พร้อมกัน
- ผู้เล่นเห็นข้อมูลที่ผู้ดูแลแก้เมื่อสลับหน้าหรือกลับมาเปิดหน้าเว็บ ยังไม่อัปเดตสดอัตโนมัติ

## โครงสร้างไฟล์

```
frontend/                  หน้าเว็บ (ไม่มี build step แก้แล้วรีเฟรชได้เลย)
  index.html               ลิสต์ไฟล์ CSS/JS ที่โหลด (ลำดับสำคัญ)
  css/01-base.css … 14-settings.css     สไตล์แยกตามส่วน (ไฟล์หลังทับไฟล์ก่อน)
  js/01-seed-data.js       ข้อมูลตั้งต้น (เผ่า คลาส อาวุธ ฯลฯ)
  js/02-text.js            ข้อความ TH/EN
  js/03-storage.js         เก็บข้อมูลในเบราว์เซอร์ (โหมดไม่มีเซิร์ฟเวอร์)
  js/04-server-mode.js     คุยกับเซิร์ฟเวอร์ (api, sync, pull)
  js/05-icons.js · 06-login.js · 07-records.js · 08-views.js
  js/09-weapons-items.js · 10-armor-class.js · 11-features.js
  js/12-game-data.js       แก้ข้อมูลเกม (admin)
  js/13-adventure.js · 14-initiative.js · 15-minigames.js
  js/16-site-settings.js · 17-backup.js
  js/18-shell.js · 19-events-boot.js    โครงหน้า, event ทั้งหมด, เริ่มระบบ
backend/
  server.py                จุดเริ่มรัน (python backend/server.py)
  requirements.txt         psycopg (ใช้เมื่อต่อ PostgreSQL/Neon)
  acacia/
    config.py              ตั้งค่า/ค่าคงที่/ตัวแปรสภาพแวดล้อม
    database.py            SQLite + PostgreSQL, ตารางข้อมูล
    security.py            เข้ารหัสรหัสผ่าน
    numbers.py             ฟังก์ชันตัวเลขให้ตรงกับฝั่งหน้าเว็บ
    rules.py               กติกา HP / AC ที่เซิร์ฟเวอร์คำนวณเอง
    validation.py          ตรวจและทำความสะอาดข้อมูลตัวละคร (กันโกง)
    store.py               ข้อมูลที่ส่งให้หน้าเว็บตอนเริ่ม + kv
    routes.py              API ทั้งหมด (/api/...)
    handler.py             HTTP, session, ส่งไฟล์ frontend (gzip + ETag)
    cli.py                 คำสั่ง list-users / make-admin / reset-password
tools/build_single.py      รวมหน้าเว็บเป็นไฟล์ HTML ไฟล์เดียว (สำหรับ demo/ออฟไลน์)
```

เพิ่มไฟล์ JS ใหม่: สร้างใน `frontend/js/` แล้วเพิ่มบรรทัด `<script src="js/...">` ใน `frontend/index.html` (ทุกไฟล์ใช้ตัวแปรร่วมกัน เรียงตามลำดับที่เขียนไว้)
สร้างไฟล์เดียว: `python3 tools/build_single.py` → `dist/acacia-watch.html`
