# İstatistik Tutarlılık Raporu

**Tarih:** 1 Mart 2025 varsayımı  
**Veri seti:** `initialTasks` (25 görev)

## 1. Temel Sayım Doğrulaması ✓

| Metrik | Beklenen | Durum |
|--------|----------|-------|
| Toplam görev | 25 | ✓ |
| brief | 11 | ✓ |
| in-progress | 5 | ✓ |
| review | 2 | ✓ |
| revision | 1 | ✓ |
| done | 6 | ✓ |
| low | 5 | ✓ |
| medium | 8 | ✓ |
| high | 9 | ✓ |
| urgent | 3 | ✓ |

## 2. Geciken Görev ✓

- **task-7** (Mobil uygulama güncellemesi): due 25 Şubat, status revision → Gecikmiş ✓
- **task-12** (Veritabanı optimizasyonu): due 20 Şubat, status in-progress → Gecikmiş ✓
- Toplam geciken: 2

## 3. Aylık Trend (PersonView completionTrend) ✓

| Ay | Atanan | Tamamlanan |
|----|--------|------------|
| Oca 2025 | 3 | 3 |
| Şub 2025 | 17 | 3 |
| Mar 2025 | 5 | 0 |

## 4. Zamanında Teslim (onTimeRate) ✓

- **task-6**: due 22 Şubat, updatedAt 25 Şubat → Gecikmeli tamamlama (istatistik varyansı için uygun)

## 5. Tespit Edilen Tutarsızlıklar

### Kritik (Düzeltildi ✓)

1. **DashboardView – Sabit "%12" metni**  
   "Geçen haftaya göre +12%" gerçek veriye dayanmıyordu. Artık tamamlanma oranına göre dinamik metin gösteriliyor.

### Uyarılar

2. **Şirket–Atanan uyumsuzluğu**  
   Bazı görevler, şirketin hesap yöneticisi (assignedTeamMemberIds) dışındaki kişilere atanmış:
   - task-3 (ARKAS): Kazım atanmış, hesap yöneticisi Nihat
   - task-4 (Pinea): Selena atanmış, hesap yöneticisi Nihat
   - task-6 (Egelioğlu): Tuğçe atanmış, hesap yöneticisi Selena
   - task-7 (OM Group): Efecan atanmış, hesap yöneticisi Selena
   - task-8 (Nikas): Kazım atanmış, hesap yöneticisi Nihat  

   **Not:** Gerçek iş akışında farklı atamalar olabilir; PersonView "Atanan Şirketler" sadece hesap yöneticisi olunan şirketleri gösterir, bu yüzden görev atamalarıyla tam örtüşmeyebilir.

## 6. Önerilen Düzeltmeler

- [x] DashboardView sabit "+12%" metnini kaldır veya dinamik hesapla
- [ ] İsteğe bağlı: Görev atamalarını hesap yöneticileriyle hizala (daha tutarlı test verisi)
