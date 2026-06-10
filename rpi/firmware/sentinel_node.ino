/*
 * ThinQ Workspace Sentinel — 병동 센서 노드 (Arduino Uno / Nano, AVR)
 * ----------------------------------------------------------------------
 * 라즈베리파이 bridge.py 와 USB 시리얼로 양방향 통신한다.
 *
 *   [아두이노 → 라파이] 1초마다 한 줄:
 *     온도:23.80C 습도:48.00% CO2:650 재실:1
 *       - CO2 : MH-Z19B(NDIR) ppm. 워밍업/오류 시 -1 (bridge가 무시)
 *       - 재실: HLK-LD2410C(24GHz mmWave) OUT. 1=사람 있음 / 0=빈 병실
 *
 *   [라파이 → 아두이노] 백엔드 판정 tier 회신:
 *     TIER:CAUTION\n  → 5단계 LED 게이지(누적) 점등
 *
 * ※ MQ2 가스센서는 제거(CO2 실측이 들어오므로 폴백 불필요 + 전류 절감).
 *
 * 배선표 (Arduino Uno/Nano)
 *   DHT11/22 (온습도)  DATA → D2,  VCC → 5V,  GND → GND
 *   MH-Z19B (CO2)      TX → D10(아두이노 RX),  RX → D11(아두이노 TX),  Vin → 5V,  GND → GND
 *   HLK-LD2410C (재실) OUT → D8,  VCC → 5V,  GND → GND
 *   LED 게이지 5개 (각 애노드 → 220Ω → 핀, 캐소드 → GND):
 *     D3=🟢MONITOR  D4=🟡CAUTION  D5=🔴ALERT  D6=🔴HIGH_RISK  D7=🔴CRITICAL
 *
 * 필요 라이브러리: "DHT sensor library" (Adafruit). MH-Z19B는 UART 명령 직접.
 * 주의: Uno는 하드웨어 시리얼 1개(USB)뿐 → MH-Z19B는 SoftwareSerial 사용.
 */
#include <SoftwareSerial.h>
#include <DHT.h>

// ── 핀 정의 ───────────────────────────────────────────────
#define DHT_PIN    2
#define DHT_TYPE   DHT22      // 흰색 격자 AM2302 = DHT22 (파란 소형이면 DHT11로)
#define MHZ_RX     10         // 아두이노 RX ← MH-Z19B TX
#define MHZ_TX     11         // 아두이노 TX → MH-Z19B RX
#define PRESENCE_PIN 8        // LD2410C OUT

// LED 게이지: index 0=MONITOR .. 4=CRITICAL (누적 점등)
const int LED_PINS[5] = {3, 4, 5, 6, 7};

DHT dht(DHT_PIN, DHT_TYPE);
SoftwareSerial mhz(MHZ_RX, MHZ_TX);

// MH-Z19B 표준 read 명령 (0x86)
const byte MHZ_READ[9] = {0xFF, 0x01, 0x86, 0x00, 0x00, 0x00, 0x00, 0x00, 0x79};

void setup() {
  Serial.begin(9600);        // 라파이 bridge 와 양방향 (BAUD=9600)
  mhz.begin(9600);
  dht.begin();
  pinMode(PRESENCE_PIN, INPUT);
  for (int i = 0; i < 5; i++) { pinMode(LED_PINS[i], OUTPUT); digitalWrite(LED_PINS[i], LOW); }
  digitalWrite(LED_PINS[0], HIGH);   // 초기: MONITOR(초록)만
  delay(2500);                        // 센서 안정화
}

// MH-Z19B CO2 ppm. 실패(워밍업/체크섬오류) 시 -1.
int readCO2() {
  while (mhz.available()) mhz.read();
  mhz.write(MHZ_READ, 9);
  byte resp[9];
  unsigned long t0 = millis();
  int idx = 0;
  while (idx < 9 && millis() - t0 < 400) {   // 센서 미연결 시 400ms만 대기(출력 끊김 방지)
    if (mhz.available()) resp[idx++] = mhz.read();
  }
  if (idx < 9 || resp[0] != 0xFF || resp[1] != 0x86) return -1;
  byte checksum = 0;
  for (int i = 1; i < 8; i++) checksum += resp[i];
  checksum = 0xFF - checksum + 1;
  if (checksum != resp[8]) return -1;
  return resp[2] * 256 + resp[3];
}

// tier 문자열 → rank(0~4). 미상이면 -1.
int tierRank(const String &t) {
  if (t == "MONITOR")   return 0;
  if (t == "CAUTION")   return 1;
  if (t == "ALERT")     return 2;
  if (t == "HIGH_RISK") return 3;
  if (t == "CRITICAL")  return 4;
  return -1;
}

// 게이지 누적 점등: 0~rank 까지 ON.
void setGauge(int rank) {
  for (int i = 0; i < 5; i++) digitalWrite(LED_PINS[i], i <= rank ? HIGH : LOW);
}

// 라파이가 보낸 "TIER:XXX" 수신 시 LED 갱신.
void pollTier() {
  if (!Serial.available()) return;
  String line = Serial.readStringUntil('\n');
  line.trim();
  if (line.startsWith("TIER:")) {
    int r = tierRank(line.substring(5));
    if (r >= 0) setGauge(r);
  }
}

void loop() {
  float temp = dht.readTemperature();
  float hum  = dht.readHumidity();
  if (isnan(temp)) temp = 0.0;
  if (isnan(hum))  hum  = 0.0;

  int co2 = readCO2();
  int presence = digitalRead(PRESENCE_PIN) == HIGH ? 1 : 0;

  // 출력 — bridge.py 정규식과 1:1 정합
  Serial.print("온도:");  Serial.print(temp, 2);  Serial.print("C");
  Serial.print(" 습도:"); Serial.print(hum, 2);   Serial.print("%");
  Serial.print(" CO2:");  Serial.print(co2);
  Serial.print(" 재실:"); Serial.print(presence);
  Serial.println();

  // 라파이 tier 회신 폴링(약 1초 동안 LED 반영)
  unsigned long t0 = millis();
  while (millis() - t0 < 1000) { pollTier(); }
}
