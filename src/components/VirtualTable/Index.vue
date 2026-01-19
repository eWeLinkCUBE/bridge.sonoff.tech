<template>
    <div class="virtual-table-wrapper" ref="rootRef">
        <Table
            v-bind="{
                scroll: { y: '100%' },
                columns: processedColumns,
                dataSource: dataSource,
                bordered: false,
                tableLayout: 'fixed',
                ...$attrs,
            }"
            @change="onTableChange"
            class="virtual-table"
            :class="{
                empty: dataSource?.length,
                loading: !!loading,
            }"
        >
            <template v-for="(_, name) in slots" #[name]="slotProps">
                <slot
                    :name="name"
                    v-bind="{
                        ...slotProps,
                        text: !slotProps.text ? '--' : slotProps.text,
                    }"
                />
            </template>
        </Table>
    </div>
    <div v-show="loading" class="loading placeholder">
        <img src="@/assets/img/searching.png" alt="" />
        Searching…
    </div>
    <div v-show="!dataSource.length && !loading" class="empty placeholder">
        <img src="@/assets/img/no-devices.png" alt="" />
        No Results Found
    </div>
</template>

<script setup lang="ts">
import { Table } from 'ant-design-vue';
import { useSlots, computed, ref, onMounted, nextTick, onBeforeUnmount, useAttrs, watch } from 'vue';
import type { TableColumnType, TablePaginationConfig } from 'ant-design-vue';
import { throttle } from 'lodash-es';

const TABLE_HEADER_HEIGHT = '143px';

const props = defineProps<{
    columns: TableColumnType[];
    dataSource: any[];
    loading?: boolean;
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
    position: relative;
    --scrollbar-width: 0px;
    height: 100%;
    width: 100%;
    overflow: hidden;
    background: transparent;
}

.placeholder {
    position: absolute;
    background-color: #fff;
    width: 100%;
    height: calc(100% - v-bind(TABLE_HEADER_HEIGHT));
    border-radius: 16px;
    border-top-left-radius: 0;
    border-top-right-radius: 0;
    left: 0;
    display: flex;
    bottom: 0;
    flex-direction: column;
    align-items: center;
    justify-content: center;
    color: #969696;
    font-size: 14px;
    z-index: 100;

    img {
        width: 160px;
    }

    &.loading {
        img {
            width: 214px;
            height: 120px;
        }
    }
}

.virtual-table {
    height: 100%;
    width: 100%;
    background: transparent;

    :deep(.ant-spin-nested-loading),
    :deep(.ant-spin-container) {
        height: 100%;
        display: flex;
        flex-direction: column;
        background: transparent;
    }

    :deep(.ant-table) {
        flex-grow: 1;
        min-height: 0;
        overflow: hidden;
        background: #fff;
        display: flex;
        flex-direction: column;
        animation: fade-up 0.5s ease;
        border-radius: 16px;
    }

    :deep(.ant-table-container) {
        height: 100%;
    }

    :deep(.ant-table-body) {
        height: calc(100% - v-bind(TABLE_HEADER_HEIGHT));
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
        font-size: 14px;
        height: 40px;
        padding: 12px !important;
    }

    :deep(.ant-table-tbody > tr > td) {
        font-size: 14px;
        color: #333333;
        font-weight: 500;
        height: 40px;
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

    :deep(.ant-checkbox-wrapper-disabled) {
        cursor: pointer;
    }

    :deep(table) {
        height: v-bind(tableHeight);
    }

    :deep(.ant-pagination) {
        justify-content: center;
        margin-top: 24px;
        margin-bottom: 0;
    }

    :deep(.ant-table-tbody .ant-table-cell) {
        white-space: normal; /* 允许换行 */
        word-break: break-all; /* 长英文 / 长路径也能断行 */
        overflow-wrap: break-word; /* 保险一点 */
    }
}
</style>
