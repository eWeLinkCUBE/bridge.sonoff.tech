<script setup lang="ts">
import { useAttrs } from 'vue';
import { Input } from 'ant-design-vue';

const attrs = useAttrs();
</script>

<template>
    <div class="search-input">
        <Input v-bind="attrs" style="width: 100%" allowClear class="input">
            <template #prefix>
                <img class="img" src="@/assets/img/search.png" alt="search" width="24" height="24" />
            </template>
        </Input>
    </div>
</template>

<style scoped lang="scss">
.search-input {
    display: flex;
    align-items: center;

    .input {
        border-radius: 8px;
        border: 1px solid #d9d9d9;
        font-size: 14px;
        height: 40px;
    }

    .img {
        width: 20px;
        height: 20px;
    }
}
</style>
