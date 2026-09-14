import React, { useMemo, useState } from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { fetchAssignments, type AssignmentSort } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Input } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
import { formatMoney, isOverdue } from '@/ui/format';
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
          !query.isLoading ? <EmptyState title="No assignments" subtitle="Nothing matches these filters." /> : null
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
  return (
    <Pressable onPress={onPress}>
      <Card style={styles.row}>
        <View style={styles.rowTop}>
          <View style={{ flex: 1 }}>
            <Text style={styles.customer}>{assignment.customer?.displayName ?? assignment.customer?.firmName ?? 'Customer'}</Text>
            <Text style={styles.invoice}>{assignment.invoice?.invoiceNo ?? '—'}</Text>
          </View>
          <Text style={styles.amount}>{formatMoney(assignment.invoice?.outstanding)}</Text>
        </View>
        <View style={styles.badgeRow}>
          <Badge label={assignment.status} />
          {overdue && <Badge label="Overdue" tone="danger" />}
          {assignment.promise?.promisedDate && <Badge label="PTP" tone="warning" />}
          {typeof assignment.distanceKm === 'number' && <Badge label={`${assignment.distanceKm.toFixed(1)} km`} />}
        </View>
      </Card>
    </Pressable>
  );
}

const styles = StyleSheet.create({
  filters: { padding: spacing.lg, paddingBottom: 0, backgroundColor: colors.bg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  listContent: { padding: spacing.lg, gap: spacing.md },
  row: { gap: spacing.sm },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customer: { fontSize: fontSize.lg, fontWeight: '700', color: colors.text },
  invoice: { fontSize: fontSize.sm, color: colors.textMuted, marginTop: 2 },
  amount: { fontSize: fontSize.lg, fontWeight: '800', color: colors.primaryDark },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
