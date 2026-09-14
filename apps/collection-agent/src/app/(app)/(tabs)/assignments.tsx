import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { fetchAssignments, type AssignmentSort } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Input } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize, letterSpacing } from '@/ui/theme';
import { assignmentStatusMeta, formatDate, formatMoney, initials, isOverdue, priorityColor } from '@/ui/format';
import { getCurrentPosition } from '@/location/tracking';
import type { Assignment } from '@/types/models';

const STATUS_FILTERS: { label: string; value?: string }[] = [
  { label: 'All' },
  { label: 'Pending', value: 'PENDING' },
  { label: 'In progress', value: 'IN_PROGRESS' },
  { label: 'Partially collected', value: 'PARTIALLY_COLLECTED' },
  { label: 'Collected', value: 'COLLECTED' },
];

const SORTS: { label: string; value: AssignmentSort }[] = [
  { label: 'Due', value: 'due' },
  { label: 'Priority', value: 'priority' },
  { label: 'Amount', value: 'amount' },
  { label: 'Nearby', value: 'nearby' },
];

export default function AssignmentsScreen() {
  const router = useRouter();
  const [status, setStatus] = useState<string | undefined>(undefined);
  const [search, setSearch] = useState('');
  const [sort, setSort] = useState<AssignmentSort>('due');
  const [coords, setCoords] = useState<{ lat: number; lng: number } | undefined>();

  const params = useMemo(
    () => ({ status, search: search || undefined, sort, lat: coords?.lat, lng: coords?.lng }),
    [status, search, sort, coords],
  );

  const query = useQuery({
    queryKey: ['assignments', params],
    queryFn: () => fetchAssignments(params),
  });

  const onSelectSort = async (value: AssignmentSort) => {
    setSort(value);
    if (value === 'nearby' && !coords) {
      const pos = await getCurrentPosition();
      if (pos) setCoords({ lat: pos.latitude, lng: pos.longitude });
    }
  };

  return (
    <Screen scroll={false} padded={false}>
      <View style={styles.filters}>
        <Input placeholder="Search customer, invoice…" value={search} onChangeText={setSearch} />
        <View style={styles.chipRow}>
          {STATUS_FILTERS.map((f) => (
            <Chip key={f.label} label={f.label} selected={status === f.value} onPress={() => setStatus(f.value)} />
          ))}
        </View>
        <View style={styles.chipRow}>
          {SORTS.map((s) => (
            <Chip key={s.value} label={`Sort: ${s.label}`} selected={sort === s.value} onPress={() => onSelectSort(s.value)} />
          ))}
        </View>
      </View>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        refreshing={query.isFetching}
        onRefresh={() => query.refetch()}
        ListEmptyComponent={
          !query.isLoading ? (
            <EmptyState
              icon="checkmark-done-circle-outline"
              tone="success"
              title="No assignments"
              subtitle="Nothing matches these filters."
            />
          ) : null
        }
        renderItem={({ item }) => (
          <AssignmentRow assignment={item} onPress={() => router.push(`/(app)/assignment/${item.id}`)} />
        )}
      />
    </Screen>
  );
}

function AssignmentRow({ assignment, onPress }: { assignment: Assignment; onPress: () => void }) {
  const overdue = isOverdue(assignment.invoice?.dueDate);
  const statusMeta = assignmentStatusMeta(assignment.status);
  const name = assignment.customer?.displayName ?? assignment.customer?.firmName ?? 'Customer';
  const markColor = overdue ? colors.danger : priorityColor(assignment.priority);

  return (
    <Pressable
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={`${name}, ${formatMoney(assignment.invoice?.outstanding)} outstanding, ${statusMeta.label}${overdue ? ', overdue' : ''}`}
    >
      {({ pressed }) => (
        <Card style={[styles.row, pressed && styles.rowPressed]}>
          <View style={styles.rowTop}>
            <Avatar label={initials(name)} color={markColor} />
            <View style={{ flex: 1 }}>
              <Text style={styles.customer} numberOfLines={1}>
                {name}
              </Text>
              <Text style={styles.invoice} numberOfLines={1}>
                {assignment.invoice?.invoiceNo ?? '—'} · Due {formatDate(assignment.invoice?.dueDate)}
              </Text>
            </View>
            <View style={styles.amountBlock}>
              <Text style={styles.amount} numberOfLines={1}>
                {formatMoney(assignment.invoice?.outstanding)}
              </Text>
              {typeof assignment.distanceKm === 'number' && (
                <View style={styles.distanceRow}>
                  <Ionicons name="navigate-outline" size={12} color={colors.textFaint} />
                  <Text style={styles.distance}>{assignment.distanceKm.toFixed(1)} km</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge label={statusMeta.label} tone={statusMeta.tone} />
            {overdue && <Badge label="Overdue" tone="danger" dot />}
            {assignment.promise?.promisedDate && <Badge label="PTP" tone="warning" dot />}
          </View>
        </Card>
      )}
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: 0, backgroundColor: colors.bg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  listContent: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.md },
  rowPressed: { backgroundColor: colors.surfaceSunk },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customer: { fontSize: fontSize.lg, fontWeight: '800', color: colors.text },
  invoice: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  amountBlock: { alignItems: 'flex-end' },
  amount: {
    fontSize: fontSize.lg,
    fontWeight: '900',
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
    letterSpacing: letterSpacing.tightDisplay,
  },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: 3, marginTop: 3 },
  distance: { fontSize: fontSize.xs, color: colors.textFaint, fontWeight: '700' },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
