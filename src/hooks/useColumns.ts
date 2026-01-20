import type { ColumnsType, ColumnType } from 'ant-design-vue/es/table';
import type { FlatRow } from '@/types/data';
import correct from '@/assets/img/correct.png';
import wrong from '@/assets/img/wrong.png';
import Cluster from '@/components/business/MatterCluster.vue';
import MatterThirdPartAppCluster from '@/components/business/MatterThirdPartAppCluster.vue';
import EwelinkCapabilities from '@/components/business/EwelinkCapabilities.vue';
import { ref, computed, reactive } from 'vue';
import { Popover } from 'ant-design-vue';
import { type EnumFilters, type EnumOptionMap, type ExportColumn } from '@/types/data';
import { h, toRaw } from 'vue';
import type { FilterDropdownProps } from 'ant-design-vue/es/table/interface';
import FilterDropdown from '@/components/FilterDropdown/Index.vue';
import type { ColumnGroupType } from 'ant-design-vue/es/vc-table/interface';
import { fetchDistinct, loadData, queryRows, buildExcelBuf } from '@/services/dataClient';
import { saveAs } from 'file-saver';
import { buildMergeSpans, isMergeColumn } from '@/utils/mergeCells';
import dayjs from 'dayjs';

export type FilterKey = 'ewelink' | 'matter' | 'homeAssistant' | 'appleSupported' | 'googleSupported' | 'smartThingsSupported' | 'alexaSupported';

export type FilterOption = {
    label: string;
    key: FilterKey;
    visible: boolean;
    children?: FilterOption;
}[];

// 筛选项的显示数量限制，每次显示更多也依照该增量展开，保持体验一致
const MAX_FILTER_OPTIONS = 80;

/** 列是否显示配置 */
const columnsShowHideOptions = ref<FilterOption>([
    {
        label: 'eWeLink',
        key: 'ewelink',
        visible: true,
    },
    {
        label: 'Matter',
        key: 'matter',
        visible: true,
        children: [
            {
                key: 'appleSupported',
                label: 'Apple Home',
                visible: true,
            },
            {
                key: 'googleSupported',
                label: 'Google Home',
                visible: true,
            },
            {
                key: 'alexaSupported',
                label: 'Amazon Alexa',
                visible: true,
            },
            {
                key: 'smartThingsSupported',
                label: 'SmartThings',
                visible: true,
            },
        ],
    },
    {
        label: 'Home Assistant',
        key: 'homeAssistant',
        visible: true,
    },
]);

const SUPPORT_SEARCH_KEYS: Array<keyof FlatRow> = ['deviceModel', 'deviceCategory'];

const updateTime = ref(0);

/**  */
const enumFilterSearch = ref<Partial<Record<keyof EnumFilters, string>>>({});
// 各列当前展开的筛选项数量；用于“显示更多”
const enumFilterLimit = ref<Partial<Record<keyof EnumFilters, number>>>({});
/** 是否展示筛选 */
const filterVisible = ref(true);
/** 初始化 loading */
const initLoading = ref(false);

const getEnumFilterLimit = (key: keyof EnumFilters) => enumFilterLimit.value[key] ?? MAX_FILTER_OPTIONS;
const setEnumFilterLimit = (key: keyof EnumFilters, value: number) => {
    enumFilterLimit.value = { ...enumFilterLimit.value, [key]: value };
};
const resetEnumFilterLimit = (key: keyof EnumFilters) => setEnumFilterLimit(key, MAX_FILTER_OPTIONS);
const increaseEnumFilterLimit = (key: keyof EnumFilters) => setEnumFilterLimit(key, getEnumFilterLimit(key) + MAX_FILTER_OPTIONS);
const resetAllEnumFilterLimit = () => {
    Object.keys(enums.value).forEach((enumKey) => resetEnumFilterLimit(enumKey as keyof EnumFilters));
};
const ensureEnumFilterLimitForSelection = (key: keyof EnumFilters) => {
    const selected = enums.value[key];
    if (!selected || selected.length === 0) {
        resetEnumFilterLimit(key);
        return;
    }
    const raw = enumOptions.value[key] || [];
    const maxIndex = selected.reduce((acc, value) => {
        const idx = raw.findIndex((opt) => opt.value === String(value));
        return idx > acc ? idx : acc;
    }, -1);
    const needed = Math.max(MAX_FILTER_OPTIONS, maxIndex + 1);
    if (needed !== getEnumFilterLimit(key)) setEnumFilterLimit(key, needed);
};

