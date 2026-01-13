<template>
    <div class="header-filter">
        <div class="header-filter-left">
            <div class="header-filter-title">
                Bridge 设备兼容与功能对照表（缺）
                <div class="header-filter-title-tip">
                    <img class="title-tip-icon" :src="QA" @click="modalVisible = true" />
                </div>
            </div>
            <div class="header-filter-search">
                <SearchInput placeholder="Search by device model, category" v-model:value="searchText" @search="runQuery(true)"></SearchInput>
            </div>
            <div class="header-filter-control" :class="{ active: filterVisible }" @click="setFilterVisible(!filterVisible)">
                <img class="control-filter-icon" :src="filterVisible ? filterActivePng : filter" />
                Filter
            </div>

            <Popover v-model:open="showColumnVisible" trigger="click" placement="bottom" class="column-visible">
                <div class="header-filter-column-visible" :class="{ active: showColumnVisible }">
                    <img class="column-visible-icon" :src="showColumnVisible ? eyeActive : eye" />
                    Show/Hide
                </div>
                <template #content>
                    <ColumnsShowHide />
                </template>
            </Popover>
            <div class="header-filter-export" @click="exportToExcel">
                <img class="export-icon" :src="exportPng" />
                Export
            </div>
        </div>
        <div class="header-filter-right">
            <div class="header-filter-update-time">
                <div class="header-filter-update-time-content">
                    Last updated:
                    <div class="content">
                        {{ updateTimeLabel }}
                    </div>
                </div>
            </div>
        </div>

        <FeatureComparisonModal :visible="modalVisible" @cancel="modalVisible = false" />
    </div>
</template>
<script lang="ts" setup>
import SearchInput from '@/components/SearchInput/Index.vue';
import QA from '@/assets/img/QA.png';
import filter from '@/assets/img/filter.png';
import filterActivePng from '@/assets/img/filter-active.png';
import eye from '@/assets/img/eye.png';
import eyeActive from '@/assets/img/eye-active.png';
import exportPng from '@/assets/img/export.png';
import { useColumns } from '@/hooks/useColumns';
import FeatureComparisonModal from './FeatureComparisonModal.vue';
import { format } from 'date-fns';
import { computed, ref } from 'vue';
import { Popover } from 'ant-design-vue';
import ColumnsShowHide from './ColumnsShowHide.vue';

const { filterVisible, updateTime, searchText, setFilterVisible, runQuery, exportToExcel } = useColumns();
const modalVisible = ref(false);
const showColumnVisible = ref(false);
const updateTimeLabel = computed(() => {
    return format(updateTime.value, 'yyyy-MM-dd');
});
</script>
<style lang="scss" scoped>
:deep(.ant-popover-inner) {
    max-width: 260px !important;
}

.header-filter {
    margin-bottom: 20px;
    padding: 14px 0;
    @include flex(space-between);

    :deep(.ant-select),
    :deep(.ant-input) {
        transition: box-shadow 0.3s ease;
    }

    :deep(.ant-select-focused),
    :deep(.ant-input-focused) {
        box-shadow: 0 0 0 3px rgba(59, 130, 246, 0.2);
    }
}

.header-filter-left {
    display: flex;
    align-items: center;
    flex-wrap: wrap;
    gap: 25px;
}

.header-filter-right {
    flex-shrink: 0;
    margin-left: auto;
    @include flex();
}

.header-filter-title {
    @include flex(center);
    gap: 8px;
    font-size: 28px;
    font-weight: 600;
    line-height: 45px;
    flex-shrink: 0;

    .title-tip-icon {
        cursor: pointer;
        width: 24px;
    }
}

.header-filter-control {
    cursor: pointer;
    user-select: none;
    font-weight: 500;
    font-size: 16px;
    color: #999999;

    .control-filter-icon {
        width: 24px;
    }

    &.active {
        color: #3866e7;
    }
}

.header-filter-column-visible {
    cursor: pointer;
    user-select: none;
    font-weight: 500;
    font-size: 16px;
    color: #333333;

    .column-visible-icon {
        width: 24px;
    }

    &.active {
        color: #3866e7;
    }
}

.header-filter-export {
    cursor: pointer;
    user-select: none;
    font-weight: 500;
    font-size: 16px;
    color: #333333;

    .export-icon {
        width: 24px;
    }
}

.header-filter-update-time {
    @include flex();
    padding-top: 8px;
    &-content {
        font-size: 12px;
        color: #999999;
        padding-left: 20px;
        @include flex(_, center, column);

        .content {
            color: #333333;
        }
    }

    &::before {
        content: '';
        display: inline-block;
        width: 1px;
        height: 32px;
        background-color: #d2def0;
    }
}
</style>
