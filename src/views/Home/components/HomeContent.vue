<script setup lang="ts">
import { ref, computed, onMounted, toRaw, h } from 'vue';
import { useDebounceFn } from '@vueuse/core';
import { Input, Button, Spin, Checkbox, CheckboxGroup } from 'ant-design-vue';
import SearchInput from '@/components/SearchInput/Index.vue';
import type { ColumnsType, ColumnType } from 'ant-design-vue/es/table';
import type { FilterDropdownProps, FilterValue } from 'ant-design-vue/es/table/interface';
import type { FlatRow } from '@/types/data';
import type { EnumFilters, EnumOptionMap } from '@/workers/worker';
import { baseColumns, filterColumnsByGroup, type GroupKey } from '@/constants/columns';
import { loadData, fetchDistinct, queryRows } from '@/services/dataClient';
import VirtualTable from '@/components/VirtualTable/Index.vue';

// 筛选项的显示数量限制，每次显示更多也依照该增量展开，保持体验一致
const MAX_FILTER_OPTIONS = 80;

// 表头模块开关（大分组显隐），与列定义中的 groupKey 对应
const groupOptions: { label: string; value: GroupKey }[] = [
    { value: 'ewelink', label: '易微联云' },
    { value: 'matter', label: 'Matter Bridge' },
    { value: 'homeAssistant', label: 'Home Assistant' },
];

const rows = ref<FlatRow[]>([]);
const total = ref(0);
const loading = ref(false);
const error = ref<string | null>(null);
const searchText = ref('');

// 枚举筛选的默认空值；每次重置或 worker 返回 filters 时使用
const createDefaultEnums = (): EnumFilters => ({
    deviceModel: [],
    deviceType: [],
    brand: [],
    category: [],
    ewelinkSupported: [],
    ewelinkCapabilities: [],
    matterSupported: [],
    matterDeviceType: [],
    matterProtocolVersion: [],
    matterSupportedClusters: [],
    homeAssistantSupported: [],
    homeAssistantEntities: [],
});

const enums = ref<EnumFilters>(createDefaultEnums());
const enumOptions = ref<EnumOptionMap>({
    deviceModel: [],
    deviceType: [],
    brand: [],
    category: [],
    ewelinkSupported: [],
    ewelinkCapabilities: [],
    matterSupported: [],
    matterDeviceType: [],
    matterProtocolVersion: [],
    matterSupportedClusters: [],
    homeAssistantSupported: [],
    homeAssistantEntities: [],
});

/** 三个组别的可视值 */
const groupVisibility = ref<GroupKey[]>(['ewelink', 'matter', 'homeAssistant']);

/**  */
const enumFilterSearch = ref<Partial<Record<keyof EnumFilters, string>>>({});
// 各列当前展开的筛选项数量；用于“显示更多”
const enumFilterLimit = ref<Partial<Record<keyof EnumFilters, number>>>({});

const getEnumFilterLimit = (key: keyof EnumFilters) => enumFilterLimit.value[key] ?? MAX_FILTER_OPTIONS;
const setEnumFilterLimit = (key: keyof EnumFilters, value: number) => {
    enumFilterLimit.value = { ...enumFilterLimit.value, [key]: value };
};
const resetEnumFilterLimit = (key: keyof EnumFilters) => setEnumFilterLimit(key, MAX_FILTER_OPTIONS);
const increaseEnumFilterLimit = (key: keyof EnumFilters) => setEnumFilterLimit(key, getEnumFilterLimit(key) + MAX_FILTER_OPTIONS);

/** 根据模块开关过滤列分组，再在末端附加筛选设置 */
const filteredColumns = computed(() => filterColumnsByGroup(baseColumns, groupVisibility.value));
const tableColumns = computed(() => enhanceColumns(filteredColumns.value));
const rowKey = (row: FlatRow) => row.rowId;

// 避免响应式代理传入 worker 造成结构化克隆失败
const cloneForWorker = <T>(value: T): T => structuredClone(toRaw(value));

// 查询走 worker，支持搜索 + 筛选；debounce 在输入时触发
const runQuery = async () => {
    loading.value = true;
    error.value = null;
    try {
        const res = await queryRows({
            q: searchText.value,
            enums: cloneForWorker(enums.value),
        });
        rows.value = res.rows;
        total.value = res.total;
    } catch (e: any) {
        error.value = e?.message ?? String(e);
    } finally {
        loading.value = false;
    }
};
const debouncedQuery = useDebounceFn(runQuery, 200);

onMounted(async () => {
    loading.value = true;
    error.value = null;
    try {
        await loadData();
        enumOptions.value = await fetchDistinct();
        await runQuery();
    } catch (e: any) {
        error.value = e?.message ?? String(e);
    } finally {
        loading.value = false;
    }
});

