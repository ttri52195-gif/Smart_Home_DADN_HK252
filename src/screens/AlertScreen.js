import React, { useState, useEffect, useCallback } from 'react';
import {
  View, Text, ScrollView, TouchableOpacity,
  StyleSheet, SafeAreaView, StatusBar, ActivityIndicator,
} from 'react-native';
import { getFeedValue, getFeedHistory } from '../services/adafruitIO';
// Ngưỡng cảnh báo
const THRESHOLDS = {
  temperature: { warn: 30, danger: 35, unit: '°C', label: 'Nhiệt độ', icon: '🌡️' },
  humidity:    { warn: 80, danger: 90, unit: '%',  label: 'Độ ẩm',    icon: '💧', lowWarn: 30, lowDanger: 20 },
  themis:      { lowWarn: 20, lowDanger: 10, unit: '%', label: 'Ánh sáng', icon: '☀️' },
};

function getLevel(key, value) {
  const t = THRESHOLDS[key];
  if (!t) return 'ok';
  if (t.danger  !== undefined && value >= t.danger)  return 'danger';
  if (t.warn    !== undefined && value >= t.warn)    return 'warn';
  if (t.lowDanger !== undefined && value <= t.lowDanger) return 'danger';
  if (t.lowWarn   !== undefined && value <= t.lowWarn)   return 'warn';
  return 'ok';
}

const LEVEL_COLOR  = { ok: '#4ade80', warn: '#ffaa44', danger: '#f87171' };
const LEVEL_BG     = { ok: '#0d2a1a', warn: '#2a1a00', danger: '#2a0d0d' };
const LEVEL_BORDER = { ok: '#1a5a2a', warn: '#5a3a00', danger: '#5a1a1a' };
const LEVEL_LABEL  = { ok: 'Bình thường', warn: 'Cảnh báo', danger: 'Nguy hiểm' };

