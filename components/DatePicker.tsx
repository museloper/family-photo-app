import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { Colors } from '@/constants/theme';

const NOW = new Date();
const CUR_YEAR = NOW.getFullYear();
const CUR_MONTH = NOW.getMonth() + 1;

function daysInMonth(year: number, month: number) {
  return new Date(year, month, 0).getDate();
}

type Props = {
  selectedYear: number | null;
  selectedMonth: number | null;
  selectedDay: number | null;
  onSelect: (year: number, month: number, day: number) => void;
  colors: (typeof Colors)['light'];
};

export default function DatePicker({ selectedYear, selectedMonth, selectedDay, onSelect, colors }: Props) {
  const [pickerYear, setPickerYear] = useState(selectedYear ?? CUR_YEAR);
  const [pickerMonth, setPickerMonth] = useState<number | null>(selectedMonth ?? null);
  const canGoNextYear = pickerYear < CUR_YEAR;
  const todayDate = new Date().getDate();

  if (pickerMonth !== null) {
    const totalDays = daysInMonth(pickerYear, pickerMonth);
    const isFutureYM =
      pickerYear > CUR_YEAR || (pickerYear === CUR_YEAR && pickerMonth > CUR_MONTH);
    return (
      <View style={[styles.container, { backgroundColor: colors.background }]}>
        <View style={[styles.yearRow, { borderBottomColor: colors.border }]}>
          <TouchableOpacity onPress={() => setPickerMonth(null)} style={styles.chevronBtn}>
            <Ionicons name="chevron-back" size={20} color={colors.text} />
          </TouchableOpacity>
          <Text style={[styles.yearLabel, { color: colors.text }]}>
            {pickerYear}년 {pickerMonth}월
          </Text>
          <View style={styles.chevronBtn} />
        </View>
        <View style={styles.dayGrid}>
          {Array.from({ length: totalDays }, (_, i) => i + 1).map((d) => {
            const isFuture =
              isFutureYM ||
              (pickerYear === CUR_YEAR && pickerMonth === CUR_MONTH && d > todayDate);
            const isSelected =
              pickerYear === selectedYear && pickerMonth === selectedMonth && d === selectedDay;
            return (
              <TouchableOpacity
                key={d}
                style={[
                  styles.dayCell,
                  isSelected && { backgroundColor: colors.tint, borderRadius: 8 },
                  isFuture && { opacity: 0.3 },
                ]}
                onPress={() => !isFuture && onSelect(pickerYear, pickerMonth, d)}
                disabled={isFuture}
                activeOpacity={0.7}
              >
                <Text style={[styles.dayText, { color: isSelected ? '#fff' : colors.text }]}>
                  {d}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      </View>
    );
  }

  return (
    <View style={[styles.container, { backgroundColor: colors.background }]}>
      <View style={[styles.yearRow, { borderBottomColor: colors.border }]}>
        <TouchableOpacity
          onPress={() => setPickerYear((y) => y - 1)}
          style={styles.chevronBtn}
        >
          <Ionicons name="chevron-back" size={20} color={colors.text} />
        </TouchableOpacity>
        <Text style={[styles.yearLabel, { color: colors.text }]}>{pickerYear}년</Text>
        <TouchableOpacity
          onPress={() => setPickerYear((y) => y + 1)}
          style={styles.chevronBtn}
          disabled={!canGoNextYear}
        >
          <Ionicons
            name="chevron-forward"
            size={20}
            color={canGoNextYear ? colors.text : colors.border}
          />
        </TouchableOpacity>
      </View>
      <View style={styles.monthGrid}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((m) => {
          const isFuture = pickerYear === CUR_YEAR && m > CUR_MONTH;
          const isSelected = pickerYear === selectedYear && m === selectedMonth;
          return (
            <TouchableOpacity
              key={m}
              style={[
                styles.monthCell,
                isSelected && { backgroundColor: colors.tint, borderRadius: 10 },
                isFuture && { opacity: 0.3 },
              ]}
              onPress={() => !isFuture && setPickerMonth(m)}
              disabled={isFuture}
              activeOpacity={0.7}
            >
              <Text style={[styles.monthText, { color: isSelected ? '#fff' : colors.text }]}>
                {m}월
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { paddingBottom: 8 },
  yearRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
  },
  chevronBtn: { padding: 6, minWidth: 32, alignItems: 'center' },
  yearLabel: { fontSize: 16, fontWeight: '700' },
  monthGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  monthCell: { width: '25%', alignItems: 'center', paddingVertical: 11 },
  monthText: { fontSize: 15, fontWeight: '500' },
  dayGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    paddingHorizontal: 12,
    paddingTop: 8,
    paddingBottom: 4,
  },
  dayCell: { width: '14.28%', alignItems: 'center', paddingVertical: 9 },
  dayText: { fontSize: 14, fontWeight: '500' },
});