// 枚举筛选的默认空值；每次重置或 worker 返回 filters 时使用
const createDefaultEnums = (): EnumFilters => ({
    deviceModel: [],
    deviceSource: [],
    deviceBrand: [],
    deviceCategory: [],
    ewelinkSupported: [],
    ewelinkCapabilities: [],
    matterSupported: [],
    matterDeviceType: [],
    matterProtocolVersion: [],
    matterSupportedClusters: [],
    appleSupported: [],
    googleSupported: [],
    smartThingsSupported: [],
    alexaSupported: [],
    homeAssistantSupported: [],
    homeAssistantEntities: [],
});

const enums = ref<EnumFilters>(createDefaultEnums());

const enumOptions = ref<EnumOptionMap>({
    deviceModel: [],
    deviceSource: [],
    deviceBrand: [],
    deviceCategory: [],
    ewelinkSupported: [],
    ewelinkCapabilities: [],
    matterSupported: [],
    matterDeviceType: [],
    matterProtocolVersion: [],
    matterSupportedClusters: [],
    appleSupported: [],
    googleSupported: [],
    smartThingsSupported: [],
    alexaSupported: [],
    homeAssistantSupported: [],
    homeAssistantEntities: [],
});

/** 当前表格的数据 */
const rows = ref<FlatRow[]>([]);
/** 当前数据总量 */
const total = ref(0);
/** 表格 loading */
const loading = ref(false);
/** worker 可能出现的错误信息 */
const error = ref<string | null>(null);
/** 搜索框中内容 */
const searchText = ref('');
/** 表格分页配置 */
const pagination = reactive({
    current: 1,
    pageSize: 20,
    showQuickJumper: true,
    showSizeChanger: true,
    total: total.value,
    showTotal: (t: number) => `Total: ${t}`,
});

const rowKey = (row: FlatRow) => row.rowId;

// 避免响应式代理传给 worker 造成结构化克隆失败
const cloneForWorker = <T>(value: T): T => structuredClone(toRaw(value));
const mergeEnabled = ref(true);
const mergedRowSpans = computed(() => (mergeEnabled.value ? buildMergeSpans(rows.value) : new Array(rows.value.length).fill(1)));
const getMergedRowSpan = (index?: number) => {
    if (typeof index !== 'number' || index < 0) return 1;
    return mergedRowSpans.value[index] ?? 1;
};
const getLeafKeys = (cols: ColumnsType<FlatRow>): string[] => {
    const keys: string[] = [];
    cols.forEach((col) => {
        if ('children' in col && col.children) {
            keys.push(...getLeafKeys(col.children as ColumnsType<FlatRow>));
            return;
        }
        const key = (col as ColumnType<FlatRow>).key;
        if (key) keys.push(String(key));
    });
    return keys;
};
const isMergeOnlyColumns = (cols: ColumnsType<FlatRow>) => {
    const keys = getLeafKeys(cols);
    return keys.every((key) => isMergeColumn(key));
};

const refreshEnumOptions = async () => {
    enumOptions.value = await fetchDistinct({ q: searchText.value, enums: cloneForWorker(enums.value) });
};