const enumColumnMap: Record<string, keyof EnumFilters> = {
    deviceModel: 'deviceModel',
    deviceType: 'deviceType',
    deviceBrand: 'brand',
    deviceCategory: 'category',
    ewelinkCapabilities: 'ewelinkCapabilities',
    matterDeviceType: 'matterDeviceType',
    matterProtocolVersion: 'matterProtocolVersion',
    matterSupportedClusters: 'matterSupportedClusters',
    homeAssistantEntities: 'homeAssistantEntities',
};

const booleanColumnMap: Record<string, keyof EnumFilters> = {
    ewelinkSupported: 'ewelinkSupported',
    matterSupported: 'matterSupported',
    homeAssistantSupported: 'homeAssistantSupported',
};

// 返回下拉可见列表 + 是否仍有剩余，方便显示“显示更多”
const getDropdownOptionMeta = (enumKey: keyof EnumFilters, limit?: number) => {
    const raw = enumOptions.value[enumKey] || [];
    const keyword = (enumFilterSearch.value[enumKey] || '').trim().toLowerCase();
    const filtered = keyword ? raw.filter((opt) => opt.value.toLowerCase().includes(keyword)) : raw;
    const effectiveLimit = limit ?? getEnumFilterLimit(enumKey);
    return {
        options: filtered.slice(0, effectiveLimit),
        total: filtered.length,
        hasMore: filtered.length > effectiveLimit,
    };
};

/** antd 列配置需要静态 filters，仅保留前 80 条用于勾选提示 */
const getColumnFilterOptions = (enumKey: keyof EnumFilters) => {
    const raw = enumOptions.value[enumKey] || [];
    return raw.slice(0, MAX_FILTER_OPTIONS);
};

/** 生成下拉选项框的DOM */
const renderFilterDropdown = (enumKey: keyof EnumFilters) => (props: FilterDropdownProps<FlatRow>) => {
    const search = enumFilterSearch.value[enumKey] || '';
    const limit = getEnumFilterLimit(enumKey);
    const { options, hasMore, total } = getDropdownOptionMeta(enumKey, limit);
    const selectedKeys = (props.selectedKeys as string[]) ?? [];
    const isAllChecked = selectedKeys.length === 0;
    const isAllIndeterminate = !isAllChecked && selectedKeys.length > 0;

    const toggleValue = (value: string, checked: boolean) => {
        const next = checked ? [...selectedKeys, value] : selectedKeys.filter((v) => v !== value);
        props.setSelectedKeys?.(next);
    };

    const toggleAll = (checked: boolean) => {
        if (checked) {
            props.setSelectedKeys?.([]);
        }
    };

    const clear = () => {
        enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: '' };
        resetEnumFilterLimit(enumKey);
        props.clearFilters?.();
    };

    return h('div', { class: 'ant-dropdown ant-table-filter-dropdown custom-filter-dropdown' }, [
        h('div', { class: 'ant-table-filter-dropdown-search' }, [
            h(Input, {
                size: 'small',
                allowClear: true,
                placeholder: '搜索选项',
                value: search,
                'onUpdate:value': (val: string) => {
                    enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: val };
                    resetEnumFilterLimit(enumKey);
                },
            }),
        ]),
        h(
            'div',
            {
                class: 'ant-dropdown-menu ant-dropdown-menu-root ant-table-filter-dropdown-menu filter-menu',
            },
            [
                h(
                    'label',
                    {
                        class: 'ant-dropdown-menu-item filter-menu-item filter-menu-item__all',
                    },
                    [
                        h(Checkbox, {
                            checked: isAllChecked,
                            indeterminate: isAllIndeterminate,
                            onChange: (e: any) => toggleAll(e.target.checked),
                        }),
                        h('span', { class: 'filter-menu-text' }, '全部'),
                    ]
                ),
                options.length
                    ? options.map((opt) =>
                        h(
                            'label',
                            {
                                key: opt.value,
                                class: 'ant-dropdown-menu-item filter-menu-item',
                            },
                            [
                                h(Checkbox, {
                                    checked: selectedKeys.includes(opt.value),
                                    onChange: (e: any) => toggleValue(opt.value, e.target.checked),
                                }),
                                h('span', { class: 'filter-menu-text' }, `${formatFilterLabel(enumKey, opt.value)} (${opt.count})`),
                            ]
                        )
                    )
                    : h('div', { class: 'filter-empty' }, '无匹配项'),
            ]
        ),
        hasMore
            ? h(
                'div',
                { class: 'filter-more' },
                h(
                    Button,
                    {
                        type: 'link',
                        size: 'small',
                        onClick: () => increaseEnumFilterLimit(enumKey),
                    },
                    () => `显示更多 (${Math.min(limit, total)}/${total})`
                )
            )
            : null,
        h('div', { class: 'ant-table-filter-dropdown-btns' }, [
            h(
                Button,
                {
                    size: 'small',
                    type: 'link',
                    onClick: clear,
                },
                () => '清除'
            ),
            h(
                Button,
                {
                    type: 'primary',
                    size: 'small',
                    onClick: () => props.confirm?.(),
                },
                () => '确定'
            ),
        ]),
    ]);
};

