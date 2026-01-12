<script setup lang="ts">
import { useAttrs } from 'vue';
import { Input, Button, InputGroup } from 'ant-design-vue';

const attrs = useAttrs();
defineEmits<{
    (e: 'search', v?: string): void;
}>();

const value = defineModel<string>('value');
</script>

<template>
    <div class="search-input">
        <InputGroup compact>
            <Input v-model:value="value" v-bind="attrs" allowClear class="input" />
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
        flex: 1 1 auto;
        min-width: 0;
        border-radius: 8px 0 0 8px;
        font-size: 14px;
        height: 40px;
        border: none;
        width: 363px;
    }

    :deep(.ant-input-group) {
        display: flex;
        align-items: center;
    }

    :deep(.ant-input-group > .ant-btn) {
        height: 40px;
        border-radius: 0 8px 8px 0;
        padding: 0 8px;
    }

    .search-icon {
        width: 24px;
        height: 24px;
    }
}
</style>
