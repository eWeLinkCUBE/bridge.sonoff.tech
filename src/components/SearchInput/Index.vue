<script setup lang="ts">
import { useAttrs, useSlots } from 'vue';
import { Input, Button, InputGroup } from 'ant-design-vue';

const attrs = useAttrs();
const slots = useSlots();

defineEmits<{
    (e: 'search', v?: string): void;
}>();

const value = defineModel<string>('value');
</script>

<template>
    <div class="search-input">
        <InputGroup compact>
            <Input v-model:value="value" v-bind="attrs" allowClear @pressEnter="$emit('search', value)" class="input">
                <template v-if="slots.default" #default>
                    <slot />
                </template>
                <template v-if="slots.prefix" #prefix>
                    <slot name="prefix" />
                </template>
                <template v-if="slots.suffix" #suffix>
                    <slot name="suffix" />
                </template>
            </Input>
            <Button type="primary" @click="$emit('search', value)">
                <img class="search-icon" src="@/assets/img/search.png" alt="search" />
            </Button>
        </InputGroup>
    </div>
</template>

<style scoped lang="scss">
.search-input {
    display: flex;
    align-items: center;
    border-radius: 8px;

    .input {
        flex: 0 0 363px;
        min-width: 0;
        border-radius: 8px 0 0 8px;
        font-size: 14px;
        height: 40px;
        border: 1px solid transparent;
        box-sizing: border-box;
        width: 363px;
    }

    :deep(.ant-input-group) {
        display: flex;
        align-items: center;
    }

    :deep(.ant-input-group > .ant-btn) {
        flex: 0 0 auto;
        height: 40px;
        border-radius: 0 8px 8px 0;
        padding: 0 8px;
    }

    :deep(.ant-input-group-compact > *:not(:last-child)) {
        margin-inline-end: 0;
    }

    :deep(.ant-input-group-compact > .ant-btn) {
        border-inline-start-width: 0;
    }

    :deep(.ant-input-affix-wrapper) {
        box-shadow: none;
    }

    :deep(.ant-input-affix-wrapper:focus),
    :deep(.ant-input-affix-wrapper-focused) {
        box-shadow: none;
        border-color: transparent;
        outline: none;
    }

    :deep(.ant-input-affix-wrapper:hover) {
        border-color: transparent;
    }

    .search-icon {
        width: 24px;
        height: 24px;
    }
}
</style>