// 查询走 worker，支持搜索 + 筛选；debounce 在输入时触发
const runQuery = async (resetPage = false) => {
    if (resetPage) {
        pagination.current = 1;
    }
    loading.value = true;
    error.value = null;
    try {
        const res = await queryRows({
            q: searchText.value,
            enums: cloneForWorker(enums.value),
            page: pagination.current ?? 1,
            pageSize: pagination.pageSize ?? 20,
        });
        rows.value = res.rows;
        total.value = res.total;
        pagination.total = res.total;
        await refreshEnumOptions();
    } catch (e: any) {
        error.value = e?.message ?? String(e);
    } finally {
        loading.value = false;
    }
};

const init = async () => {
    initLoading.value = true;
    loading.value = true;
    error.value = null;
    try {
        // 喘口气再拉数据
        await new Promise(requestAnimationFrame);
        const { updateTime: _updateTime } = await loadData(SUPPORT_SEARCH_KEYS);
        updateTime.value = _updateTime;
        await refreshEnumOptions();
        await runQuery(true);
    } catch (e: any) {
        error.value = e?.message ?? String(e);
    } finally {
        initLoading.value = false;
        loading.value = false;
    }
};

/** 图标展示 */
const boolIcon = (value?: boolean) =>
    h('img', {
        style: {
            width: '24px',
        },
        src: value ? correct : wrong,
    });
const listDisplay = (list: string[]) => (list.length ? list.join(',') : 'N/A');
const ewelinkCapabilitiesTransform = (list: string[], supported: boolean) => {
    if (!list.length && !supported) return 'N/A';
    if (!list.length && supported) return 'No Supported Capabilities';
    return h(EwelinkCapabilities, {
        capabilities: list,
    });
};

const thirdAppTips = (thirdApp: string) =>
    `Capabilities supported when the device is exposed to ${thirdApp}. "No corresponding Matter device type" means this device type is not supported in the Matter 1.4 specification. "Bridge not yet adapted to this device" means the Matter Bridge has not integrated this device yet`;

const titleTipMap: Record<string, string> = {
    deviceSource: 'Device sources supported by the Bridge',
    ewelinkSupported: 'Indicates whether the device can be synced to the eWeLink Cloud and displayed/controlled in the eWeLink app',
    ewelinkCapabilities: 'Capabilities after the device is synced to the eWeLink app. "N/A" means the device cannot be synced to the eWeLink Cloud. "No supported capabilities" means the device has no practical controllable features in the eWeLink app.',
    matterSupported: 'Indicates whether the device can be synced to other Matter platforms via the Matter Bridge.',
    matterDeviceType: 'Device type defined for this device in the Matter 1.4 standard. "No corresponding Matter device type" means this device type is not supported in Matter 1.4.',
    matterProtocolVersion: 'Supported Matter Version',
    matterSupportedClusters: 'Clusters (capabilities) defined for this device in the Matter 1.4 standard. ☑ means the gateway already supports this cluster; ✘ means it is not supported yet.',
    appleSupported: thirdAppTips('Apple Home'),
    googleSupported: thirdAppTips('Google Home'),
    smartThingsSupported: thirdAppTips('SmartThings'),
    alexaSupported: thirdAppTips('Amazon Alexa'),
    homeAssistantEntities: 'Entity type when the device is integrated into Home Assistant. "N/A" means the device is not supported yet.',
    homeAssistantSupported: 'Indicates whether the device can be synced to Home Assistant via MQTT.',
};

const mergeRowSpanCell = (_: FlatRow, index?: number) => ({ rowSpan: getMergedRowSpan(index) });
const createColumn = (key: keyof FlatRow | string, title: string, options: Partial<ColumnType<FlatRow>> = {}): ColumnType<FlatRow> & { exportTitle?: string } => {
    const shouldMerge = isMergeColumn(String(key));
    return {
        key,
        dataIndex: key as ColumnType<FlatRow>['dataIndex'],
        title: () => {
            if (!Object.keys(titleTipMap).includes(key)) return title;
            return h(
                Popover,
                { trigger: 'hover', placement: 'bottom' },
                {
                    default: () => h('div', { style: { cursor: 'pointer' } }, title),
                    content: () => h('div', titleTipMap[key]),
                }
            );
        },
        align: 'left',
        exportTitle: title,
        ...(shouldMerge ? { customCell: mergeRowSpanCell } : null),
        ...options,
    };
};

