import type { ColumnsType, ColumnType } from 'ant-design-vue/es/table';
import { Input, Button, Checkbox } from 'ant-design-vue';
import type { FlatRow } from '@/types/data';
import correct from '@/assets/img/correct.png';
import wrong from '@/assets/img/wrong.png';
import searchIcon from '@/assets/img/search.png';
import Cluster from '@/components/business/MatterCluster.vue';
import MatterThirdPartAppCluster from '@/components/business/MatterThirdPartAppCluster.vue';
import EwelinkCapabilities from '@/components/business/EwelinkCapabilities.vue';
import { ref, computed } from 'vue';
import { Popover } from 'ant-design-vue';
import { type EnumFilters, type EnumOptionMap } from '@/workers/worker';
import { h } from 'vue';
import type { FilterDropdownProps } from 'ant-design-vue/es/table/interface';

export type GroupKey = 'ewelink' | 'matter' | 'homeAssistant';

type ColumnWithGroup = ColumnType<FlatRow> & { groupKey?: GroupKey };

// 筛选项的显示数量限制，每次显示更多也依照该增量展开，保持体验一致
const MAX_FILTER_OPTIONS = 80;

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

/** 图标展示 */
const boolIcon = (value?: boolean) =>
    h('img', {
        style: {
            width: '24px',
        },
        src: value ? correct : wrong,
    });
const listDisplay = (list: string[]) => (list.length ? list.join(',') : '无');
const ewelinkCapabilitiesTransform = (list: string[]) => {
    if (!list.length) return '无';
    return h(EwelinkCapabilities, {
        capabilities: list,
    });
};

const titleTipMap: Record<string, string> = {
    ewelinkSupported: '支持在易微联 APP 添加该设备',
    ewelinkCapabilities: '对应设备在易微联 APP 支持的能力',
    matterSupported: '支持通过 Matter Bridge 同步到第三方生态圈',
    matterDeviceType: '对应设备在 Matter 标准协议中的设备类别',
    matterSupportedClusters: 'Matter 标准协议中设备的能力',
    googleSupported: '设备同步至 Google Home 支持的功能',
    smartThingsSupported: '设备同步至 SmartThings 支持的功能',
    alexaSupported: '设备同步至 Alexa 支持的功能',
    homeAssistantSupported: '支持同步到 Home Assistant',
    homeAssistantEntities: '设备同步至 Home Assistant 时对应的实体',
};

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

type SpanStrategy = 'deviceInfo' | false;

const createColumn = (key: keyof FlatRow | string, title: string, options: Partial<ColumnType<FlatRow>> = {}, span: SpanStrategy = false): ColumnType<FlatRow> => ({
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
    width: 160,
    align: 'left',
    customCell:
        span === false
            ? undefined
            : (record: FlatRow) => ({
                rowSpan: record.deviceInfoRowSpan ?? 1,
            }),
    ...options,
});

const deviceInfoColumns: ColumnsType<FlatRow> = [
    createColumn('deviceModel', 'Model', { width: 160, fixed: true, customRender: ({ record }) => record.deviceModel || '--' }, 'deviceInfo'),
    createColumn('deviceType', 'Type', { width: 130, customRender: ({ record }) => record.deviceType || '--' }, 'deviceInfo'),
    createColumn('deviceBrand', 'Brand', { width: 130, customRender: ({ record }) => record.deviceBrand || '--' }, 'deviceInfo'),
    createColumn('deviceCategory', 'Category', { width: 130, customRender: ({ record }) => record.deviceCategory || '--' }, 'deviceInfo'),
];

const ewelinkColumns: ColumnsType<FlatRow> = [
    createColumn('ewelinkSupported', 'Sync to eWeLink', {
        width: 166,
        customRender: ({ record }) => boolIcon(record.ewelinkSupported),
    }, 'deviceInfo'),
    createColumn(
        'ewelinkCapabilities',
        'Capabilities of eWeLink',
        {
            width: 280,
            customRender: ({ record }) => ewelinkCapabilitiesTransform(record.ewelinkCapabilities),
        },
        'deviceInfo'
    ),
];