export default function AlertScreen() {
  const [current, setCurrent] = useState({});
  const [alerts,  setAlerts]  = useState([]);   // lịch sử cảnh báo sinh ra từ history
  const [loading, setLoading] = useState(true);
  const [lastUpdated, setLastUpdated] = useState(null);

  const analyze = useCallback(async () => {
    setLoading(true);
    try {
      // Lấy giá trị hiện tại
      const [temp, hum, light] = await Promise.all([
        getFeedValue('temperature'),
        getFeedValue('humidity'),
        getFeedValue('themis'),
      ]);

      const cur = {
        temperature: temp  !== null ? parseFloat(temp)  : null,
        humidity:    hum   !== null ? parseFloat(hum)   : null,
        themis:      light !== null ? parseFloat(light) : null,
      };
      setCurrent(cur);
      setLastUpdated(new Date());

      // Sinh cảnh báo từ lịch sử
      const newAlerts = [];
      for (const key of ['temperature', 'humidity', 'themis']) {
        const hist = await getFeedHistory(key, 20);
        hist.forEach(d => {
          const lv = getLevel(key, d.value);
          if (lv !== 'ok') {
            const t = THRESHOLDS[key];
            newAlerts.push({
              id: `${key}-${d.time.getTime()}`,
              level: lv,
              icon: t.icon,
              label: t.label,
              value: `${d.value.toFixed(1)}${t.unit}`,
              time: d.time,
              msg: lv === 'danger' ? `${t.label} ở mức nguy hiểm!` : `${t.label} vượt ngưỡng cảnh báo`,
            });
          }
        });
      }
      // Sắp xếp mới nhất lên đầu, dedup
      const seen = new Set();
      const unique = newAlerts
        .sort((a,b) => b.time - a.time)
        .filter(a => { if (seen.has(a.id)) return false; seen.add(a.id); return true; });
      setAlerts(unique);
    } catch {
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { analyze(); }, []);

  const fmt = (d) => d?.toLocaleTimeString('vi-VN', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) ?? '';

  return (
    <SafeAreaView style={s.safe}>
      <StatusBar barStyle="light-content" backgroundColor="#0f0f1a" />
      <View style={s.header}>
        <Text style={s.headerTitle}>Cảnh báo</Text>
        <TouchableOpacity style={s.refreshBtn} onPress={analyze} disabled={loading}>
          {loading
            ? <ActivityIndicator size="small" color="#6366f1" />
            : <Text style={s.refreshTxt}>↻ Làm mới</Text>
          }
        </TouchableOpacity>
      </View>

      <ScrollView contentContainerStyle={{ paddingBottom: 32 }}>

        {/* Trạng thái hiện tại */}
        <Text style={s.sectionLabel}>TRẠNG THÁI HIỆN TẠI</Text>
        {lastUpdated && (
          <Text style={s.updatedTxt}>Cập nhật lúc {fmt(lastUpdated)}</Text>
        )}

        {Object.entries(THRESHOLDS).map(([key, t]) => {
          const val = current[key];
          const lv  = val !== null && val !== undefined ? getLevel(key, val) : 'ok';
          return (
            <View key={key} style={[s.statusCard, { backgroundColor: LEVEL_BG[lv], borderColor: LEVEL_BORDER[lv] }]}>
              <View style={s.statusLeft}>
                <Text style={{ fontSize: 22 }}>{t.icon}</Text>
                <View style={{ marginLeft: 12 }}>
                  <Text style={s.statusLabel}>{t.label}</Text>
                  <Text style={[s.statusVal, { color: LEVEL_COLOR[lv] }]}>
                    {val !== null && val !== undefined ? `${val.toFixed(1)}${t.unit}` : '--'}
                  </Text>
                </View>
              </View>
              <View style={[s.badge, { backgroundColor: LEVEL_BORDER[lv] }]}>
                <Text style={[s.badgeTxt, { color: LEVEL_COLOR[lv] }]}>{LEVEL_LABEL[lv]}</Text>
              </View>
            </View>
          );
        })}

        {/* Ngưỡng tham khảo */}
        <Text style={s.sectionLabel}>NGƯỠNG CẢNH BÁO</Text>
        <View style={s.threshCard}>
          {[
            { label: 'Nhiệt độ cảnh báo',  val: '≥ 30°C',  color: '#ffaa44' },
            { label: 'Nhiệt độ nguy hiểm', val: '≥ 35°C',  color: '#f87171' },
            { label: 'Độ ẩm cao',          val: '≥ 80%',   color: '#ffaa44' },
            { label: 'Độ ẩm thấp',         val: '≤ 30%',   color: '#ffaa44' },
            { label: 'Ánh sáng yếu',       val: '≤ 20%',   color: '#ffaa44' },
          ].map(item => (
            <View key={item.label} style={s.threshRow}>
              <Text style={s.threshLabel}>{item.label}</Text>
              <Text style={[s.threshVal, { color: item.color }]}>{item.val}</Text>
            </View>
          ))}
        </View>

        {/* Lịch sử cảnh báo */}
        <Text style={s.sectionLabel}>
          LỊCH SỬ CẢNH BÁO {alerts.length > 0 ? `(${alerts.length})` : ''}
        </Text>

        {loading && <ActivityIndicator color="#6366f1" style={{ marginTop: 20 }} />}

        {!loading && alerts.length === 0 && (
          <View style={s.emptyCard}>
            <Text style={{ fontSize: 32, marginBottom: 8 }}>✅</Text>
            <Text style={s.emptyTxt}>Không có cảnh báo nào</Text>
            <Text style={s.emptySub}>Tất cả thông số trong ngưỡng an toàn</Text>
          </View>
        )}

        {alerts.map(a => (
          <View key={a.id} style={[s.alertCard, { backgroundColor: LEVEL_BG[a.level], borderColor: LEVEL_BORDER[a.level] }]}>
            <View style={s.alertTop}>
              <Text style={{ fontSize: 18 }}>{a.icon}</Text>
              <View style={{ flex: 1, marginLeft: 10 }}>
                <Text style={[s.alertMsg, { color: LEVEL_COLOR[a.level] }]}>{a.msg}</Text>
                <Text style={s.alertSub}>{a.label}: <Text style={{ color: LEVEL_COLOR[a.level] }}>{a.value}</Text></Text>
              </View>
              <View style={[s.badge, { backgroundColor: LEVEL_BORDER[a.level] }]}>
                <Text style={[s.badgeTxt, { color: LEVEL_COLOR[a.level] }]}>
                  {a.level === 'danger' ? '🔴' : '🟡'} {LEVEL_LABEL[a.level]}
                </Text>
              </View>
            </View>
            <Text style={s.alertTime}>
              {a.time.toLocaleString('vi-VN', { day:'2-digit', month:'2-digit', hour:'2-digit', minute:'2-digit' })}
            </Text>
          </View>
        ))}

      </ScrollView>
    </SafeAreaView>
  );
}

const s = StyleSheet.create({
  safe:        { flex: 1, backgroundColor: '#0f0f1a' },
  header:      { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', padding: 16, borderBottomWidth: 1, borderBottomColor: '#222' },
  headerTitle: { color: '#e0e0ff', fontSize: 18, fontWeight: '500' },
  refreshBtn:  { backgroundColor: '#1a1a3e', borderRadius: 8, paddingHorizontal: 12, paddingVertical: 6, borderWidth: 1, borderColor: '#2a2a6a', minWidth: 80, alignItems: 'center' },
  refreshTxt:  { color: '#6366f1', fontSize: 12 },
  sectionLabel:{ color: '#4444aa', fontSize: 10, letterSpacing: 1, paddingHorizontal: 16, marginTop: 16, marginBottom: 8 },
  updatedTxt:  { color: '#333366', fontSize: 10, paddingHorizontal: 16, marginBottom: 4 },
  statusCard:  { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 14, borderWidth: 1, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  statusLeft:  { flexDirection: 'row', alignItems: 'center' },
  statusLabel: { color: '#8888cc', fontSize: 11 },
  statusVal:   { fontSize: 20, fontWeight: '500', marginTop: 2 },
  badge:       { borderRadius: 6, paddingHorizontal: 8, paddingVertical: 4 },
  badgeTxt:    { fontSize: 10, fontWeight: '500' },
  threshCard:  { marginHorizontal: 12, backgroundColor: '#1a1a3e', borderRadius: 12, padding: 14, borderWidth: 1, borderColor: '#2a2a5a' },
  threshRow:   { flexDirection: 'row', justifyContent: 'space-between', paddingVertical: 6, borderBottomWidth: 0.5, borderBottomColor: '#2a2a5a' },
  threshLabel: { color: '#6666aa', fontSize: 12 },
  threshVal:   { fontSize: 12, fontWeight: '500' },
  alertCard:   { marginHorizontal: 12, marginBottom: 8, borderRadius: 12, padding: 12, borderWidth: 1 },
  alertTop:    { flexDirection: 'row', alignItems: 'center' },
  alertMsg:    { fontSize: 12, fontWeight: '500' },
  alertSub:    { color: '#6666aa', fontSize: 11, marginTop: 2 },
  alertTime:   { color: '#333366', fontSize: 10, marginTop: 6 },
  emptyCard:   { alignItems: 'center', paddingVertical: 40 },
  emptyTxt:    { color: '#4ade80', fontSize: 14, fontWeight: '500' },
  emptySub:    { color: '#4444aa', fontSize: 11, marginTop: 4 },
});
