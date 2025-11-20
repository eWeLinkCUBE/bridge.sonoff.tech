<template>
    <div class="virtual-table-wrapper" ref="rootRef">
        <Table
            v-bind="{
                scroll: { y: '100%' },
                columns: processedColumns,
                dataSource: dataSource,
                bordered: false,
                pagination: false,
                ...$attrs,
            }"
            @change="onTableChange"
            class="virtual-table"
        >
            <template v-for="(_, name) in slots" #[name]="slotProps">
                <slot
                    :name="name"
                    v-bind="{
                        ...slotProps,
                        text: !slotProps.text ? '无' : slotProps.text,
                    }"
                />
            </template>
            <template #emptyText>
                <div class="no-devices">暂无设备</div>
            </template>
        </Table>
    </div>
</template>

<script setup lang="ts">
import { Table } from 'ant-design-vue';
import { useSlots, computed, ref, onMounted, nextTick, onBeforeUnmount, useAttrs, watch } from 'vue';
import type { TableColumnType, TablePaginationConfig } from 'ant-design-vue';
import { throttle } from 'lodash-es';

const props = defineProps<{
    columns: TableColumnType[];
    dataSource: any[];
}>();

const emit = defineEmits<{
    (e: 'change', p: TablePaginationConfig, f: Record<string, any>, s: any, extra: { currentDataSource: any[] }): void;
}>();

const attrs = useAttrs();
const slots = useSlots();

const isEmptyShown = ref(false);

const processedColumns = computed(() => {
    return props.columns.map((col) => {
        const hasSlot = col.dataIndex && slots[col.dataIndex.toString()];
        if (hasSlot) {
            return col;
        }
        return {
            ...col,
            customRender: ({ text }: { text: string }) => (!text ? '--' : text),
        };
    });
});

const rootRef = ref<HTMLElement | null>(null);

let ro: ResizeObserver | null = null;
let rafId: number | null = null;

const onTableChange = (p: TablePaginationConfig, f: Record<string, any>, s: any, extra: { currentDataSource: any[] }) => {
    isEmptyShown.value = (extra?.currentDataSource?.length ?? 0) === 0;

    const propHandler = (attrs as any).onChange;
    if (typeof propHandler === 'function') {
        propHandler(p, f, s, extra);
    }

    emit('change', p, f, s, extra);
};

watch(
    () => props.dataSource,
    (val: any) => {
        isEmptyShown.value = !(val && val.length);
    },
    { immediate: true }
);

const tableHeight = computed(() => (isEmptyShown.value ? '100%' : 'auto'));

function updateScrollbarVar() {
    const root = rootRef.value;
    if (!root) return;

    const body = root.querySelector('.ant-table-body') as HTMLElement | null;
    if (!body) return;

    const scrollbarWidth = body.offsetWidth - body.clientWidth;
    root.style.setProperty('--scrollbar-width', `${scrollbarWidth}px`);
}

function scheduleUpdate() {
    if (rafId != null) cancelAnimationFrame(rafId);
    rafId = requestAnimationFrame(() => {
        updateScrollbarVar();
        rafId = null;
    });
}

onMounted(async () => {
    await nextTick();
    scheduleUpdate();

    // 监听窗口缩放
    window.addEventListener('resize', throttle(scheduleUpdate, 300));

    const body = rootRef.value?.querySelector('.ant-table-body') as HTMLElement | null;

    if (body) {
        ro = new ResizeObserver(scheduleUpdate);
        ro.observe(body);
    }
});

onBeforeUnmount(() => {
    window.removeEventListener('resize', scheduleUpdate);
    if (ro) ro.disconnect();
    if (rafId != null) cancelAnimationFrame(rafId);
});
</script>

<style scoped lang="scss">
.virtual-table-wrapper {
    --scrollbar-width: 0px;
    height: 100%;
    width: 100%;
    overflow: hidden;
    border: 1px solid rgba(217, 217, 217, 0.5);
    border-radius: 16px;
}
.virtual-table {
    height: 100%;
    width: 100%;

    .no-devices {
        width: 100%;
        height: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        flex-direction: column;
        &-icon {
            width: 220px;
        }
    }

    :deep(.ant-spin-nested-loading),
    :deep(.ant-spin-container) {
        height: 100%;
    }

    :deep(.ant-table) {
        height: 100%;
        overflow: hidden;
        background: #fff;
    }

    :deep(.ant-table-container) {
        height: 100%;
    }

    :deep(.ant-table-body) {
        height: calc(100% - 120px);
        overflow-y: auto !important;
        @include scroll-bar();

        // 16 - 5 = 11
        &::-webkit-scrollbar-track:horizontal {
            margin: 0 11px 0 16px;
        }
        &::-webkit-scrollbar-track:vertical {
            margin: 0 0 11px;
        }
        /* 滚动条滑块 */
        &::-webkit-scrollbar-thumb {
            background-clip: content-box;
        }
    }

    :deep(.ant-table-thead .ant-table-cell-fix-right-first) {
        right: var(--scrollbar-width) !important;
    }

    :deep(.ant-table-thead > tr > th) {
        background: #f9fbff;
        font-weight: 500;
        color: #333333;
        font-size: 16px;
        height: 60px;
        padding: 12px !important;
    }

    :deep(.ant-table-tbody > tr > td) {
        font-size: 14px;
        color: #333333;
        font-weight: 500;
        height: 60px;
        padding: 12px !important;
    }

    :deep(.ant-table-tbody > .ant-table-measure-row > td) {
        padding: 0 !important;
    }

    :deep(.ant-table-placeholder) {
        background: #fff;
        border: none !important;
        box-shadow: none;
    }

    :deep(.ant-empty-description) {
        margin-top: 8px;
    }

    :deep(.ant-table-cell::before) {
        display: none !important;
    }

    :deep(.ant-table-filter-column) {
        // justify-content: flex-start;

        // .ant-table-column-title {
        //     flex: none;
        // }
    }

    :deep(.ant-checkbox-wrapper-disabled) {
        cursor: pointer;
    }

    :deep(table) {
        height: v-bind(tableHeight);
    }
}

@media screen and (max-width: 768px) {
    .virtual-table {
        .no-devices {
            &-icon {
                width: 110px;
            }
        }
    }
}
</style>
