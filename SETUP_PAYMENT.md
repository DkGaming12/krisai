# Setup Payment Gateway - Midtrans

KrisAI menggunakan **Midtrans** sebagai payment gateway untuk fitur Top-Up Token. Midtrans mendukung berbagai metode pembayaran populer di Indonesia termasuk QRIS, transfer bank, e-wallet, dan lainnya.

## Metode Pembayaran yang Didukung

- **QRIS** - Quick Response Code Indonesian Standard
- **E-Wallet**: GoPay, ShopeePay, DANA, LinkAja
- **Bank Transfer**: BCA, BNI, BRI, Mandiri, Permata
- **Cicilan** (dengan bank partner)
- **Kartu Kredit** (International & Domestic)

## Langkah Setup

### 1. Daftar di Midtrans Dashboard

1. Buka https://midtrans.com
2. Klik "Daftar" atau "Sign Up"
3. Isi data lengkap bisnis/perusahaan Anda
4. Verifikasi email

### 2. Ambil API Keys

1. Login ke https://dashboard.midtrans.com
2. Navigasi ke **Konfigurasi → Kunci Keamanan**
3. Pilih environment:
   - **Sandbox** (untuk testing/development)
   - **Production** (untuk live)
4. Copy **Server Key** dan **Client Key**

### 3. Update File .env

Edit file `.env` di root project:

```dotenv
# Untuk Testing/Development (Sandbox)
MIDTRANS_SERVER_KEY=SB-Mid-server-xxxxxxxxxxxxx
MIDTRANS_CLIENT_KEY=SB-Mid-client-xxxxxxxxxxxxx

# Untuk Production (Uncomment setelah testing selesai)
# MIDTRANS_SERVER_KEY=Mid-server-xxxxxxxxxxxxx
# MIDTRANS_CLIENT_KEY=Mid-client-xxxxxxxxxxxxx
```

### 4. Konfigurasi Webhook (Production)

1. Login ke Midtrans Dashboard
2. Navigasi ke **Konfigurasi → Konfigurasi URL**
3. Isi **Finish Redirect URL**:
   ```
   https://yourdomain.com/topup.html
   ```
4. Isi **Notification URL** (untuk backend):
   ```
   https://yourdomain.com/api/topup/notification
   ```

### 5. Testing Payment

1. Jalankan server: `npm start`
2. Buka http://localhost:3000/topup.html
3. Login dengan akun user
4. Pilih paket token
5. Klik "Beli" untuk test payment

#### Kartu Kredit Sandbox Test (Midtrans):
- **Nomor**: 4811 1111 1111 1114
- **Expiry**: 12/25
- **CVV**: 123

#### QRIS/E-wallet Test:
Gunakan aplikasi mobile Anda (GoPay, ShopeePay, DANA) scan QRIS yang ditampilkan

## Struktur Token Package

```javascript
const TOKEN_PACKAGES = [
  { id: "pack_100", tokens: 100, price: 10000, label: "Paket Pemula" },
  { id: "pack_500", tokens: 500, price: 45000, label: "Paket Standar", discount: "10%" },
  { id: "pack_1000", tokens: 1000, price: 80000, label: "Paket Pro", discount: "20%" },
  { id: "pack_2500", tokens: 2500, price: 175000, label: "Paket Premium", discount: "30%" },
  { id: "pack_5000", tokens: 5000, price: 300000, label: "Paket Ultimate", discount: "40%" }
];
## Metode Pembayaran Manual
```

Anda bisa edit harga dan tokens di `server.js` pada bagian `TOKEN_PACKAGES`.
### Nomor Rekening Manual Transfer

**ShopeePay (Spay)**: 085171623105
**DANA**: 085171623105  
**SeaBank**: 901029537414
## Alur Payment Flow
### WhatsApp Owner untuk Konfirmasi

