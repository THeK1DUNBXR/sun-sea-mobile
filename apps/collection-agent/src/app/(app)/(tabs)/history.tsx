import React from 'react';
import { FlatList, Pressable, StyleSheet, Text, View } from 'react-native';
import { useQuery } from '@tanstack/react-query';
import { useRouter } from 'expo-router';

import { fetchHistory } from '@/api/agentApi';
import { Card } from '@/ui/Card';
import { Badge } from '@/ui/Badge';
import { EmptyState } from '@/ui/EmptyState';
import { Screen } from '@/ui/Screen';
import { colors, spacing, fontSize } from '@/ui/theme';
import { formatDateTime, formatMoney } from '@/ui/format';
import type { HistoryEntry } from '@/types/models';

const KIND_LABEL: Record<HistoryEntry['kind'], string> = {
  collection: 'Collection',
  visit: 'Visit',
  deposit: 'Deposit',
};

export default function HistoryScreen() {
  const router = useRouter();
  const query = useQuery({ queryKey: ['history'], queryFn: () => fetchHistory() });

  return (
    <Screen scroll={false} padded={false}>
      <FlatList
        data={query.data ?? []}
        keyExtractor={(item) => `${item.kind}-${item.id}`}
        contentContainerStyle={styles.listContent}
        refreshing={query.isFetching}
        onRefresh={() => query.refetch()}
        ListEmptyComponent={!query.isLoading ? <EmptyState title="No activity yet" /> : null}
        renderItem={({ item }) => (
          <Pressable
            disabled={item.kind !== 'collection'}
            onPress={() => item.kind === 'collection' && router.push(`/(app)/receipt/${item.id}`)}
          >
            <Card style={styles.row}>
              <View style={styles.rowTop}>
                <Badge label={KIND_LABEL[item.kind]} />
                <Text style={styles.time}>{formatDateTime(item.occurredAt)}</Text>
              </View>
              <Text style={styles.title}>{item.title}</Text>
              {item.subtitle ? <Text style={styles.subtitle}>{item.subtitle}</Text> : null}
              {item.amount != null && <Text style={styles.amount}>{formatMoney(item.amount)}</Text>}
            </Card>
          </Pressable>
        )}
      />
    </Screen>
  );
}

const styles = StyleSheet.create({
  listContent: { padding: spacing.lg, gap: spacing.md },
  row: { gap: 4 },
  rowTop: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  time: { fontSize: fontSize.sm, color: colors.textMuted },
  title: { fontSize: fontSize.md, fontWeight: '700', color: colors.text },
  subtitle: { fontSize: fontSize.sm, color: colors.textMuted },
  amount: { fontSize: fontSize.md, fontWeight: '800', color: colors.primaryDark, marginTop: 2 },
});
