import React, { useMemo, useState } from 'react';
import { FlatList, StyleSheet, Text, View } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';
import Animated, { FadeInUp } from 'react-native-reanimated';

import { fetchAssignments, type AssignmentSort } from '@/api/agentApi';
import { Button } from '@/ui/Button';
import { Card } from '@/ui/Card';
import { Chip } from '@/ui/Chip';
import { Input } from '@/ui/Input';
import { Badge } from '@/ui/Badge';
import { Avatar } from '@/ui/Avatar';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { PressableScale } from '@/ui/PressableScale';
import { SkeletonRow } from '@/ui/Skeleton';
import { useReducedMotion } from '@/ui/useReducedMotion';
import { colors, spacing, type, layout, tabularNums } from '@/ui/theme';
import { ASSIGNMENT_STATUS_META, assignmentStatusMeta, formatDate, formatMoney, initials, isOverdue, priorityColor } from '@/ui/format';
import { getCurrentPosition } from '@/location/tracking';
import { copy } from '@/copy';
import type { Assignment, AssignmentStatus } from '@/types/models';

const STAGGER_CAP = 8;

// Same labels as ASSIGNMENT_STATUS_META (the one place status vocabulary is
// defined) so a filter chip always reads exactly like the row/badge it filters.
const STATUS_FILTERS: { label: string; value?: AssignmentStatus }[] = [
  { label: 'All' },
  { label: ASSIGNMENT_STATUS_META.PENDING.label, value: 'PENDING' },
  { label: ASSIGNMENT_STATUS_META.IN_PROGRESS.label, value: 'IN_PROGRESS' },
  { label: ASSIGNMENT_STATUS_META.PARTIALLY_COLLECTED.label, value: 'PARTIALLY_COLLECTED' },
  { label: ASSIGNMENT_STATUS_META.COLLECTED.label, value: 'COLLECTED' },
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
        <Input placeholder={copy.assignments.searchPlaceholder} value={search} onChangeText={setSearch} />
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
      {query.isLoading ? (
        <View style={styles.listContent}>
          {Array.from({ length: 5 }).map((_, i) => (
            <SkeletonRow key={i} />
          ))}
        </View>
      ) : query.isError ? (
        <View style={styles.stateArea}>
          <EmptyState
            icon="cloud-offline-outline"
            tone="offline"
            title={copy.assignments.listLoadErrorTitle}
            subtitle={copy.assignments.checkConnection}
          />
          <Button title={copy.profile.retry} onPress={() => query.refetch()} variant="secondary" style={styles.stateButton} />
        </View>
      ) : (
        <FlatList
          style={styles.flex}
          data={query.data ?? []}
          keyExtractor={(item) => item.id}
          contentContainerStyle={[styles.listContent, (query.data ?? []).length === 0 && styles.listContentEmpty]}
          refreshing={query.isFetching}
          onRefresh={() => query.refetch()}
          ListEmptyComponent={
            <EmptyState
              icon="checkmark-done-circle-outline"
              tone="success"
              title={copy.assignments.emptyTitle}
              subtitle={copy.assignments.emptySubtitle}
            />
          }
          renderItem={({ item, index }) => (
            <AssignmentRow
              assignment={item}
              index={index}
              onPress={() => router.push(`/(app)/assignment/${item.id}`)}
            />
          )}
        />
      )}
    </Screen>
  );
}

function AssignmentRow({
  assignment,
  index,
  onPress,
}: {
  assignment: Assignment;
  index: number;
  onPress: () => void;
}) {
  const overdue = isOverdue(assignment.invoice?.dueDate);
  const statusMeta = assignmentStatusMeta(assignment.status);
  const name = assignment.customer?.displayName ?? assignment.customer?.firmName ?? 'Customer';
  const markColor = overdue ? colors.overdue : priorityColor(assignment.priority);
  const reduceMotion = useReducedMotion();

  return (
    <Animated.View
      entering={reduceMotion ? undefined : FadeInUp.delay(Math.min(index, STAGGER_CAP) * 40).duration(280)}
    >
      <PressableScale
        onPress={onPress}
        accessibilityRole="button"
        accessibilityLabel={`${name}, ${formatMoney(assignment.invoice?.outstanding)} outstanding, ${statusMeta.label}${overdue ? ', overdue' : ''}`}
      >
        <Card style={styles.row}>
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
                  <Text style={[styles.distance, tabularNums]}>{assignment.distanceKm.toFixed(1)} km</Text>
                </View>
              )}
            </View>
          </View>
          <View style={styles.badgeRow}>
            <Badge label={statusMeta.label} tone={statusMeta.tone} />
            {overdue && <Badge label="Overdue" tone="danger" dot />}
            {assignment.promise?.promisedDate && <Badge label="Promise to pay" tone="warning" dot />}
          </View>
        </Card>
      </PressableScale>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  flex: { flex: 1 },
  filters: { padding: layout.screenGutter, paddingBottom: 0, backgroundColor: colors.bg },
  chipRow: { flexDirection: 'row', flexWrap: 'wrap' },
  listContent: { padding: layout.screenGutter, paddingBottom: layout.scrollEndPad, gap: layout.sectionGap },
  listContentEmpty: { flexGrow: 1, justifyContent: 'center' },
  stateArea: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: spacing.md, padding: layout.screenGutter },
  stateButton: { alignSelf: 'stretch' },
  row: { gap: spacing.md },
  rowTop: { flexDirection: 'row', alignItems: 'center', gap: spacing.md },
  customer: { ...type.title, color: colors.text },
  invoice: { ...type.caption, color: colors.textMuted, marginTop: spacing.xxs },
  amountBlock: { alignItems: 'flex-end' },
  // Same weight/tracking as the stat role, dialed down a step for a denser
  // list row — only the size shrinks, so the numeral still carries the
  // scale's full weight contrast against the row's title/caption text.
  amount: {
    ...type.stat,
    fontSize: 20,
    lineHeight: 24,
    color: colors.primaryDark,
    fontVariant: ['tabular-nums'],
  },
  distanceRow: { flexDirection: 'row', alignItems: 'center', gap: spacing.xxs, marginTop: spacing.xxs },
  distance: { ...type.caption, color: colors.textFaint },
  badgeRow: { flexDirection: 'row', gap: spacing.sm, flexWrap: 'wrap' },
});