**WhatsApp Owner**: 085700660475
```
Untuk pembayaran manual:
1. Transfer ke nomor rekening sesuai paket yang dipilih
2. Buka halaman **Panduan Transfer Manual** di topup page
3. Upload bukti transfer dan isi form konfirmasi
4. Form akan otomatis mengirim ke WhatsApp owner
5. Owner akan verifikasi dan menambah token Anda
1. User pilih paket token
   ↓
2. Frontend kirim request ke /api/topup/create
   ↓
3. Backend create transaction di Midtrans
   ↓
4. Backend return snapToken ke frontend
   ↓
5. Frontend buka Midtrans Snap popup
   ↓
6. User pilih metode pembayaran & selesaikan
   ↓
7. Midtrans kirim webhook ke /api/topup/notification
   ↓
8. Backend verifikasi & add tokens ke user
   ↓
9. Frontend update balance
```

## API Endpoints

### GET /api/topup/packages
Dapatkan daftar paket token yang tersedia.

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/topup/packages
```

Response:
```json
{
  "packages": [
    {
      "id": "pack_100",
      "tokens": 100,
      "price": 10000,
      "label": "Paket Pemula"
    }
  ]
}
```

### POST /api/topup/create
Buat transaksi pembayaran baru.

```bash
curl -X POST \
  -H "Authorization: Bearer <token>" \
  -H "Content-Type: application/json" \
  -d '{"packageId": "pack_100"}' \
  http://localhost:3000/api/topup/create
```

Response:
```json
{
  "orderId": "TOPUP-1671234567890-abc12345",
  "snapToken": "421b691a-daf3-4bbd-85c7-xxxxx",
  "snapUrl": "https://app.sandbox.midtrans.com/snap/v2/vtweb/xxxxx"
}
```

### GET /api/topup/history
Dapatkan riwayat transaksi user.

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/topup/history
```

Response:
```json
{
  "transactions": [
    {
      "orderId": "TOPUP-1671234567890-abc12345",
      "tokens": 100,
      "amount": 10000,
      "status": "success",
      "createdAt": 1671234567890
    }
  ]
}
```

### GET /api/topup/status/:orderId
Cek status transaksi tertentu.

```bash
curl -H "Authorization: Bearer <token>" \
  http://localhost:3000/api/topup/status/TOPUP-1671234567890-abc12345
```

## Troubleshooting

### "Invalid transaction" error
- Pastikan Midtrans server key & client key sudah benar di .env
- Restart server setelah update .env

### QRIS tidak muncul
- Pastikan Midtrans account sudah diaktivasi untuk QRIS
- Cek di Midtrans Dashboard → Metode Pembayaran

### Payment gagal di Production
- Pastikan webhook URL sudah terdaftar di Midtrans
- Webhook harus accessible dari internet (bukan localhost)
- Check Midtrans logs untuk detail error

### Tokens tidak ditambahkan
- Check server logs untuk webhook notification
- Verify transaction status di Midtrans Dashboard
- Pastikan data/transactions.json writable

## Fitur Keamanan

1. **Signature Verification** - Semua request dari Midtrans diverifikasi
2. **User Isolation** - Setiap user hanya bisa akses transaksi miliknya
3. **Token Deduction** - Tokens hanya ditambah setelah pembayaran success
4. **Idempotent** - Webhook notification aman diproses multiple times

## FAQ

**Q: Apakah ada biaya transaksi?**
A: Midtrans mengenakan komisi per transaksi. Check detail di Midtrans Dashboard.

**Q: Berapa lama transfer tiba?**
A: Instant untuk e-wallet dan QRIS, 1-2 jam untuk transfer bank.

**Q: Bisakah saya ubah harga token?**
A: Ya, edit `TOKEN_PACKAGES` di server.js, jangan lupa restart server.

**Q: Apakah payment bisa di-refund?**
A: Bisa via Midtrans Dashboard, tokens akan dikurangi kembali.

## Support

- Midtrans Support: https://help.midtrans.com
- Dokumentasi Midtrans: https://docs.midtrans.com
- Email Support: support@midtrans.com