/** 支持接入的设备 */
const deviceInfoColumns: ColumnsType<FlatRow> = [
    createColumn('deviceSource', 'Device Source Types', {
        width: 172,
        fixed: true,
        customRender: ({ record }) => record.deviceSource,
    }),
    {
        title: 'Device information',
        key: 'deviceInformation',
        fixed: true,
        children: [
            createColumn('deviceModel', 'Model', {
                width: 160,
                fixed: true,
                customRender: ({ record }) => record.deviceModel,
            }),
            createColumn('deviceBrand', 'Brand', {
                width: 130,
                fixed: true,
                customRender: ({ record }) => record.deviceBrand || 'N/A',
            }),
            createColumn('deviceCategory', 'Category', {
                width: 130,
                fixed: true,
                customRender: ({ record }) => record.deviceCategory,
            }),
        ],
    },
];

/** 设备接出的平台和能力 */
const platformCapabilityColumns: ColumnGroupType<FlatRow>[] = [
    {
        title: 'eWeLink',
        key: 'ewelink',
        children: [
            createColumn('ewelinkSupported', 'Sync to eWeLink', {
                width: 166,
                customRender: ({ record }) => boolIcon(record.ewelinkSupported),
            }),
            createColumn('ewelinkCapabilities', 'Capabilities of eWeLink', {
                width: 280,
                customRender: ({ record }) => ewelinkCapabilitiesTransform(record.ewelinkCapabilities, record.ewelinkSupported),
            }),
        ],
    },
    {
        title: 'Matter',
        key: 'matter',
        children: [
            createColumn('matterSupported', 'Sync to Matter', {
                width: 166,
                customRender: ({ record }) => boolIcon(record.matterSupported),
            }),
            createColumn('matterDeviceType', 'Matter Device Type', { width: 200, customRender: ({ record }) => record.matterDeviceType || 'No corresponding Matter device type' }),
            createColumn('matterSupportedClusters', 'Cluster', {
                width: 400,
                customRender: ({ record }) => stringifyClusterInfo(record.matterSupportedClusters, record.matterUnsupportedClusters),
            }),
            createColumn('matterProtocolVersion', 'Matter Version', { width: 150, customRender: ({ record }) => record.matterProtocolVersion || 'No corresponding Matter device type' }),
            createColumn('appleSupported', 'Apple Home', {
                width: 300,
                customRender: ({ record }) => withNotes(record, 'appleSupported', 'appleNotes'),
            }),
            createColumn('googleSupported', 'Google Home', {
                width: 300,
                customRender: ({ record }) => withNotes(record, 'googleSupported', 'googleNotes'),
            }),
            createColumn('smartThingsSupported', 'SmartThings', {
                width: 300,
                customRender: ({ record }) => withNotes(record, 'smartThingsSupported', 'smartThingsNotes'),
            }),
            createColumn('alexaSupported', 'Alexa', {
                width: 300,
                customRender: ({ record }) => withNotes(record, 'alexaSupported', 'alexaNotes'),
            }),
        ],
    },
    {
        title: 'Home Assistant',
        key: 'homeAssistant',
        children: [
            createColumn('homeAssistantSupported', 'Sync to HA', {
                width: 166,
                customRender: ({ record }) => boolIcon(record.homeAssistantSupported),
            }),
            createColumn('homeAssistantEntities', 'Entities', {
                width: 220,
                customRender: ({ record }) => listDisplay(record.homeAssistantEntities),
            }),
        ],
    },
];

