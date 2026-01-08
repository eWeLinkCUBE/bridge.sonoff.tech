<script setup lang="ts">
import { Input, Button, Checkbox } from 'ant-design-vue';
import searchIcon from '@/assets/img/search.png';

export type FilterOption = {
    value: string;
    count: number;
};

const props = defineProps<{
    search: string;
    options: FilterOption[];
    selectedKeys: string[];
    isAllChecked: boolean;
    isAllIndeterminate: boolean;
    hasMore: boolean;
    total: number;
    limit: number;
}>();

const emit = defineEmits<{
    (e: 'update:search', value: string): void;
    (e: 'toggle-value', value: string, checked: boolean): void;
    (e: 'toggle-all', checked: boolean): void;
    (e: 'clear'): void;
    (e: 'confirm'): void;
    (e: 'load-more'): void;
}>();

const isChecked = (value: string) => props.selectedKeys.includes(value);
</script>

<template>
    <div class="ant-dropdown ant-table-filter-dropdown custom-filter-dropdown">
        <div class="ant-table-filter-dropdown-search">
            <Input
                size="small"
                allowClear
                placeholder="Enter Keyword to Search"
                :value="search"
                style="height: 32px"
                @update:value="(val) => emit('update:search', val)"
            >
                <template #prefix>
                    <img :src="searchIcon" alt="search" style="width: 14px; height: 14px" />
                </template>
            </Input>
        </div>
        <div class="ant-dropdown-menu ant-dropdown-menu-root ant-table-filter-dropdown-menu filter-menu">
            <label class="ant-dropdown-menu-item filter-menu-item filter-menu-item__all">
                <Checkbox
                    :checked="isAllChecked"
                    :indeterminate="isAllIndeterminate"
                    @change="(e) => emit('toggle-all', e.target.checked)"
                />
                <span class="filter-menu-text">All</span>
            </label>

            <template v-if="options.length">
                <label
                    v-for="opt in options"
                    :key="opt.value"
                    class="ant-dropdown-menu-item filter-menu-item"
                >
                    <Checkbox
                        :checked="isChecked(opt.value)"
                        @change="(e) => emit('toggle-value', opt.value, e.target.checked)"
                    />
                    <span class="filter-menu-text">
                        <slot name="label" :value="opt.value">{{ opt.value }}</slot>
                        ({{ opt.count }})
                    </span>
                </label>
            </template>
            <div v-else class="filter-empty">No Results Found</div>
        </div>
        <div v-if="hasMore" class="filter-more">
            <Button type="link" size="small" @click="emit('load-more')">
                See More ({{ Math.min(limit, total) }}/{{ total }})
            </Button>
        </div>
        <div class="ant-table-filter-dropdown-btns">
            <Button size="small" type="link" @click="emit('clear')">Reset</Button>
            <Button type="primary" size="small" @click="emit('confirm')">Confirm</Button>
        </div>
    </div>
</template>