const matterColumns: ColumnsType<FlatRow> = [
    createColumn('matterSupported', 'Sync to Matter', {
        width: 166,
        customRender: ({ record }) => boolIcon(record.matterSupported),
    }),
    createColumn('matterDeviceType', 'Matter Device Type', { width: 195 }, false),
    createColumn(
        'Matter Cluster',
        'Cluster',
        {
            width: 349,
            customRender: ({ record }) => stringifyClusterInfo(record.matterSupportedClusters, record.matterUnsupportedClusters),
        },
        false
    ),
    createColumn('matterProtocolVersion', 'Matter Version', { width: 150 }, false),
    createColumn(
        'appleSupported',
        'Apple Home',
        {
            width: 260,
            customRender: ({ record }) => withNotes(record.appleSupported, record.appleNotes),
        },
        false
    ),
    createColumn(
        'googleSupported',
        'Google Home',
        {
            width: 260,
            customRender: ({ record }) => withNotes(record.googleSupported, record.googleNotes),
        },
        false
    ),
    createColumn(
        'smartThingsSupported',
        'SmartThings',
        {
            width: 260,
            customRender: ({ record }) => withNotes(record.smartThingsSupported, record.smartThingsNotes),
        },
        false
    ),
    createColumn(
        'alexaSupported',
        'Alexa',
        {
            width: 260,
            customRender: ({ record }) => withNotes(record.alexaSupported, record.alexaNotes),
        },
        false
    ),
];

const homeAssistantColumns: ColumnsType<FlatRow> = [
    createColumn('homeAssistantSupported', 'Sync to HA', {
        width: 166,
        customRender: ({ record }) => boolIcon(record.homeAssistantSupported),
    }),
    createColumn('homeAssistantEntities', 'entities', {
        width: 220,
        customRender: ({ record }) => listDisplay(record.homeAssistantEntities),
    }),
];

function withNotes(supported: string[], notes: string[]) {
    if (!supported.length && !notes.length) return '无';
    return h(MatterThirdPartAppCluster, {
        supported,
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
    if (!supported.length && !unsupported.length) return '无';
    return h(Cluster, {
        supported,
        unsupported,
    });
}

const filterColumnsByGroup = (cols: ColumnsType<FlatRow>, visibleGroups: GroupKey[]): ColumnsType<FlatRow> => {
    const result: ColumnsType<FlatRow> = [];
    cols.forEach((col) => {
        const groupKey = (col as ColumnWithGroup).groupKey;
        if (groupKey && !visibleGroups.includes(groupKey)) return;
        if ('children' in col && col.children) {
            const children = filterColumnsByGroup(col.children, visibleGroups);
            if (children.length) result.push({ ...col, children });
            return;
        }
        result.push(col);
    });
    return result;
};

const formatFilterLabel = (key: keyof EnumFilters, value: string) => {
    if (key === 'ewelinkSupported' || key === 'matterSupported' || key === 'homeAssistantSupported') {
        return value === 'true' ? '是' : '否';
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

    return h('div', { class: 'ant-dropdown ant-table-filter-dropdown custom-filter-dropdown' }, [
        h('div', { class: 'ant-table-filter-dropdown-search' }, [
            h(Input, {
                size: 'small',
                allowClear: true,
                placeholder: '请输入关键字搜索（缺）',
                value: search,
                'onUpdate:value': (val: string) => {
                    enumFilterSearch.value = { ...enumFilterSearch.value, [enumKey]: val };
                    resetEnumFilterLimit(enumKey);
                },
                style: {
                    height: '32px',
                },
            }, {
                prefix: () =>
                    h('img', {
                        src: searchIcon,
                        alt: 'search',
                        style: {
                            width: '14px',
                            height: '14px',
                        },
                    }),
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
                        h('span', { class: 'filter-menu-text' }, 'All'),
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
                    () => `See More（缺） (${Math.min(limit, total)}/${total})`
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
                () => 'Reset（缺）'
            ),
            h(
                Button,
                {
                    type: 'primary',
                    size: 'small',
                    onClick: () => props.confirm?.(),
                },
                () => 'Confirm（缺）'
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

export const useColumns = () => {
    const baseColumns: ColumnsType<FlatRow> = [
        {
            title: 'Device information',
            key: 'group-device',
            children: deviceInfoColumns,
        },
        {
            title: 'eWeLink(缺)',
            key: 'group-ewelink',
            groupKey: 'ewelink',
            children: ewelinkColumns as ColumnsType<FlatRow>,
        } as ColumnWithGroup,
        {
            title: 'Matter',
            key: 'group-matter',
            groupKey: 'matter',
            children: matterColumns as ColumnsType<FlatRow>,
        } as ColumnWithGroup,
        {
            title: 'Home Assistant',
            key: 'group-homeassistant',
            groupKey: 'homeAssistant',
            children: homeAssistantColumns as ColumnsType<FlatRow>,
        } as ColumnWithGroup,
    ];

    const tableColumns = computed(() => {
        return enhanceColumns(filterColumnsByGroup(baseColumns, groupVisibility.value));
    });

    return {
        tableColumns,
        enums,
        enumOptions,
        groupVisibility,
        createDefaultEnums,
    };
};