function withNotes(
    record: FlatRow,
    supportKey: 'appleSupported' | 'googleSupported' | 'smartThingsSupported' | 'alexaSupported',
    notesKey: 'appleNotes' | 'googleNotes' | 'smartThingsNotes' | 'alexaNotes'
) {
    const supported = record[supportKey];
    const notes = record[notesKey];
    const isThirdAppEmpty = !supported.length;
    const { matterDeviceType } = record;

    if (isThirdAppEmpty && matterDeviceType) return 'Bridge not yet adapted to this device';
    if (isThirdAppEmpty && !matterDeviceType) return 'No corresponding Matter device type';
    return h(MatterThirdPartAppCluster, {
        supported: supported,
        notes,
    });
}

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

function stringifyClusterInfo(supported: string[], unsupported: string[]) {
    if (!supported.length && !unsupported.length) return 'Bridge not yet adapted to this device';
    return h(Cluster, {
        supported,
        unsupported,
    });
}

const filterColumns = (cols: ColumnsType<FlatRow>, visibleGroups: FilterOption): ColumnsType<FlatRow> => {
    const optionMap = new Map<FilterKey, FilterOption[number]>();
    const collectOptions = (options: FilterOption) => {
        options.forEach((option) => {
            optionMap.set(option.key, option);
            if (option.children) collectOptions(option.children);
        });
    };
    collectOptions(visibleGroups);

    const isVisible = (key?: string) => {
        if (!key) return true;
        const option = optionMap.get(key as FilterKey);
        return option ? option.visible : true;
    };

    const filter = (columns: ColumnsType<FlatRow>): ColumnsType<FlatRow> => {
        const result: ColumnsType<FlatRow> = [];
        columns.forEach((col) => {
            const key = (col as ColumnType<FlatRow>).key as string | undefined;
            if (!isVisible(key)) return;
            if ('children' in col && col.children) {
                const children = filter(col.children as ColumnsType<FlatRow>);
                if (!children.length) return;
                result.push({ ...col, children });
                return;
            }
            result.push(col);
        });
        return result;
    };

    // 去除固定(当值只显示“支持接入的设备时”，由于每一列都是固定，并且都是左定位，此时会出现问题)
    const enableFixed = (columns: ColumnsType<FlatRow>, newFixed: boolean): ColumnsType<FlatRow> => {
        const result: ColumnsType<FlatRow> = [];
        columns.forEach((col) => {
            const fixed = col.fixed;
            if (fixed === !newFixed) col.fixed = newFixed;
            if ('children' in col && col.children) {
                const children = enableFixed(col.children as ColumnsType<FlatRow>, newFixed);
                result.push({ ...col, children });
                return;
            }
            result.push(col);
        });
        return result;
    };

    let filterColumns = filter(cols);
    if (filterColumns.length === 1 && filterColumns[0]?.key === 'device') {
        filterColumns = enableFixed(filterColumns, false);
    } else {
        filterColumns = enableFixed(filterColumns, true);
    }
    return filterColumns;
};

const formatFilterLabel = (key: keyof EnumFilters, value: string) => {
    if (key === 'ewelinkSupported' || key === 'matterSupported' || key === 'homeAssistantSupported') {
        return h('img', {
            src: value === 'true' ? correct : wrong,
            alt: value === 'true' ? 'supported' : 'unsupported',
            style: {
                width: '16px',
                height: '16px',
                marginTop: '-3px',
            },
        });
    }
    return value || '—';
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

    return h(
        FilterDropdown,
        {
            search,
            options,
            selectedKeys,
            isAllChecked,
            isAllIndeterminate,
            hasMore,
            total,
            limit,
            'onUpdate:search': (val: string) => {
                enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: val };
                resetEnumFilterLimit(enumKey);
            },
            onToggleValue: toggleValue,
            onToggleAll: toggleAll,
            onClear: clear,
            onConfirm: () => props.confirm?.(),
            onLoadMore: () => increaseEnumFilterLimit(enumKey),
        },
        {
            label: ({ value }: { value: string }) => formatFilterLabel(enumKey, value),
        }
    );
};