/** 在列定义上再注入 antd 筛选能力、筛选项以及相关配置 */
const enhanceColumns = (cols: ColumnsType<FlatRow>): ColumnsType<FlatRow> => {
    return cols.map((col) => {
        // 存在叶子筛选项就继续递归（比如易微联的叶子筛选项是云支持+设备能力）
        if ('children' in col && col.children) {
            return { ...col, children: enhanceColumns(col.children) };
        }
        const leaf = col as ColumnType<FlatRow>;
        const key = leaf.key as string | undefined;
        if (!key) {
            throw new Error('每个需要筛选的列都必须提供唯一 key');
        }
        const enumKey = enumColumnMap[key] || booleanColumnMap[key];
        if (!enumKey) return leaf;
        const opts = getColumnFilterOptions(enumKey);
        const filters = opts.map((option) => ({
            text: `${formatFilterLabel(enumKey, option.value)} (${option.count})`,
            value: option.value,
        }));
        const selected = enums.value[enumKey];
        return {
            ...leaf,
            filters,
            filterMultiple: true,
            filteredValue: selected && selected.length ? selected.map((value) => String(value)) : null,
            filterDropdown: renderFilterDropdown(enumKey),
        };
    });
};

const formatFilterLabel = (key: keyof EnumFilters, value: string) => {
    if (key === 'ewelinkSupported' || key === 'matterSupported' || key === 'homeAssistantSupported') {
        return value === 'true' ? '是' : '否';
    }
    return value || '—';
};

// antd change 事件只告诉我们列 key -> 选中的值，需要映射回 worker 的 enums 结构
function applyEnumFiltersFromTable(filters: Record<string, FilterValue | null | undefined>) {
    console.log('applyEnumFiltersFromTable filter -> ', filters);
    const next = createDefaultEnums();
    let changed = false;
    const assignValues = (filterKey: keyof EnumFilters, values: (string | number | boolean)[] | null | undefined) => {
        if (!values || values.length === 0) return;
        if (filterKey === 'ewelinkSupported' || filterKey === 'matterSupported' || filterKey === 'homeAssistantSupported') {
            next[filterKey] = values.map((val) => String(val) === 'true') as any;
        } else {
            next[filterKey] = values.map((val) => String(val));
        }
    };
    Object.entries(filters).forEach(([columnKey, value]) => {
        const enumKey = enumColumnMap[columnKey] || booleanColumnMap[columnKey];
        if (!enumKey) return;
        assignValues(enumKey, value || undefined);
    });
    if (JSON.stringify(next) !== JSON.stringify(enums.value)) {
        enums.value = next;
        changed = true;
    }
    return changed;
}

const handleTableChange = (_pagination: unknown, filters: Record<string, FilterValue | null>) => {
    const changed = applyEnumFiltersFromTable(filters);
    if (changed) runQuery();
};
</script>

<template>
    <section class="page-section">
        <div class="toolbar">
            <div class="toolbar-filter">
                <span class="toolbar-filter_title">可查看：</span>
                <CheckboxGroup v-model:value="groupVisibility" name="checkboxgroup" :options="groupOptions" />
            </div>
            <div class="toolbar-search">
                <SearchInput v-model:value="searchText" placeholder="请输入关键字进行搜索" style="width: 360px" allow-clear @input="debouncedQuery()" />
            </div>
        </div>

        <div class="data-table-shell">
            <div v-if="loading" class="tbl-loading">
                <Spin />
            </div>
            <div v-else class="data-table-body">
                <VirtualTable :columns="tableColumns" :dataSource="rows" :rowKey="rowKey" size="small" bordered @change="handleTableChange" />
            </div>
        </div>
    </section>
</template>

<style scoped lang="scss">
.page-section {
    height: 100%;
    padding: 16px 40px 56px;
    display: flex;
    flex-direction: column;
    transition: background 0.4s ease;
}

.toolbar {
    width: 100%;
    margin-bottom: 20px;
    padding: 14px 18px;
    border-radius: 16px;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;

    .toolbar-filter {
        &_title {
            font-size: 14px;
            font-weight: 500;
        }
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
    border-radius: 16px;
    background: rgba(255, 255, 255, 0.95);
    overflow: hidden;
    box-shadow: 0 15px 45px rgba(15, 23, 42, 0.12);
    animation: fade-up 0.5s ease;
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: column;
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
    background: #fff;
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

.toolbar-stats {
    display: flex;
    align-items: center;
    gap: 14px;
    font-size: 13px;
    color: #6b7280;
    white-space: nowrap;
}

.status-pill {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    padding: 6px 12px;
    border-radius: 999px;
    background: rgba(59, 130, 246, 0.12);
    color: #1d4ed8;
    font-weight: 600;
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.2);
    backdrop-filter: blur(4px);
    transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.status-pill:hover {
    transform: translateY(-1px);
    box-shadow: inset 0 0 0 1px rgba(59, 130, 246, 0.3), 0 6px 12px rgba(59, 130, 246, 0.2);
}

.status-dot {
    width: 8px;
    height: 8px;
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
