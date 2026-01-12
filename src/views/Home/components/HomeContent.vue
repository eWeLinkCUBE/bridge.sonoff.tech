<script setup lang="ts">
import { onMounted } from 'vue';
import type { FilterValue } from 'ant-design-vue/es/table/interface';
import type { EnumFilters } from '@/types/data';
import VirtualTable from '@/components/VirtualTable/Index.vue';
import { useColumns } from '@/hooks/useColumns';
import HeaderFilter from './HeaderFilter.vue';

const { tableColumns, enums, createDefaultEnums, init, rows, loading, pagination, runQuery, rowKey } = useColumns();

// const debouncedQuery = useDebounceFn(() => runQuery(true), 400);

onMounted(() => {
    init();
});

// antd change 事件只告诉我们列 key -> 选中的值，需要映射回 worker 的 enums 结构
function applyEnumFiltersFromTable(filters: Record<string, FilterValue | null | undefined>) {
    const next = createDefaultEnums();
    let changed = false;
    const assignValues = (filterKey: keyof EnumFilters, values: (string | number | boolean)[] | null | undefined) => {
        if (!values || values.length === 0) return;
        if (filterKey === 'ewelinkSupported' || filterKey === 'matterSupported' || filterKey === 'homeAssistantSupported') {
            next[filterKey] = values.map((val) => String(val) === 'true');
        } else {
            next[filterKey] = values.map((val) => String(val));
        }
    };
    Object.entries(filters).forEach(([columnKey, value]) => {
        const enumKey = columnKey;
        assignValues(enumKey as keyof EnumFilters, value || undefined);
    });
    if (JSON.stringify(next) !== JSON.stringify(enums.value)) {
        enums.value = next;
        changed = true;
    }
    return changed;
}

const handleTableChange = (pager: any, filters: Record<string, FilterValue | null>) => {
    pagination.current = pager?.current ?? pagination.current ?? 1;
    pagination.pageSize = pager?.pageSize ?? pagination.pageSize ?? 20;

    const changed = applyEnumFiltersFromTable(filters);
    if (changed) {
        pagination.current = 1;
    }
    runQuery(false);
};
</script>

<template>
    <section class="page-section">
        <HeaderFilter></HeaderFilter>

        <div class="data-table-shell">
            <div class="data-table-body">
                <VirtualTable
                    :columns="tableColumns"
                    :dataSource="rows"
                    :rowKey="rowKey"
                    size="small"
                    bordered
                    @change="handleTableChange"
                    :pagination="pagination"
                    :loading="loading"
                />
            </div>
        </div>
        <div v-if="!rows.length || loading" class="table-footer-placeholder" style="height: 48px; flex-shrink: 0" />
    </section>
</template>

<style scoped lang="scss">
.page-section {
    height: 100%;
    padding: 24px 40px 24px;
    display: flex;
    flex-direction: column;
    transition: background 0.4s ease;
}

.toolbar {
    .toolbar-filter {
        &_title {
            font-size: 14px;
            font-weight: 500;
        }
    }

    .toolbar-search {
        display: flex;
    }

    :deep(.ant-select),
    :deep(.ant-input) {
        transition: box-shadow 0.3s ease;
    }
    :deep(.ant-select-focused),
    :deep(.ant-input-focused) {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
}

.data-table-shell {
    overflow: hidden;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
    min-height: 300px;
}

.data-table-header {
    overflow: hidden;
    border-bottom: 1px solid #e5e7eb;
    background: linear-gradient(90deg, #f6f8fb, #eef2f7);
}

.header-inner {
    will-change: transform;
    transition: transform 0.2s ease-out;
}

.data-table-header :deep(.ant-table-tbody) {
    // display: none;
}

.data-table-body {
    position: relative;
    overflow: auto;
    flex: 1;
    min-height: 0;
}

.data-table :deep(.ant-table-cell) {
    // white-space: nowrap;
    // transition: background 0.2s ease;
}

.data-table :deep(.ant-table-tbody > tr:hover > td) {
    background: #f5f7fb;
}

.data-table :deep(.ant-table-tbody > tr) {
    animation: row-fade 0.35s ease both;
}

.virtual-phantom {
    width: 100%;
    position: relative;
}

.virtual-inner {
    width: 100%;
}

.column-popover {
    width: 220px;
    max-height: 50vh;
    overflow: auto;
    padding: 8px 4px;
}

.column-popover-title {
    margin-bottom: 12px;
    font-weight: 600;
    color: #334155;
}

.column-toggle-row {
    display: flex;
    align-items: center;
    justify-content: space-between;
    padding: 6px 4px;
    border-radius: 6px;
    transition: background 0.2s ease;
}

.column-toggle-row:hover {
    background: rgba(59, 130, 246, 0.08);
}

.custom-filter-dropdown {
    width: 260px;
    padding: 8px 12px 12px;
}

.custom-filter-dropdown :deep(.ant-table-filter-dropdown-search) {
    margin-bottom: 8px;
}

.filter-menu {
    max-height: 220px;
    overflow: auto;
    border-radius: 6px;
}

.filter-menu-item {
    display: flex;
    align-items: center;
    gap: 8px;
}

.filter-menu-text {
    flex: 1;
    color: #1f2937;
}

.filter-empty {
    text-align: center;
    color: #94a3b8;
    padding: 12px 0;
}

.filter-more {
    text-align: center;
    margin: 6px 0;
}

.status-pill {
    width: 150px;
    margin-left: 16px;
    font-size: 13px;
    color: #6b7280;
    white-space: nowrap;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    color: #1d4ed8;
    box-shadow: 0px 0px 7px 0px rgba(0, 0, 0, 0.1);
    backdrop-filter: blur(4px);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.status-dot {
    width: 4px;
    height: 4px;
    border-radius: 999px;
    background: #2563eb;
    box-shadow: 0 0 10px rgba(37, 99, 235, 0.6);
    animation: pulse 1.4s ease infinite;
}

.status-count {
    letter-spacing: 0.02em;
}

.status-hint {
    color: #475569;
}

.empty-placeholder {
    padding: 24px;
    text-align: center;
    color: #6b7280;
    animation: fade-in 0.3s ease;
}

.tbl-loading {
    position: sticky;
    bottom: 8px;
    width: 100%;
    display: flex;
    justify-content: center;
    padding: 8px 0;
    background: linear-gradient(180deg, rgba(255, 255, 255, 0), #fff);
}

@keyframes fade-up {
    from {
        opacity: 0;
        transform: translateY(20px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes float-in {
    from {
        opacity: 0;
        transform: translateY(-8px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes fade-in {
    from {
        opacity: 0;
    }

    to {
        opacity: 1;
    }
}

@keyframes row-fade {
    from {
        opacity: 0;
        transform: translateY(6px);
    }

    to {
        opacity: 1;
        transform: translateY(0);
    }
}

@keyframes pulse {
    0% {
        transform: scale(1);
        opacity: 1;
    }

    50% {
        transform: scale(1.4);
        opacity: 0.5;
    }

    100% {
        transform: scale(1);
        opacity: 1;
    }
}
</style>