/** 在列定义上再注入 antd 筛选能力、筛选项以及相关配置 */
const enhanceColumns = (cols: ColumnsType<FlatRow>): ColumnsType<FlatRow> => {
    return cols.map((col) => {
        if (!filterVisible.value) return col;
        // 存在叶子筛选项就继续递归（比如易微联的叶子筛选项是云支持+设备能力）
        if ('children' in col && col.children) {
            return { ...col, children: enhanceColumns(col.children) };
        }
        const leaf = col as ColumnType<FlatRow>;
        const key = leaf.key as string | undefined;
        if (!key) {
            throw new Error('每个需要筛选的列都必须提供唯一 key');
        }
        const enumKey = key as keyof EnumFilters;
        if (!enumKey) return leaf;
        const opts = getColumnFilterOptions(enumKey);
        const filters = opts.map((option) => ({
            text: [formatFilterLabel(enumKey, option.value), ` (${option.count})`],
            value: option.value,
        }));
        const selected = enums.value[enumKey];
        const clearSearchForColumn = () => {
            enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: '' };
        };
        return {
            ...leaf,
            filters,
            filterMultiple: true,
            filteredValue: selected && selected.length ? selected.map((value) => String(value)) : null,
            filterDropdown: renderFilterDropdown(enumKey),
            onFilterDropdownOpenChange: async (visible: boolean) => {
                if (visible) {
                    clearSearchForColumn();
                    ensureEnumFilterLimitForSelection(enumKey);
                }
            },
        };
    });
};

const getExportTitle = (col: ColumnType<FlatRow> | ColumnGroupType<FlatRow>) => {
    const explicit = (col as { exportTitle?: string }).exportTitle;
    if (typeof explicit === 'string') return explicit;
    if (typeof col.title === 'string') return col.title;
    return '';
};

const buildExportColumns = (cols: ColumnsType<FlatRow>): ExportColumn[] => {
    return cols.map((col) => {
        const key = (col as ColumnType<FlatRow>).key;
        if ('children' in col && col.children) {
            return {
                key: key ? String(key) : undefined,
                title: getExportTitle(col as ColumnGroupType<FlatRow>),
                children: buildExportColumns(col.children as ColumnsType<FlatRow>),
            };
        }
        return {
            key: key ? String(key) : undefined,
            title: getExportTitle(col as ColumnType<FlatRow>),
        };
    });
};

const setFilterVisible = (visible: boolean) => {
    filterVisible.value = visible;
    if (!visible) {
        enums.value = createDefaultEnums();
        pagination.pageSize = 20;
        searchText.value = '';
        resetAllEnumFilterLimit();
        runQuery(true);
    }
};

export const useColumns = () => {
    const baseColumns = computed<ColumnsType<FlatRow>>(() => {
        return [
            {
                title: 'Supported Devices',
                key: 'device',
                children: deviceInfoColumns,
            },
            {
                title: 'Target Platforms & Capabilities',
                key: 'platform-capability',
                children: platformCapabilityColumns,
            },
        ];
    });

    const tableColumns = computed(() => {
        const filtered = filterColumns(baseColumns.value, columnsShowHideOptions.value);
        mergeEnabled.value = !isMergeOnlyColumns(filtered);
        return enhanceColumns(filtered);
    });

    const exportToExcel = async () => {
        const exportColumns = buildExportColumns(baseColumns.value);
        const buf = await buildExcelBuf(exportColumns);
        if (!buf) return;
        const blob = new Blob([buf], {
            type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
        });
        saveAs(blob, `Supported Devices & Device Feature Matrix for the Bridge_${dayjs().format('YYYY-MM-DD')}.xlsx`);
    };

    return {
        rows,
        total,
        loading,
        initLoading,
        error,
        searchText,
        pagination,
        tableColumns,
        enums,
        enumOptions,
        columnsShowHideOptions,
        filterVisible,
        updateTime,
        setFilterVisible,
        createDefaultEnums,
        rowKey,
        runQuery,
        init,
        exportToExcel,
    };
};
