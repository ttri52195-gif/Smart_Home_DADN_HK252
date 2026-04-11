# 📱 Smart Home App — Hướng Dẫn Cài Đặt

## Kiến trúc hệ thống

```
[ESP32 Arduino]
      |
      | MQTT (TCP 1883)
      v
[Adafruit IO Server]  <--- Backend miễn phí, không cần tự dựng
      |
      | MQTT over WebSocket (wss 443) + REST API
      v
[React Native App]  <--- App mobile bạn vừa có
```

> Không cần dựng backend riêng — Adafruit IO đã là backend sẵn!

---

## Bước 1 — Cài môi trường

### Cài Node.js (nếu chưa có)
Tải tại https://nodejs.org — chọn phiên bản LTS

### Cài Expo CLI
```bash
npm install -g expo-cli
```

### Cài Expo Go trên điện thoại
- Android: https://play.google.com/store/apps/details?id=host.exp.exponent
- iOS: https://apps.apple.com/app/expo-go/id982107779

---

## Bước 2 — Cài dependencies

```bash
cd SmartHomeApp
npm install
```

---

## Bước 3 — Chạy app

```bash
npx expo start
```

Terminal sẽ hiện QR code. Mở **Expo Go** trên điện thoại, quét QR → App tự load.

> Điện thoại và máy tính phải cùng WiFi!

---

## Bước 4 — Kiểm tra kết nối

App kết nối đến `io.adafruit.com` qua:
1. **MQTT WebSocket** (real-time): nhận dữ liệu sensor ngay khi Arduino gửi
2. **REST API**: gửi lệnh điều khiển (LED, cửa, PIR, RGB)

Nếu thấy **chấm xanh** "Đang kết nối MQTT" = hoạt động đúng.

---

## Thay thông tin tài khoản

Mở file `src/services/adafruitIO.js`:
```js
export const AIO_CONFIG = {
  USERNAME: 'tri555',                            // ← tên tài khoản Adafruit
  KEY: 'aio_jrEp46FfMS3HVaJjyZA4ZrxzTFEJ',     // ← AIO Key
};
```

---

## Feeds trên Adafruit IO cần tạo

Vào https://io.adafruit.com → Feeds → tạo các feed sau:

| Feed Key     | Chiều         | Mô tả                        |
|-------------|---------------|------------------------------|
| temperature | Arduino → App | Nhiệt độ DHT20               |
| humidity    | Arduino → App | Độ ẩm DHT20                  |
| themis      | Arduino → App | Ánh sáng (%)                 |
| LB1         | App → Arduino | Độ sáng đèn LED (0-100)      |
| RGB         | App → Arduino | Độ sáng NeoPixel (1-100)     |
| DOOR        | App → Arduino | Điều khiển cửa (OPEN/CLOSE)  |
| PIR         | App → Arduino | Bật/tắt chế độ PIR (ON/OFF)  |

---

## Cấu trúc project

```
SmartHomeApp/
├── App.js                          # Navigation + tab bar
├── src/
│   ├── services/
│   │   └── adafruitIO.js           # Kết nối Adafruit IO (REST + MQTT config)
│   ├── hooks/
│   │   └── useMqtt.js              # Hook nhận real-time data
│   └── screens/
│       └── HomeScreen.js           # Màn hình chính
└── package.json
```

---

## Debug

```bash
# Xem log
npx expo start --clear

# Nếu lỗi mqtt
npm install mqtt@5

# Nếu lỗi slider
npx expo install @react-native-community/slider
```

---

## Lưu ý bảo mật

AIO Key đang để trực tiếp trong code. Nếu publish app lên store, nên:
1. Chuyển key vào file `.env`
2. Dùng thư viện `expo-constants` để đọc

```bash
npm install react-native-dotenv
```

Tạo file `.env`:
```
AIO_USERNAME=tri555
AIO_KEY=aio_jrEp46FfMS3HVaJjyZA4ZrxzTFEJ
```
